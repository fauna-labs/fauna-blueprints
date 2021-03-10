import test from 'ava'
import { populateDatabaseSchemaFromFiles, setupTestDatabase, destroyTestDatabase, getClient } from './helpers/_setup-db'
import * as fauna from 'faunadb'
import { delay } from './helpers/_delay'
const q = fauna.query
const { Call, Create, Collection, Get, Paginate, Documents } = q

const testName = 'access'
test.before(async (t) => {
  // Set up a child database in before or beforeAll and receive a client to the child database
  // as well as a client to the parent database. 
  t.context.databaseClients = await setupTestDatabase(testName)
  const client = t.context.databaseClients.childClient
  // initialize your database with resources.
  await populateDatabaseSchemaFromFiles(client, [
    // resources of the blueprint
    'fauna/resources/<your resource>.fql',
    // custom test resources specific to the test
    'tests/resources/<your resource>.js'
  ])
  // create some data in case necessary collection, store it in the context.
  t.context.someTestData = //..
})

test.after(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(testName, t.context.databaseClients.parentClient)
})

test(testName + ': things your test does', async t => {
  // define the amount of tests
  t.plan(2)
  // Test using ava test assertions

  // t.is(true, true)

  //await t.throwsAsync(async () => {
  //   do some call
  //}, { instanceOf: fauna.errors.Unauthorized })

  // https://github.com/avajs/ava/blob/main/docs/03-assertions.md

})

