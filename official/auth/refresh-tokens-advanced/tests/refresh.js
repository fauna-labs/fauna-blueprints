import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import { delay } from './helpers/_delay'
import { REFRESH_TOKEN_REUSE_ERROR } from '../fauna/src/anomalies'
import { GRACE_PERIOD_SECONDS } from './resources/functions/_refresh-modified'
const q = fauna.query
const { Call, Create, Collection, Get, Paginate, Documents, Lambda, Var } = q

const testName = path.basename(__filename)

test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
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

test.after(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, t.context.databaseClients.parentClient)
})

test(testName + ': we are able to refresh access tokens by using the refresh token', async t => {
  t.plan(6)
  const adminClient = t.context.databaseClients.childClient
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
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

test(testName + ': we are able to refresh access tokens multiple times within the GRACE_PERIOD_SECONDS', async t => {
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

test(testName + ': we are NOT able to refresh access tokens multiple times after the GRACE_PERIOD_SECONDS', async t => {
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
