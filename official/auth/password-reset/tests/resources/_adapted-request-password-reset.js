import faunadb from 'faunadb'
import { RequestPasswordReset } from '../../fauna/src/password-reset'

export const CUSTOM_PASSWORD_RESET_TIMEOUT = 2000

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

// set custom timeout for the tests.
export default CreateFunction({
  name: 'request-password-reset-adapted',
  body: Query(Lambda(['email', 'lifetimeSecs'],
    RequestPasswordReset(Var('email'), CUSTOM_PASSWORD_RESET_TIMEOUT)
  )),
  role: 'server'
})
