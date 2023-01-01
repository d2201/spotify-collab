import { Request, Response, NextFunction } from 'express'
import { GRANT_TOKEN_COOKIE } from '../consts'
import grantManager from '../grants'
import { createDebugger } from '../utils'

declare module 'express' {
  interface Request {
    grantToken: string
  }
}

const debug = createDebugger('middleware')

export const grantTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token =
    req.headers.authorization?.replace('Bearer ', '').trim() ||
    req.cookies[GRANT_TOKEN_COOKIE]

  const redirectUrl = `/sign-in-with-spotify?redirect=${encodeURIComponent(
    req.originalUrl
  )}`

  if (!token) {
    res.redirect(redirectUrl)
    return
  }

  const grant = grantManager.getGrant(token)

  if (!grant) {
    debug('Clearing cookie')
    res.clearCookie(GRANT_TOKEN_COOKIE)
    res.redirect(redirectUrl)
    return
  }

  req.grantToken = token
  next()
}
