import faunadb from 'faunadb'
import { ChangePassword } from '../../src/password-reset'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'change_password',
  body: Query(Lambda(['password'],
    ChangePassword(Var('password'))
  )),
  role: 'server'
})
