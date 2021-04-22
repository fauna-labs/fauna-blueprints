import faunadb from 'faunadb'
import { ResetPassword } from '../../src/password-reset'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'reset_password',
  body: Query(Lambda(['password'],
    ResetPassword(Var('password'))
  )),
  role: 'server'
})
