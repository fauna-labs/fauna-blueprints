import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
import { delay } from './helpers/_delay'

const { Create, Collection, Call, Epoch } = fauna.query

let index = 0
test.beforeEach(async (t) => {
  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    'fauna/resources/functions/create-delete-events-after.js',
    // a test collection and index
    'tests/resources/indexes/example-index-after-ts.fql',
    'tests/resources/collections/example-collection.fql'
  ])
  await delay(1000)
})

test.afterEach.always(async (t) => {
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': We can start from a timestamp of a created document and see other creations', async t => {
  t.plan(4)

  const client = t.context.databaseClients.childClient
  const result1 = await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 1
    }
  }))

  const result2 = await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 2
    }
  }))

  const changeset1 = await client.query(
    Call('create_delete_events_after', 'example_collection', Epoch(result1.ts, 'microsecond'), 10)
  )
  // We can see both events
  t.is(changeset1.data.length, 2)
  // We receive events for 2 documents, for each document there is 1 create event.
  t.is(changeset1.data[0].action, 'add')
  t.is(changeset1.data[1].action, 'add')

  const changeset2 = await client.query(
    Call('create_delete_events_after', 'example_collection', Epoch(result2.ts, 'microsecond'), 10)
  )
  t.is(changeset2.data.length, 1)
})

test(path.basename(__filename) + ': Created events : we can start from the beginning of time and see all created events', async t => {
  t.plan(3)

  const client = t.context.databaseClients.childClient
  await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 1
    }
  }))

  await client.query(Create(Collection('example_collection'), {
    data: {
      documentNumber: 2
    }
  }))

  const changeset = await client.query(
    Call('create_delete_events_after', 'example_collection', Epoch(0, 'microsecond'), 10)
  )

  // We can see both events
  t.is(changeset.data.length, 2)
  // We receive events for 2 documents, for each document there is 1 create event.
  t.is(changeset.data[0].action, 'add')
  t.is(changeset.data[1].action, 'add')
})
