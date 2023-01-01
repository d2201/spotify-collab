import { v4 as uuid } from 'uuid'

type Grant = {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  token_type: string
}

export class GrantManager {
  private readonly _grants: Map<string, Grant> = new Map()

  storeGrant(grant: Grant) {
    const id = uuid()

    this._grants.set(id, grant)

    return id
  }

  getGrant(id: string) {
    return this._grants.get(id)
  }
}

const grantManager = new GrantManager()

export default grantManager
