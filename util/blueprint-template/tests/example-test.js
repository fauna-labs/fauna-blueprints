import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, deleteMigrationDir } from '../../../helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

test.after.always(async (t) => {
  await deleteMigrationDir()
})

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
    'fauna/resources/<your resource>.fql',
    // custom test resources specific to the test
    'tests/resources/<your resource>.js'
  ])
  // create some data in case necessary collection, store it in the context.
  t.context.someTestData = 'somedata'
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': things your test does', async t => {
  // define the amount of tests
  t.plan(2)

  // write some tests (https://github.com/avajs/ava/blob/main/docs/03-assertions.md)
  t.is(true, true)

  await t.throwsAsync(async () => {
    // do some call
    throw new Error()
  }, { instanceOf: Error })
})
