import faunadb from 'faunadb'
import { RequestPasswordReset } from '../../src/password-reset'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'request_password_reset',
  body: Query(Lambda(['email'],
    RequestPasswordReset(Var('email'))
  )),
  role: 'server'
})
