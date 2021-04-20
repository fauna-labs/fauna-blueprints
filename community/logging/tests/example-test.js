import test from 'ava'
import path from 'path'
import fauna, { Collection, Get } from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const q = fauna.query
const { Call, Add, Paginate, Documents, Lambda, Update } = q

let index = 0
test.beforeEach(async (t) => {
  t.context.testName = path.basename(__filename) + (index = ++index)
  // Set up a child database in before or beforeAll and receive a client to the child database
  // as well as a client to the parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  // initialize your database with resources.
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    // resources of the blueprint
    'fauna/resources/collections/logs.fql',
    'fauna/resources/indexes/logs_by_category_and_ts.fql',
    'fauna/resources/functions/log.fql'
  ])
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': logging while the category is disabled returns the result.', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  await client.query(Update(Collection('logs'), { data: { calculations: false } }))
  const result = await client.query(Call('log', 'calculations', 'adding 2 + 2', Add(2, 2)))
  t.is(result, 4)
  const logs = await client.query(q.Map(Paginate(Documents(Collection('logs'))), Lambda(x => Get(x))))
  t.is(logs.data.length, 0)
})

test(path.basename(__filename) + ':we can enable a category and log an FQL statement, the query returns the result of the passed FQL', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const result = await client.query(Call('log', 'calculations', 'adding 2 + 2', Add(2, 2)))
  t.is(result, 4)
  const logs = await client.query(q.Map(Paginate(Documents(Collection('logs'))), Lambda(x => Get(x))))
  t.is(logs.data.length, 1)
})
