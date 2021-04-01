import faunadb from 'faunadb'
import { RequestPasswordReset } from '../../fauna/src/password-reset'

export const CUSTOM_PASSWORD_RESET_TIMEOUT = 2 // seconds

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

// set custom timeout for the tests.
export default CreateFunction({
  name: 'request_password_reset',
  body: Query(Lambda(['email'],
    RequestPasswordReset(Var('email'), CUSTOM_PASSWORD_RESET_TIMEOUT)
  )),
  role: 'server'
})
