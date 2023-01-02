import { v4 as uuid } from 'uuid'

type Session = {
  id: string
  ownerToken: string
  joinedTokens: string[]
  playlistId?: string
}

export class SessionManager {
  private readonly _sessions: Map<string, Session> = new Map()

  createEmptySession(ownerToken: string) {
    const id = uuid()

    this._sessions.set(id, {
      ownerToken,
      joinedTokens: [],
      id,
    })

    return id
  }

  getSession(sessionId: string) {
    return this._sessions.get(sessionId)
  }

  joinSession(sessionId: string, grantToken: string) {
    const session = this._sessions.get(sessionId)

    if (!session) {
      throw new Error('Session does not exist')
    }

    if (session.ownerToken === grantToken) {
      throw new Error('You are already the owner of this session')
    }

    if (session.joinedTokens.includes(grantToken)) {
      throw new Error('You are already a member of this session')
    }

    session.joinedTokens.push(grantToken)
  }
}

const sessionManager = new SessionManager()

export default sessionManager
