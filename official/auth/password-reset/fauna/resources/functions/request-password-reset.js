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
  name: 'request-password-reset',
  body: Query(Lambda(['email', 'lifetimeSecs'],
    RequestPasswordReset(Var('email'), Var('lifetimeSecs'))
  )),
  role: 'server'
})
