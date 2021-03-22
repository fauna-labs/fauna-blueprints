import faunadb from 'faunadb'
import { LoginAccount } from '../../../fauna/src/login'
import { ACCESS_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_RECLAIMTIME_SECONDS } from './_refresh-modified'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'login-modified',
  body: Query(Lambda(['email', 'password'],
    // Login with modified ttls.
    // email, password, accessTokenTtl, refreshLifetimeSeconds, refreshReclaimtimeSeconds
    LoginAccount(Var('email'), Var('password'), ACCESS_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_RECLAIMTIME_SECONDS)
  )),
  role: 'server'
})
