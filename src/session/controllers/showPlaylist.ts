import { Controller } from '../../types'
import sessionManager from '../session-manager'

const showPlaylist: Controller = async (req, res) => {
  const { sessionId } = req.params

  const session = sessionManager.getSession(sessionId)

  if (!session) {
    res.status(404).json({ error: 'Session does not exist' })
    return
  }

  if (!session.playlistId) {
    res.send(
      `
      <html>
      <body>
      <h1>
      Session does not have a playlist yet. Please wait for the owner to create one.
      </h1>
      </body>
      </html>
      `
    )
    return
  }

  res.redirect(`https://open.spotify.com/playlist/${session.playlistId}`)
}

export default showPlaylist
