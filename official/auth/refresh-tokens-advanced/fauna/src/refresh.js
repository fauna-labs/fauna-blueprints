import faunadb from 'faunadb'
import { RotateAccessAndRefreshToken, VerifyRefreshToken } from './tokens'

const q = faunadb.query
const { CurrentIdentity, Get } = q

export const GRACE_PERIOD_SECONDS = 20// 20 seconds

export function RefreshToken (gracePeriodSeconds, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds) {
  return VerifyRefreshToken(
    {
      tokens: RotateAccessAndRefreshToken(gracePeriodSeconds, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds),
      account: Get(CurrentIdentity())
    }, 'refresh')
}
