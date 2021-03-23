import test from 'ava'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Call } = q

const testName = 'login'
test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/indexes/accounts-by-email.fql'
  ])
  await client.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.after.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, t.context.databaseClients.parentClient)
})

test(testName + ': we can login with correct credentials', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  t.truthy(loginResult.token)
  t.truthy(loginResult.account)
})

test(testName + ': we can not login with incorrect password', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@brechtsdomain.be', 'wrong'))
  t.false(loginResult.token)
  t.false(loginResult.account)
})

test(testName + ': we can not login with incorrect email', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@jefsdomain.be', 'verysecure'))
  // the returned result is the same as incorrect passwords
  t.false(loginResult.token)
  t.false(loginResult.account)
})
