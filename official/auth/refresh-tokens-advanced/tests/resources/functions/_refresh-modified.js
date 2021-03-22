import faunadb from 'faunadb'
import { RefreshToken } from '../../../fauna/src/refresh'
export const GRACE_PERIOD_SECONDS = 3
export const ACCESS_TOKEN_LIFETIME_SECONDS = 5
export const REFRESH_TOKEN_LIFETIME_SECONDS = 8
export const REFRESH_TOKEN_RECLAIMTIME_SECONDS = 12

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction
} = q

export default CreateFunction({
  name: 'refresh',
  // The RefreshToken function is parametrized to allow you to write tests.
  // gracePeriodSeconds, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds
  body: Query(Lambda([], RefreshToken(
    GRACE_PERIOD_SECONDS,
    ACCESS_TOKEN_LIFETIME_SECONDS,
    REFRESH_TOKEN_LIFETIME_SECONDS,
    REFRESH_TOKEN_RECLAIMTIME_SECONDS))),
  role: 'server'
})
