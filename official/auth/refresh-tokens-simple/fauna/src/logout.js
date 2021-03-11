import faunadb from 'faunadb'
import { LogoutAccessAndRefreshToken, LogoutAllAccessAndRefreshToken } from './tokens'

const q = faunadb.query
const { If } = q

// Logout is called with the refresh token.
export function Logout (all) {
  return If(
    all,
    LogoutAll(),
    LogoutOne()
  )
}

// Logout the access and refresh token for the refresh token provided (which corresponds to one browser)
function LogoutOne () {
  return LogoutAccessAndRefreshToken()
}

// Logout all tokens for an account (which could be on different machines or different browsers)
function LogoutAll () {
  return LogoutAllAccessAndRefreshToken()
}
