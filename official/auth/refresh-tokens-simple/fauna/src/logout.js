import faunadb from 'faunadb'
import { LogoutAccessAndRefreshToken } from './tokens'

const q = faunadb.query
const { If } = q

// Logout is called with the refresh token.
export function Logout (all) {
  return If(
    all,
    q.Logout(true),
    LogoutAccessAndRefreshToken()
  )
}
