import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
import { delay } from './helpers/_delay'

const { Create, Collection, Call, Epoch, Delete } = fauna.query

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

test(path.basename(__filename) + ': We can paginate through the create/delete events when those are separate create/deletes', async t => {
  t.plan(4)

  const client = t.context.databaseClients.childClient
  const results = []
  // Create a number of documents (separate calls)
  for (let i = 0; i < 20; i++) {
    results.push(await client.query(Create(Collection('example_collection'), {
      data: {
        documentNumber: i
      }
    })))
  }

  for (let i = 0; i < 20; i++) {
    results.push(await client.query(Delete(results[i].ref)))
  }

  const changeset = await client.query(
    Call('create_delete_events_after', 'example_collection', Epoch(results[0].ts, 'microsecond'), 10)
  )

  // We have an after cursor.
  t.truthy(changeset.after)
  t.is(changeset.data.length, 10)
  t.is(changeset.data.filter((e) => e.action === 'add').length, 10)

  console.log(JSON.stringify(changeset, null, 2))
})
