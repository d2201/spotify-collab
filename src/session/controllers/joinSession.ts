import { Controller } from '../../types'
import sessionManager from '../session-manager'

const joinSession: Controller = async (req, res) => {
  const { grantToken } = req
  const { sessionId } = req.params

  sessionManager.joinSession(sessionId, grantToken)

  res.send(
    `<html>
      <body>
        <h1>You have joined the session!</h1>
        <a href="/sessions/${sessionId}/playlist">Go to collab playlist</a>
      </body>
    </html>`
  )
}

export default joinSession
