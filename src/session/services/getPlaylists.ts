import SpotifyWebApi from "spotify-web-api-node";
import { createDebugger } from "../../utils";

const debug = createDebugger('getPlaylists')

const getPlaylists = async (api: SpotifyWebApi) => {
  const playlists = []

  while (true) {
    const userPlaylists = await api.getUserPlaylists({ limit: 50 })
    
    playlists.push(...userPlaylists.body.items)

    if (userPlaylists.body.items.length < 50) {
      break
    }

    debug('User has more than 50 playlists')
  }

  return playlists
}

export default getPlaylists