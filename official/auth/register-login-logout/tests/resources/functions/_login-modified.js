import faunadb from 'faunadb'
import { LoginAccount } from '../../../fauna/src/login'

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
    // Login with modified ttls: 10 seconds for tokens
    LoginAccount(Var('email'), Var('password'), 10)
  )),
  role: 'server'
})
