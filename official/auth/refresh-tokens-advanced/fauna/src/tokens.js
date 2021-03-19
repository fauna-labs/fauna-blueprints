import faunadb, { If } from 'faunadb'

const q = faunadb.query
const {
  Let,
  Var,
  Create,
  Select,
  Tokens,
  Now,
  TimeAdd,
  Equals,
  Get,
  CurrentToken,
  HasCurrentToken,
  Exists,
  Update,
  Match,
  Index,
  NewId,
  Do,
  Delete,
  And
} = q

export const ACCESS_TOKEN_LIFETIME_SECONDS = 600 // 10 minutes
export const RESET_TOKEN_LIFETIME_SECONDS = 1800 // 30 minutes
export const REFRESH_TOKEN_LIFETIME_SECONDS = 28800 // 8 hours

export function CreateAccessToken (accountRef, refreshTokenRef, ttlSeconds) {
  return Create(Tokens(), {
    instance: accountRef,
    // A  token is a document just like everything else in Fauna.
    // We will store extra metadata on the token to identify the token type.
    data: {
      type: 'access',
      // We store which refresh token that created the access tokens which allows us to easily invalidate
      // all access tokens created by a specific refresh token.
      refresh: refreshTokenRef
    },
    // access tokens live for 10 minutes, which is typically a good livetime for short-lived tokens.
    ttl: TimeAdd(Now(), ttlSeconds || ACCESS_TOKEN_LIFETIME_SECONDS, 'seconds')
  })
}

export function CreateRefreshToken (accountRef, ttlSeconds) {
  return Create(Tokens(), {
    instance: accountRef,
    data: {
      type: 'refresh',
      used: false,
      sessionId: CreateOrReuseId()
    },
    // 8 hours is a good time for refresh tokens.
    ttl: TimeAdd(Now(), ttlSeconds || REFRESH_TOKEN_LIFETIME_SECONDS, 'seconds')
  })
}

function CreateOrReuseId () {
  return If(
    IsCalledWithRefreshToken(),
    GetSessionId(),
    NewId()
  )
}

export function GetSessionId () {
  return Select(['data', 'sessionId'], Get(CurrentToken()))
}

export function CreateAccessAndRefreshToken (instance, accessTtlSeconds, refreshTtlSeconds) {
  return Let(
    {
      refresh: CreateRefreshToken(instance, refreshTtlSeconds),
      access: CreateAccessToken(instance, Select(['ref'], Var('refresh')), accessTtlSeconds)
    },
    {
      refresh: Var('refresh'),
      access: Var('access')
    }
  )
}

export function InvalidateRefreshToken (refreshTokenRef) {
  return Update(refreshTokenRef, { data: { used: true, timeUsed: Now() } })
}

function InvalidateAccessToken (refreshTokenRef) {
  return If(
    Exists(Match(Index('access_token_by_refresh_token'), refreshTokenRef)),
    Delete(Select(['ref'], Get(Match(Index('access_token_by_refresh_token'), refreshTokenRef)))),
    false
  )
}

export function LogoutAccessAndRefreshToken (refreshTokenRef) {
  return Do(
    InvalidateAccessToken(refreshTokenRef),
    Delete(refreshTokenRef)
  )
}

export function IsCalledWithAccessToken () {
  return Equals(Select(['data', 'type'], Get(CurrentToken()), false), 'access')
}

export function IsCalledWithRefreshToken () {
  return And(
    HasCurrentToken(),
    Equals(Select(['data', 'type'], Get(CurrentToken()), false), 'refresh')
  )
}
