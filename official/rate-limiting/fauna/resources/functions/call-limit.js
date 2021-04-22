
import faunadb from 'faunadb'
import { AddCallLimit } from '../../src/rate-limiting'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction,
  Var
} = q

export default CreateFunction({
  name: 'call_limit',
  body: Query(Lambda(['action', 'identifier', 'calls'],
    // action, identifier, calls, perMilliSeconds
    AddCallLimit(Var('action'), Var('identifier'), Var('calls'))
  )),
  role: 'server'
})
