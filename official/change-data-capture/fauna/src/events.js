
import faunadb from 'faunadb'

const q = faunadb.query
const {
  Range,
  Lambda,
  Match,
  Index,
  ToMicros,
  Paginate,
  Var
} = q

// The name of an index in string format and a timestring (e.g. '2020-05-22T19:12:07.121247Z')
export function EventsAfterTs (indexName, time, pageSize) {
  return q.Map(
    Paginate(
      Range(
        Match(Index(indexName)),
        ToMicros(time),
        null
      ),
      { size: pageSize }
    ),
    Lambda(['ts', 'ref'], Paginate(Var('ref'), { events: true, after: time, size: pageSize }))
  )
}
