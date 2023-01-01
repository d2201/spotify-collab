import Api from 'spotify-web-api-node'
import debug from 'debug'

export const createSpotifyApi = () =>
  new Api({
    redirectUri: `${process.env.APP_URL}/spotify-callback`,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  })

export const createDebugger = (name: string) => {
  return debug(`spotify-collab:${name}`)
}

export const namesConcatenator = (fullNames: string[]) => {
  const firstNames = fullNames.map(toFirstName).filter((name) => !!name)

  if (firstNames.length === 0) {
    return ''
  }

  if (firstNames.length === 1) {
    return firstNames[0]
  }

  const lastFirstName = firstNames.pop()

  return `${firstNames.join(', ')} i ${lastFirstName}`
}

const toFirstName = (fullName: string) => fullName.trim().split(' ')[0]

export const ensureSafeRedirectUrl = (url: string) => {
  const redirectUrl = new URL(url, process.env.APP_URL)

  if (redirectUrl.origin !== process.env.APP_URL) {
    return new URL('/', process.env.APP_URL)
  }

  return redirectUrl
}
