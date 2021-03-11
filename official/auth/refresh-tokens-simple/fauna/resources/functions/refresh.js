import faunadb, { CurrentIdentity, Get } from 'faunadb'
import { CreateAccessAndRefreshToken, ACCESS_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_LIFETIME_SECONDS } from '../../src/tokens'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction
} = q

export default CreateFunction({
  name: 'refresh',
  body: Query(Lambda([], {
    tokens: CreateAccessAndRefreshToken(
      CurrentIdentity(),
      ACCESS_TOKEN_LIFETIME_SECONDS,
      REFRESH_TOKEN_LIFETIME_SECONDS),
    account: Get(CurrentIdentity())
  })),
  role: 'server'
})
