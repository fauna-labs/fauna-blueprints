
import faunadb from 'faunadb'
import { UpdateEventsAfterTs } from '../../src/events'

const q = faunadb.query
const {
  CreateFunction,
  Query,
  Lambda,
  Var
} = q

export default CreateFunction({
  name: 'update_events_before',
  body: Query(Lambda(['indexName', 'time', 'pageSize'],
    UpdateEventsAfterTs(Var('indexName'), Var('time'), Var('pageSize'), 'before')
  ))
})
