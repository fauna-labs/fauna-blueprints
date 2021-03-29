import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, deleteMigrationDir } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const testName = path.basename(__filename)

test.after.always(async (t) => {
  await deleteMigrationDir()
})

test.beforeEach(async (t) => {
  // Set up a child database in before or beforeAll and receive a client to the child database
  // as well as a client to the parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
  const client = t.context.databaseClients.childClient
  // initialize your database with resources.
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    'fauna/resources/access_logs.fql',
    'fauna/resources/add_rate_limiting.js',
    'fauna/resources/access_logs_by_action_and_identity_ordered_by_ts.fql'
  ])
  // create some data in case necessary collection, store it in the context.
  t.context.someTestData = 'somedata'
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, testName, t.context.databaseClients.parentClient)
})

test(testName + ': things your test does', async t => {
  // define the amount of tests
  t.plan(2)

  // write some tests (https://github.com/avajs/ava/blob/main/docs/03-assertions.md)
  t.is(true, true)

  await t.throwsAsync(async () => {
    // do some call
    throw new Error()
  }, { instanceOf: Error })
})
