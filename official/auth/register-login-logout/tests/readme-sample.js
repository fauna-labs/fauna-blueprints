import test from 'ava'
import path from 'path'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Call, CreateKey, Role } = q

let index = 0

test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  const testName = path.basename(__filename) + (index = ++index)
  const databaseClients = await setupTestDatabase(fauna, testName)
  const adminClient = databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, adminClient, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/dinos.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/functions/logout.fql',
    'fauna/resources/roles/public.fql',
    'fauna/resources/roles/loggedin.fql',
    'fauna/resources/indexes/accounts-by-email.fql'
  ])
  t.context.databaseClients = databaseClients
  t.context.testName = testName
})
test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': Readme sample works', async t => {
  await t.notThrowsAsync(async () => {
    const client = t.context.databaseClients.childClient
    const publicKey = await client.query(CreateKey({ role: Role('public') }))
    const publicClient = new fauna.Client({ secret: publicKey.secret })
    await publicClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
    const loginResult = await publicClient.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
    const accessClient = new fauna.Client({ secret: loginResult.token.secret })
    accessClient.query(Call('logout', true))
  })
})
