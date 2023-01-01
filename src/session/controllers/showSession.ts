import { Controller } from '../../types'
import sessionManager from '../session-manager'

const showSession: Controller = async (req, res) => {
  const { grantToken } = req
  const { sessionId } = req.params

  const session = sessionManager.getSession(sessionId)

  if (!session) {
    res.redirect('/sessions/create')
    return
  }

  if (
    session.ownerToken !== grantToken &&
    !session.joinedTokens.includes(grantToken)
  ) {
    res.redirect('/sessions/create')
    return
  }

  const isOwner = session.ownerToken === grantToken

  res.send(
    `
    <html >
    <body>
      <h1>Your session</h1>
      <p>Your friends can join your session by going to this link:</p>
      <a href="/sessions/${session.id}/join">${process.env.APP_URL}/sessions/${
      session.id
    }/join</a>
      ${
        isOwner
          ? `
      <h4>When you are ready to create a playlist go here:</h4>
      <a href="/sessions/${session.id}/create-playlist">Create playlist</a>
      <p>There are currently <strong>${session.joinedTokens.length}</strong> people in this session</p>
      `
          : ''
      }
      <h4>Create new session</h4>
      <a href="/sessions/create">Create new session</a>
    </html>
    `
  )
}

export default showSession
