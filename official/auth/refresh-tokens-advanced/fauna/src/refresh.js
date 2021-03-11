import faunadb from 'faunadb'
import { CreateAccessAndRefreshToken, InvalidateAccessAndRefreshToken } from './tokens'
import { LogRefreshTokenReuseAnomaly } from './anomalies'

const q = faunadb.query
const {
  Let,
  Get,
  Var,
  Select,
  TimeDiff,
  Now,
  And,
  Do,
  GTE,
  If,
  CurrentToken,
  CurrentIdentity
} = q

// --- Refresh token strategy ---
// We need to refresh the access token. Common practice is to:
// - Generate the access token
// - Replace the refresh token.
// This makes sure that our refresh tokens are not valid eternally and allows you to
// detect when a refresh token has been leaked.
// Although stored in httpOnly cookies there can always be unknown vulnerabilities!
// --- Potential problems with multiple tabs ---
// However, we could run into problems when two browser tabs try to refresh a token at the same time
// which is probalby the reason why many auth implementations do NOT replace the refresh token.
// --- Circumvent the problem with a 'grace period' ---
// Instead we'll define a timewindow where it is allowed to send a request with an already used refresh token
// The tradeoff is that if an attacker sends the refresh request within that timeframe he has
// access to the app for the duration of the refresh token. It's still much better than
// refresh tokens that stay forever though.

export const GRACE_PERIOD_SECONDS = 20// 20 seconds

export function RefreshToken (gracePeriodSeconds) {
  return If(
    And(IsTokenUsed(), IsGracePeriodExpired(gracePeriodSeconds || GRACE_PERIOD_SECONDS)),
    LogRefreshTokenReuseAnomaly(CurrentToken(), CurrentIdentity()),
    {
      tokens: RotateAccessAndRefreshToken(CurrentToken()),
      account: Get(CurrentIdentity())
    }
  )
}

export function IsTokenUsed () {
  return Select(['data', 'used'], Get(CurrentToken()))
}

function IsGracePeriodExpired (gracePeriodSeconds) {
  return GTE(GetAgeOfRefreshToken(), gracePeriodSeconds * 1000)
}

export function GetAgeOfRefreshToken () {
  return Let(
    {
      timeUsed: Select(['data', 'timeUsed'], Get(CurrentToken())),
      ageInMS: TimeDiff(Var('timeUsed'), Now(), 'milliseconds')
    },
    Var('ageInMS')
  )
}

function RotateAccessAndRefreshToken (refreshTokenRef) {
  return Do(
    InvalidateAccessAndRefreshToken(refreshTokenRef),
    CreateAccessAndRefreshToken(CurrentIdentity())
  )
}
