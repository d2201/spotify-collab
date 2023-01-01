import { Controller } from '../../types'
import sessionManager from '../session-manager'

const createSession: Controller = async (req, res) => {
  const { grantToken } = req

  const session = sessionManager.createEmptySession(grantToken)

  res.redirect(`/sessions/${session}`)
}

export default createSession
