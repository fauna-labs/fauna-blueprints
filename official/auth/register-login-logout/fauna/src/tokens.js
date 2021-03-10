import faunadb from 'faunadb'

const q = faunadb.query
const {
  Create,
  Tokens,
  Now,
  TimeAdd
} = q

export const ACCESS_TOKEN_LIFETIME_SECONDS = 3600 // 1 hour

export function CreateAccessToken (accountRef, ttlSeconds) {
  return Create(Tokens(), {
    instance: accountRef,
    ttl: TimeAdd(Now(), ttlSeconds || ACCESS_TOKEN_LIFETIME_SECONDS, 'seconds')
  })
}
