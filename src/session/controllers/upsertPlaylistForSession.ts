import SpotifyWebApi from 'spotify-web-api-node'
import grantManager from '../../grants'
import queue from '../../queue'
import { Controller } from '../../types'
import { createSpotifyApi, namesConcatenator } from '../../utils'
import getRecommendedTracksForUser from '../services/getRecommendedTracksForUser'
import sessionManager from '../session-manager'
import _ from 'lodash'

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

  const spotifyApi = createSpotifyApi()

  spotifyApi.setCredentials({
    accessToken: grant.access_token,
    refreshToken: grant.refresh_token,
  })

  const sessionGrants = session.joinedTokens.map((token) =>
    grantManager.getGrant(token)
  )

  const apis = [
    spotifyApi,
    ...sessionGrants.map((grant) => {
      const api = createSpotifyApi()

      api.setCredentials({
        accessToken: grant.access_token,
        refreshToken: grant.refresh_token,
      })

      return api
    }),
  ]

  const userNames = await Promise.all(
    apis.map((api) => api.getMe().then((res) => res.body.display_name))
  )

  if (!session.playlistId) {
    const playlist = await spotifyApi.createPlaylist(
      `Collab: ${namesConcatenator(userNames)}`,
      {
        description: 'Created with Spotify Collab',
        public: false,
        collaborative: true,
      }
    )

    session.playlistId = playlist.body.id
  }

  queue.enqueue(() => fillPlaylist(session.playlistId, apis))

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
  const trackLimitPerUser = Math.ceil(100 / apis.length)
  const ownerApi = apis[0]

  await removeTracksFromPlaylist(playlistId, ownerApi)

  const tracks = await Promise.all(
    apis.map((api) => getRecommendedTracksForUser(api, trackLimitPerUser))
  )

  const zippedTracks = _.zip(...tracks)

  for (let i = 0; i < trackLimitPerUser; i++) {
    const tracksToAdd = zippedTracks[i]

    if (!tracksToAdd) {
      break
    }

    // Unfortunately only owner can add tracks to a collaborative playlist :/
    await ownerApi.addTracksToPlaylist(
      playlistId,
      tracksToAdd.map((t) => t.uri)
    )
  }
}

const removeTracksFromPlaylist = async (
  playlistId: string,
  ownerApi: SpotifyWebApi
) => {
  const tracks = await ownerApi.getPlaylistTracks(playlistId)

  const tracksToRemove = tracks.body.items.map((t) => ({ uri: t.track.uri }))

  await ownerApi.removeTracksFromPlaylist(playlistId, tracksToRemove)
}
