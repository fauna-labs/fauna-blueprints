import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import { delay } from './helpers/_delay'
import { REFRESH_TOKEN_REUSE_ERROR } from '../fauna/src/anomalies'
import { GRACE_PERIOD_SECONDS } from './resources/functions/_refresh-modified'
import { verifyTokens } from './helpers/_test-extensions'
const q = fauna.query
const { Call, Create, Collection, Get, Paginate, Documents, Lambda, Var } = q

let index = 0

test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.

  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  index = index + 1
  const adminClient = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(q, adminClient, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/anomalies.fql',
    'fauna/resources/collections/dinos.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/functions/logout.js',
    'fauna/resources/indexes/access-token-by-refresh-token.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/roles/loggedin.js',
    'fauna/resources/roles/refresh.js',
    // Custom function for tests to verify the age calculation.
    'tests/resources/functions/_get-age-of-refresh-token.js',
    'tests/resources/functions/_refresh-modified.js',
    'tests/resources/roles/_refresh-get-age-access.js'
  ])
  // create data, register, and login.
  t.context.testDocumentRef = (await adminClient.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  await adminClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  t.context.loginResult = await adminClient.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.afterEach(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': we are able to refresh access tokens by using the refresh token', async t => {
  t.plan(10)
  const adminClient = t.context.databaseClients.childClient
  // initially we have 1 token of each type from the login.
  await verifyTokens(t, adminClient, { access: 1, refresh: 1 })
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  // After the refresh we have 2 tokens of each kind.
  await verifyTokens(t, adminClient, { access: 2, refresh: 2 })
  // We  successfully received a token
  t.truthy(refreshResult.tokens.access)
  t.truthy(refreshResult.tokens.refresh)
  // And it's different than previous token
  t.not(refreshResult.tokens.access.secret, t.context.loginResult.tokens.access.secret)
  t.not(refreshResult.tokens.access.secret, t.context.loginResult.tokens.access.secret)
  // The original refresh token was not used but now is used
  t.falsy(t.context.loginResult.tokens.refresh.data.used)
  const originalRefreshToken = await adminClient.query(Get(t.context.loginResult.tokens.refresh.ref))
  t.truthy(originalRefreshToken.data.used)
})

test(path.basename(__filename) + ': we are able to refresh access tokens multiple times within the GRACE_PERIOD_SECONDS', async t => {
  t.plan(5)
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  const refreshResult2 = await refreshClient.query(Call('refresh'))
  const refreshResult3 = await refreshClient.query(Call('refresh'))
  t.truthy(refreshResult.tokens.access)
  t.truthy(refreshResult2.tokens.access)
  t.truthy(refreshResult2.tokens.access)
  t.not(refreshResult.tokens.access.secret, refreshResult2.tokens.access.secret)
  t.not(refreshResult2.tokens.access.secret, refreshResult3.tokens.access.secret)
})

test(path.basename(__filename) + ': we are NOT able to refresh access tokens multiple times after the GRACE_PERIOD_SECONDS', async t => {
  t.plan(7)
  const adminClient = t.context.databaseClients.childClient

  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  t.truthy(refreshResult.tokens.access)
  await delay(GRACE_PERIOD_SECONDS * 1000 + 2000)
  // The age is now higher than the grace period.
  const age = await refreshClient.query(Call('get-age-of-refresh-token'))
  t.true(age > GRACE_PERIOD_SECONDS)
  const refreshResult2 = await refreshClient.query(Call('refresh'))
  t.deepEqual(refreshResult2, REFRESH_TOKEN_REUSE_ERROR)
  const refreshResult3 = await refreshClient.query(Call('refresh'))
  t.deepEqual(refreshResult3, REFRESH_TOKEN_REUSE_ERROR)
  // If we do, the anomaly will be logged!
  const anomalies = await adminClient.query(q.Map(
    Paginate(Documents(Collection('anomalies'))),
    Lambda(['x'], Get(Var('x'))))
  )
  t.is(anomalies.data.length, 2)
  // Two anomalies for this user are logged
  t.is(anomalies.data[0].data.account.id, t.context.loginResult.account.ref.id)
  t.is(anomalies.data[1].data.account.id, t.context.loginResult.account.ref.id)
})

test(path.basename(__filename) + ': When we refresh and call fauna in parallel we still get access', async t => {
  t.plan(2)
  // Silent refresh could cause our access token to get invalidated when the call is still in flight.
  const adminClient = t.context.databaseClients.childClient
  const loginResult = await adminClient.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const refreshClient = getClient(fauna, loginResult.tokens.refresh.secret)
  const loggedInClient = getClient(fauna, loginResult.tokens.access.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))

  await t.notThrowsAsync(async () => {
    await loggedInClient.query(Get(t.context.testDocumentRef))
  })

  // Use the new token
  const loggedInClientAfterRefresh = getClient(fauna, refreshResult.tokens.access.secret)
  await t.notThrowsAsync(async () => {
    await loggedInClientAfterRefresh.query(Get(t.context.testDocumentRef))
  })
})
