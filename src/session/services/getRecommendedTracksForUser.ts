import SpotifyWebApi from 'spotify-web-api-node'
import { shuffle } from 'lodash'
import { createDebugger } from '../../utils'

type Track = SpotifyApi.TrackObjectFull

const debug = createDebugger('getRecommendedTracksForUser')

const getRecommendedTracksForUser = async (
  api: SpotifyWebApi,
  trackLimit: number
) => {
  const [
    shortTermTracks,
    mediumTermTracks,
    longTermTracks,
    moreShortTermTracks,
  ] = await Promise.all([
    api.getMyTopTracks({ time_range: 'short_term', limit: 50 }),
    api.getMyTopTracks({ time_range: 'medium_term', limit: 50 }),
    api.getMyTopTracks({ time_range: 'long_term', limit: 50 }),
    api.getMyTopTracks({ time_range: 'short_term', limit: 50, offset: 50 }),
  ]).then((results) => results.map((result) => result.body.items))

  // We want to preserve ratio of 50% short term, 30% medium term, 20% long term
  const tracks: Map<string, SpotifyApi.TrackObjectFull> = new Map()

  mergeTracks(shortTermTracks, tracks, Math.floor(trackLimit * 0.5))
  mergeTracks(mediumTermTracks, tracks, Math.floor(trackLimit * 0.3))
  mergeTracks(longTermTracks, tracks, Math.floor(trackLimit * 0.2))

  if (tracks.size < trackLimit) {
    debug('Not enough tracks, adding more short term tracks')
    mergeTracks(moreShortTermTracks, tracks, trackLimit - tracks.size)
  }

  if (tracks.size < trackLimit) {
    debug('Still not enough tracks, giving up')
  }

  return shuffle(Array.from(tracks.values()))
}

const mergeTracks = (
  tracks: Track[],
  trackMap: Map<string, Track>,
  limit: number
) => {
  for (let i = 0; i < limit; i++) {
    const uri = tracks[i]?.uri

    if (!uri) {
      break
    }

    if (trackMap.has(uri)) {
      limit++ // we already have this track, so we need to add one more
      continue
    }

    trackMap.set(uri, tracks[i])
  }
}

export default getRecommendedTracksForUser
