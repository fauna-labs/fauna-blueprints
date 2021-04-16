import test from 'ava'
import path from 'path'
import fauna, { Update } from 'faunadb'
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
    'fauna/resources/functions/update-events-after.js',
    'tests/resources/indexes/example-index-after-ts.fql',
    'tests/resources/collections/example-collection.fql'
  ])
  await delay(1000)
})

test.afterEach.always(async (t) => {
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': We can start from a timestamp of a created document and see other updates', async t => {
  t.plan(6)

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

  await client.query(Update(result2.ref, {
    data: {
      updatedThing: 'thing'
    }
  }))

  await client.query(Update(result2.ref, {
    data: {
      documentNumber: '2',
      updatedThing2: 'thing2'
    }
  }))

  await client.query(Update(result1.ref, {
    data: {
      updatedThing: 'thing'
    }
  }))

  const changeset1 = await client.query(
    Call('update_events_after', 'example_index_after_ts', Epoch(result1.ts, 'microsecond'), 10)
  )
  // We can see two documents that have updates
  t.is(changeset1.data.length, 2)

  // The documents are ordered in terms of their ts (and therefore the last update), document 2 wil be first.
  // Document 2 has 2 update events while document 1 only has one.
  const document2 = changeset1.data[0]
  const document1 = changeset1.data[1]
  t.is(document2.data.length, 2)
  t.is(document1.data.length, 1)

  t.deepEqual(document2.data[0].data, {
    updatedThing: 'thing'
  })
  t.deepEqual(document2.data[1].data, {
    documentNumber: '2',
    updatedThing2: 'thing2'
  })

  t.deepEqual(document1.data[0].data, {
    updatedThing: 'thing'
  })
})
