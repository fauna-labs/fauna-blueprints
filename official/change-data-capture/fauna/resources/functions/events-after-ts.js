
import faunadb from 'faunadb'
import { EventsAfterTs } from '../../src/events'

const q = faunadb.query
const {
  CreateFunction,
  Query,
  Lambda,
  Var
} = q

export default CreateFunction({
  name: 'events_after_ts',
  body: Query(Lambda(['indexName', 'time', 'pageSize'],
    EventsAfterTs(Var('indexName'), Var('time'), Var('pageSize'))
  ))
})
