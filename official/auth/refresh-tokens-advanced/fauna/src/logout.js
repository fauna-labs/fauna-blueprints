import faunadb from 'faunadb'
import { GetSessionId, LogoutAccessAndRefreshToken, VerifyRefreshToken } from './tokens'

const q = faunadb.query
const { Let, Var, Lambda, Match, CurrentIdentity, Index, If, Paginate } = q

// Logout is called with the refresh token.
export function Logout (all) {
  return VerifyRefreshToken(If(
    all,
    LogoutAll(),
    LogoutOne()
  ), 'logout')
}

// Logout the access and refresh token for the refresh token provided (which corresponds to one browser)
function LogoutOne () {
  return Let(
    {
      refreshTokens: Paginate(
        Match(
          Index('tokens_by_instance_sessionid_type_and_loggedout'),
          CurrentIdentity(), GetSessionId(), 'refresh', false
        ), { size: 100000 })
    },
    q.Map(Var('refreshTokens'), Lambda(['token'], LogoutAccessAndRefreshToken(Var('token'))))
  )
}

// Logout all tokens for an accounts (which could be on different machines or different browsers)
function LogoutAll () {
  return Let(
    {
      refreshTokens: Paginate(
        Match(
          Index('tokens_by_instance_type_and_loggedout'),
          CurrentIdentity(), 'refresh', false),
        { size: 100000 }
      )
    },
    q.Map(Var('refreshTokens'), Lambda(['token'], LogoutAccessAndRefreshToken(Var('token'))))
  )
}
