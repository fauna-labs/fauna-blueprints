
import faunadb from 'faunadb'
import { CreateDeleteEventsTsAfter } from '../../src/events'

const q = faunadb.query
const {
  CreateFunction,
  Query,
  Lambda,
  Var
} = q

export default CreateFunction({
  name: 'create_delete_events_after',
  body: Query(Lambda(['indexName', 'afterTime', 'pageSize'],
    CreateDeleteEventsTsAfter(Var('indexName'), Var('afterTime'), Var('pageSize'))
  ))
})
