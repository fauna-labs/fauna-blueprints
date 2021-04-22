
import faunadb from 'faunadb'
import { AddRateLimiting } from '../../src/rate-limiting'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'rate_limit',
  body: Query(Lambda(['action', 'identifier', 'calls', 'perMilliSeconds'],
    // action, identifier, calls, perMilliSeconds
    AddRateLimiting(Var('action'), Var('identifier'), Var('calls'), Var('perMilliSeconds'))
  )),
  role: 'server'
})
