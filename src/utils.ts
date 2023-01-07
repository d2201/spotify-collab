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

export const ONE_MINUTE = 60 * 1000

export class ExpiringMap<Key, Val> {
  private readonly _map = new Map<Key, Val>()
  private readonly _timeoutMap = new Map<Key, NodeJS.Timeout>()

  constructor(private readonly _ttl: number) {}

  set(key: Key, val: Val) {
    this.refreshTimeout(key)
    return this._map.set(key, val)
  }

  get(key: Key) {
    this.refreshTimeout(key)
    return this._map.get(key)
  }

  private refreshTimeout(key: Key) {
    if (this._timeoutMap.has(key)) {
      clearTimeout(this._timeoutMap.get(key))
    }

    const timeout = setTimeout(() => this._map.delete(key), this._ttl).unref()

    this._timeoutMap.set(key, timeout)
  }
}