import SpotifyWebApi from 'spotify-web-api-node'
import grantManager from '../../grants'
import queue from '../../queue'
import { Controller, Track } from '../../types'
import { createDebugger, createSpotifyApi, namesConcatenator } from '../../utils'
import getRecommendedTracksForUser from '../services/getRecommendedTracksForUser'
import sessionManager, { Session } from '../session-manager'
import _ from 'lodash'
import { MAX_TRACKS_PER_PLAYLIST } from '../../consts'
import getPlaylists from '../services/getPlaylists'
import { v5 as uuidv5 } from 'uuid'

const debug = createDebugger('playlist-creator')

const upsertPlaylistForSession: Controller = async (req, res) => {
  const { grantToken } = req
  const { sessionId } = req.params

  const session = sessionManager.getSession(sessionId)
  const grant = grantManager.getGrant(grantToken)

  if (!session) {
    res.status(404).json({ error: 'Session does not exist' })
    return
  }

  if (!grant) {
    res.status(404).json({ error: 'Grant does not exist' })
    return
  }

  if (session.ownerToken !== grantToken) {
    res.status(403).json({ error: 'You are not the owner of this session' })
    return
  }

  const ownerApi = createSpotifyApi()

  ownerApi.setCredentials({
    accessToken: grant.access_token,
    refreshToken: grant.refresh_token,
  })

  const sessionGrants = session.joinedTokens.map((token) =>
    grantManager.getGrant(token)
  )

  const apis = [
    ownerApi,
    ...sessionGrants.map((grant) => {
      const api = createSpotifyApi()

      api.setCredentials({
        accessToken: grant.access_token,
        refreshToken: grant.refresh_token,
      })

      return api
    }),
  ]

  const users = await Promise.all(
    apis.map((api) => api.getMe().then((res) => res.body))
  )

  const userNames = users.map((user) => user.display_name)
  const userIds = users.map((user) => user.id)

  const hash = calculateHashFromUserIds(userIds)

  await tryToSetExistingPlaylist(session, ownerApi, userIds[0], hash)

  if (!session.playlistId) {
    const playlist = await ownerApi.createPlaylist(
      `Collab: ${namesConcatenator(userNames)}`,
      {
        description: `Created with Spotify Collab - hash: ${hash}`,
        public: false,
        collaborative: true,
      }
    )

    session.playlistId = playlist.body.id
  }

  queue.enqueue({
    id: session.playlistId,
    handler: () => fillPlaylist(session.playlistId, apis)
  })

  res.send(
    `<html>
    <body>
      <h1>Playlist is being created!</h1>
      <p>Go to <a href="/sessions/${sessionId}/playlist">your playlist</a></p>
    </body>
    </html>`
  )
}

export default upsertPlaylistForSession

const fillPlaylist = async (playlistId: string, apis: SpotifyWebApi[]) => {
  const trackLimitPerUser = Math.ceil(MAX_TRACKS_PER_PLAYLIST / apis.length)
  const [ownerApi, ...otherApis] = apis

  // Owner by default follows the playlist
  await Promise.all(otherApis.map((api) => api.followPlaylist(playlistId)))

  await removeTracksFromPlaylist(playlistId, ownerApi)

  const tracks = await Promise.all(
    apis.map((api) => getRecommendedTracksForUser(api, trackLimitPerUser))
  )

  // TODO: Support batching as spotify only allows 100 tracks per request
  const mixedTracks = mixTracks(tracks)

  // Unfortunately only owner can add tracks to a collaborative playlist
  await ownerApi.addTracksToPlaylist(
    playlistId,
    mixedTracks.map((t) => t.uri)
  )
}

const calculateHashFromUserIds = (userIds: string[]) => {
  return uuidv5(_.sortBy(userIds).join('.'), '1ed92f89-eab6-4fb6-9923-bef01c3eee30').slice(0, 8)
}

const tryToSetExistingPlaylist = async (session: Session, ownerApi: SpotifyWebApi, ownerId: string, hash: string): Promise<void> => {
  if (session.playlistId) {
    return
  }

  const playlists = await getPlaylists(ownerApi)

  const playlist = playlists.find((p) => p.description.includes(hash) && p.owner.id === ownerId)

  if (playlist && !session.playlistId) {
    debug('Found already existing playlist - setting it as session playlist')
    session.playlistId = playlist.id
  }
}

const mixTracks = (tracks: Track[][]): Track[] => {
  const zippedTracks = _.zip(...tracks)

  const mixedTracks: Track[] = []

  for (const tracks of zippedTracks) {
    mixedTracks.push(...tracks)
  }

  return mixedTracks
}

const removeTracksFromPlaylist = async (
  playlistId: string,
  ownerApi: SpotifyWebApi
) => {
  const tracks = await ownerApi.getPlaylistTracks(playlistId)

  const tracksToRemove = tracks.body.items.map((t) => ({ uri: t.track.uri }))

  await ownerApi.removeTracksFromPlaylist(playlistId, tracksToRemove)
}
