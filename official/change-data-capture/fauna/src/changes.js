
import faunadb, { Documents, Select } from 'faunadb'

const q = faunadb.query
const {
  Range,
  Lambda,
  Match,
  Index,
  ToMicros,
  Paginate,
  Var,
  Let,
  Get,
  Filter,
  Equals,
  Epoch,
  IsNonEmpty
} = q

// The name of an index in string format and a Fauna 'Time'.
export function EventsAfterTs (indexName, time, pageSize) {
  return Let(
    {
      collectionFromIndex: Select(['source'], Get(Index(indexName))),
      // Retrieving created/deleted events is easiest, those can be retrieved by retrieving events on the collection.
      eventsCreatedOrDeleted: Paginate(
        Documents(Var('collectionFromIndex')),
        { events: true, after: time, size: pageSize }
      ),

      // We can use the index to determine which document references were changed since this timestamp.
      documentsCreatedOrUpdated: Paginate(
        Range(
          Match(Index(indexName)),
          ToMicros(time),
          null
        ),
        { size: pageSize }
      ),
      // Since we want the details events information, we'll get the events that occured for each document that
      // has changed or was created after the given timestamp.
      eventsDocumentsCreatedOrUpdated: q.Map(
        Var('documentsCreatedOrUpdated'),
        Lambda((ts, ref) => Paginate(
          ref,
          { events: true, after: Epoch(0, 'microsecond'), size: 10 }))
      ),
      // Filter out created since you already have created events in 'eventsCreatedOrDeleted'. Therefore you are only interested in updated.
      eventsDocumentsUpdated: q.Filter(
        q.Map(
          Var('eventsDocumentsCreatedOrUpdated'),
          Lambda((eventsForDocs) => Filter(
            Var('eventsForDocRef'),
            Lambda(event => Equals(Select(['action'], event), 'update'))
          ))
        ),
        Lambda(eventsPage => IsNonEmpty(eventsPage))
      )
    },
    {
      eventsCreatedOrDeleted: Var('eventsCreatedOrDeleted'),
      eventsDocumentsUpdated: Var('eventsDocumentsUpdated')
    }
  )
}
