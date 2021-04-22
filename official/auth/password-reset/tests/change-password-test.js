import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, deleteMigrationDir, getClient } from '../../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const q = fauna.query
const { Create, Collection, Identify, Call, Tokens } = q

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
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/functions/change-password.fql',
    'fauna/resources/roles/loggedin.fql'

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

test(path.basename(__filename) + ': When the password is known and we are logged in, we can use it to reset the password', async t => {
  // define the amount of tests
  t.plan(3)

  const client = t.context.databaseClients.childClient

  const idRes1 = await client.query(Identify(t.context.accountRef, 'testtest'))
  t.is(idRes1, true)
  const idRes2 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes2, false)

  const loggedInToken = await client.query(Create(Tokens(), { instance: t.context.accountRef }))
  const loggedInClient = getClient(fauna, loggedInToken.secret)
  await loggedInClient.query(Call('change_password', 'testtest', 'newpassword'))
  const idRes3 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes3, true)
})

test(path.basename(__filename) + ': Providing a wrong password will not change the password', async t => {
  // define the amount of tests
  t.plan(3)

  const client = t.context.databaseClients.childClient
  const idRes1 = await client.query(Identify(t.context.accountRef, 'testtest'))
  t.is(idRes1, true)
  const idRes2 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes2, false)
  const loggedInToken = await client.query(Create(Tokens(), { instance: t.context.accountRef }))
  const loggedInClient = getClient(fauna, loggedInToken.secret)
  await loggedInClient.query(Call('change_password', 'WRONG', 'newpassword'))
  const idRes3 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes3, false)
})
