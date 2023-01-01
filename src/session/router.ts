import { Router } from 'express'
import showSession from './controllers/showSession'
import { grantTokenMiddleware } from './middleware'
import handler from 'express-async-handler'
import createSession from './controllers/createSession'
import joinSession from './controllers/joinSession'
import upsertPlaylistForSession from './controllers/upsertPlaylistForSession'
import showPlaylist from './controllers/showPlaylist'

export const sessionRouter = Router()

sessionRouter.use(grantTokenMiddleware)

sessionRouter.get('/create', handler(createSession))

sessionRouter.get('/:sessionId', handler(showSession))

sessionRouter.get('/:sessionId/join', handler(joinSession))

sessionRouter.get(
  '/:sessionId/create-playlist',
  handler(upsertPlaylistForSession)
)

sessionRouter.get('/:sessionId/playlist', handler(showPlaylist))
