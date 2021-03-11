import faunadb from 'faunadb'
import { LoginAccount } from '../../src/login'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'login',
  body: Query(Lambda(['email', 'password'],
    LoginAccount(Var('email'), Var('password'))
  )),
  role: 'server'
})
