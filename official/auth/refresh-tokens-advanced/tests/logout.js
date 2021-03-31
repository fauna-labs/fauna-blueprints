import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
import { verifyRefreshTokensLogout, verifyTokens } from './helpers/_test-extensions'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import { REFRESH_TOKEN_USED_AFTER_LOGOUT } from '../fauna/src/anomalies'
const q = fauna.query
const { Call, Create, Collection, Get } = q

let index = 0

test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  const testName = path.basename(__filename) + (index = ++index)
  const databaseClients = await setupTestDatabase(fauna, testName)
  const adminClient = databaseClients.childClient
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
    'fauna/resources/indexes/tokens-by-instance-sessionid-type-and-loggedout.fql',
    'fauna/resources/indexes/tokens-by-instance-type-and-loggedout.fql',
    'fauna/resources/roles/loggedin.js',
    'fauna/resources/roles/refresh.js'
  ])
  // create data, register, and login.
  const testDocumentRef = (await adminClient.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  await adminClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  await adminClient.query(Call('register', 'jef@jefsdomain.be', 'verysecure'))

  t.context.testDocumentRef = testDocumentRef
  t.context.databaseClients = databaseClients
  t.context.testName = testName
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': Logging out with all=false only logs out the current session', async t => {
  t.plan(11)
  const client = t.context.databaseClients.childClient

  const loginResultBrecht1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loginResultBrecht2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loginResultJef = await client.query(Call('login', 'jef@jefsdomain.be', 'verysecure')) // same user, but another browser/device

  const loggedInClientBrecht1 = getClient(fauna, loginResultBrecht1.tokens.access.secret)
  const loggedInClientBrecht2 = getClient(fauna, loginResultBrecht2.tokens.access.secret)
  const loggedInClientJef = getClient(fauna, loginResultJef.tokens.access.secret)

  t.truthy((await loggedInClientBrecht1.query(Get(t.context.testDocumentRef))).data)
  t.truthy((await loggedInClientBrecht2.query(Get(t.context.testDocumentRef))).data)
  t.truthy((await loggedInClientJef.query(Get(t.context.testDocumentRef))).data)

  // We start wtih 3 access tokens.
  await verifyTokens(t, client, { access: 3, refresh: 3 })

  // We log out
  const refreshClientBrecht1 = getClient(fauna, loginResultBrecht1.tokens.refresh.secret)
  await refreshClientBrecht1.query(Call('logout', false))
  // After logging out, we only have 2 access tokens, since we passed in fasle other tokens from
  // this account are not impacted. Refresh tokens remain but are set to loggedOut.
  await verifyTokens(t, client, { access: 2, refresh: 3 })
  await verifyRefreshTokensLogout(t, client, 1)

  // We can no longer fetch the data.
  await t.throwsAsync(async () => {
    console.log(await loggedInClientBrecht1.query(Get(t.context.testDocumentRef)))
  }, { instanceOf: fauna.errors.Unauthorized })
  // But the other two clients are not impacted
  t.truthy((await loggedInClientBrecht2.query(Get(t.context.testDocumentRef))).data)
  t.truthy((await loggedInClientJef.query(Get(t.context.testDocumentRef))).data)
})

test(path.basename(__filename) + ': Logging out with all=true logs out all sessions for that account', async t => {
  t.plan(11)
  const client = t.context.databaseClients.childClient
  const loginResultBrecht1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loginResultBrecht2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loginResultJef = await client.query(Call('login', 'jef@jefsdomain.be', 'verysecure'))

  const loggedInClientBrecht1 = getClient(fauna, loginResultBrecht1.tokens.access.secret)
  const loggedInClientBrecht2 = getClient(fauna, loginResultBrecht2.tokens.access.secret)
  const loggedInClientJef = getClient(fauna, loginResultJef.tokens.access.secret)

  t.truthy((await loggedInClientBrecht1.query(Get(t.context.testDocumentRef))).data)
  t.truthy((await loggedInClientBrecht2.query(Get(t.context.testDocumentRef))).data)
  t.truthy((await loggedInClientJef.query(Get(t.context.testDocumentRef))).data)

  await verifyTokens(t, client, { access: 3, refresh: 3 })

  // We log out
  const refreshClientBrecht1 = getClient(fauna, loginResultBrecht1.tokens.refresh.secret)
  await refreshClientBrecht1.query(Call('logout', true))
  // access tokens are gone, refresh tokens are set to logged out.
  await verifyTokens(t, client, { access: 1, refresh: 3 })
  await verifyRefreshTokensLogout(t, client, 2)

  // We can no longer fetch the data.
  await t.throwsAsync(async () => {
    console.log(await loggedInClientBrecht1.query(Get(t.context.testDocumentRef)))
  }, { instanceOf: fauna.errors.Unauthorized })
  await t.throwsAsync(async () => {
    console.log(await loggedInClientBrecht2.query(Get(t.context.testDocumentRef)))
  }, { instanceOf: fauna.errors.Unauthorized })
  // But clients from other users are not impacted
  t.truthy((await loggedInClientJef.query(Get(t.context.testDocumentRef))).data)
})

test(path.basename(__filename) + ': Logged out refresh tokens can no longer be used to refresh/logout', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const loginResultBrecht1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const refreshClient = getClient(fauna, loginResultBrecht1.tokens.refresh.secret)
  // We log out
  await refreshClient.query(Call('logout', true))
  // we can no longer refresh nor logout
  const logout = await refreshClient.query(Call('logout', true))
  const refresh = await refreshClient.query(Call('refresh'))

  t.deepEqual(logout, REFRESH_TOKEN_USED_AFTER_LOGOUT)
  t.deepEqual(refresh, REFRESH_TOKEN_USED_AFTER_LOGOUT)
})
