
import faunadb from 'faunadb'
import { CreateDeleteEventsTsBefore } from '../../src/events'

const q = faunadb.query
const {
  CreateFunction,
  Query,
  Lambda,
  Var
} = q

export default CreateFunction({
  name: 'create_delete_events_before',
  body: Query(Lambda(['indexName', 'beforeTime', 'pageSize'],
    CreateDeleteEventsTsBefore(Var('indexName'), Var('beforeTime'), Var('pageSize'))
  ))
})
