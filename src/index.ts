import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import handler from 'express-async-handler'
import grantManager from './grants'
import cookieParser from 'cookie-parser'
import { GRANT_TOKEN_COOKIE } from './consts'
import {
  createDebugger,
  createSpotifyApi,
  ensureSafeRedirectUrl,
} from './utils'
import { sessionRouter } from './session/router'
import queue from './queue'
import qs from 'qs'

const PORT = +(process.env.PORT ?? 3000)

const app = express()
const api = createSpotifyApi()

app.use(express.json())
app.use(cookieParser())

app.use('/sessions', sessionRouter)

// redirect to spotify to sign in
app.get('/sign-in-with-spotify', (req, res) => {
  const redirect = req.query.redirect
    ? decodeURIComponent(req.query.redirect as string)
    : '/'

  const redirectUrl = ensureSafeRedirectUrl(redirect)

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-collaborative'
  ]

  res.redirect(
    api.createAuthorizeURL(
      scopes,
      encodeURIComponent(
        qs.stringify({ redirect: redirectUrl.toString() }, { encode: false })
      )
    )
  )
})

const debug = createDebugger('app')

app.get('/access-denied', (req, res) => {
  res.send(`
    <html>
    <body>
    <h1 style="color: red;">You need to be added to the beta to use this app</h1>
    <h3>Send an email to <a href="mailto:${process.env.DEVELOPER_EMAIL}" target="_blank">${process.env.DEVELOPER_EMAIL}</a></h3>
    <p>Go back to <a href="/">home</a></p>
    </body>
    </html>
  `)
})

app.get(
  '/spotify-callback',
  handler(async (req, res) => {
    const code = req.query.code

    if (!code) {
      res.sendStatus(403)
      return
    }

    const state = decodeURIComponent((req.query.state as string) || '')

    const { redirect } = qs.parse(state)

    const redirectUrl = ensureSafeRedirectUrl((redirect as string) || '/')

    const grant = await api.authorizationCodeGrant(code as string)

    const userApi = createSpotifyApi()

    userApi.setCredentials({
      accessToken: grant.body.access_token,
      refreshToken: grant.body.refresh_token
    })

    try {
      await userApi.getMe()
    } catch (e) {
      debug('User has no access')
      res.redirect('/access-denied')
      return
    }

    const id = grantManager.storeGrant(grant.body)

    debug('Access token', grant.body.access_token)
    debug('Grant token', id)

    // one year in milliseconds
    const ONE_YEAR = 1000 * 60 * 60 * 24 * 365

    res.cookie(GRANT_TOKEN_COOKIE, id, {
      httpOnly: true,
      expires: new Date(Date.now() + ONE_YEAR),
    })

    debug('Redirecting to', redirectUrl.toString())

    res.redirect(redirectUrl.toString())
  })
)

app.get('/', (req, res) => {
  if (req.cookies[GRANT_TOKEN_COOKIE]) {
    res.send(`
      <html>
      <body>
        <h1>You are signed in</h1>
        <p>Create a session <a href="/sessions/create">here</a></p>
      </body>
      </html>
    `)
    return
  }
  res.send(
    `<html>
      <body>
        <h1>You are not signed in</h1>
        <p>Sign in <a href="/sign-in-with-spotify">here</a></p>
      </body>
    </html>`
  )
})

app.listen(PORT, () => {
  console.log('Listening on %o', PORT)
  queue.setupProcessor(5_000)
})
