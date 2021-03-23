import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
const q = fauna.query
const { Call, Create, Collection } = q

const testName = path.basename(__filename)

test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
  const adminClient = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, adminClient, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/anomalies.fql',
    'fauna/resources/collections/dinos.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/functions/refresh.js',
    'fauna/resources/functions/logout.js',
    'fauna/resources/indexes/access-token-by-refresh-token.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/roles/loggedin.js',
    'fauna/resources/roles/refresh.js'
  ])
  // create data, register, and login.
  t.context.testDocumentRef = (await adminClient.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  await adminClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  t.context.loginResult = await adminClient.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.after.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, t.context.databaseClients.parentClient)
})

test(testName + ': we are able to refresh access tokens by using the refresh token', async t => {
  t.plan(4)
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  // We  successfully received a token
  t.truthy(refreshResult.tokens.access)
  t.truthy(refreshResult.tokens.refresh)
  // And it's different than previous token
  t.not(refreshResult.tokens.access.secret, t.context.loginResult.tokens.access.secret)
  t.not(refreshResult.tokens.access.secret, t.context.loginResult.tokens.access.secret)
})

test(testName + ': we are able to refresh access tokens multiple times', async t => {
  t.plan(5)
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  const refreshResult2 = await refreshClient.query(Call('refresh'))
  const refreshResult3 = await refreshClient.query(Call('refresh'))

  t.truthy(refreshResult.tokens.access)
  t.truthy(refreshResult2.tokens.access)
  t.truthy(refreshResult3.tokens.access)
  t.not(refreshResult.tokens.access.secret, refreshResult2.tokens.access.secret)
  t.not(refreshResult2.tokens.access.secret, refreshResult3.tokens.access.secret)
})
