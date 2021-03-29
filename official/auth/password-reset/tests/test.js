import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, deleteMigrationDir } from '../../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const q = fauna.query
const { Create, Collection, Identify, Call } = q

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
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/password-reset-request.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/indexes/password_reset_requests_by_account.fql',
    'fauna/resources/functions/change-password.js',
    'fauna/resources/functions/request-password-reset.js',
    'tests/resources/_adapted-request-password-reset.js'

  ])
  // create some data in case necessary collection, store it in the context.
  t.context.accountRef = (await client.query(
    Create(Collection('accounts'),
      {
        data: { email: 'brecht@brechtsdomain.com' },
        credentials: { password: 'testtest' }
      }))).ref
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': We can ask a password reset token and use it', async t => {
  // define the amount of tests
  t.plan(2)

  const client = t.context.databaseClients.childClient
  const res = await client.query(Identify(t.context.accountRef, 'testtest'))
  t.is(res, true)

  const resetResult = await client.query(Call('request-password-reset', 'brecht@brechtsdomain.com')
  console.log(resetResult)
  await t.throwsAsync(async () => {
    // do some call
    throw new Error()
  }, { instanceOf: Error })
})
