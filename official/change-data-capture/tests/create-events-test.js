import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const { Create, Collection, Call, Epoch } = fauna.query

let index = 0
test.beforeEach(async (t) => {
  t.context.testName = path.basename(__filename) + (index = ++index)

  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    'fauna/resources/functions/events-after-ts.js',
    // a test collection and index
    'tests/resources/indexes/example-index-after-ts.fql',
    'tests/resources/collections/example-collection.fql'
  ])
})

// test.afterEach.always(async (t) => {
//   await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
// })

// test(path.basename(__filename) + ': We can start from a timestamp of a created document and see what happend afterwards', async t => {
//   t.plan(4)

//   const client = t.context.databaseClients.childClient
//   const result1 = await client.query(Create(Collection('example_collection'), {
//     data: {
//       documentNumber: 1
//     }
//   }))

//   const result2 = await client.query(Create(Collection('example_collection'), {
//     data: {
//       documentNumber: 2
//     }
//   }))

//   const changeset1 = await client.query(
//     Call('events_after_ts',
//       'example_index_after_ts', // the index name
//       Epoch(result1.ts, 'microsecond'), // a time (expects a fauna 'Time')
//       10 // pagesize, determines the amount of events
//     )
//   )
//   // We can see both events
//   t.is(changeset1.data.length, 2)
//   // We receive events for 2 documents, for each document there is 1 create event.
//   t.is(changeset1.data[0].data[0].action, 'create')
//   t.is(changeset1.data[1].data[0].action, 'create')

//   const changeset2 = await client.query(
//     Call('events_after_ts',
//       'example_index_after_ts', // the index name
//       Epoch(result2.ts, 'microsecond'), // a time (expects a fauna 'Time')
//       10 // pagesize, determines the amount of events
//     )
//   )
//   t.is(changeset2.data.length, 1)
// })

test(path.basename(__filename) + ': Created events : we can start from the beginning of time and see all changes', async t => {
  t.plan(3)

  const client = t.context.databaseClients.childClient
  const res1 = await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 1
    }
  }))

  const res2 = await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 2
    }
  }))

  console.log(res1, res2)

  // Get all events since the beginning of time
  const changeset = await client.query(
    Call('events_after_ts',
      'example_index_after_ts', // the index name
      Epoch(0, 'microsecond'), // a time (expects a fauna 'Time')
      10 // pagesize, determines the amount of events
    )
  )

  console.log(JSON.stringify(changeset, null, 2))
  // We can see both events
  t.is(changeset.data.length, 2)
  // We receive events for 2 documents, for each document there is 1 create event.
  t.is(changeset.data[0].data[0].action, 'create')
  t.is(changeset.data[1].data[0].action, 'create')
})
