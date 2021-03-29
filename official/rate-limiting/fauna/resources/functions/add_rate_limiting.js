
import faunadb from 'faunadb'
import AddRateLimiting from '../../src/rate_limiting'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'ratelimit',
  body: Query(Lambda(['action', 'identifier', 'calls', 'perMilliSeconds'],
    // action, identifier, calls, perMilliSeconds
    AddRateLimiting(Var('action'), Var('identifier'), Var('calls'), Var('perMilliSeconds'))
  )),
  role: 'server'
})
