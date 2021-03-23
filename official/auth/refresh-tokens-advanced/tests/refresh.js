import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import { delay } from './helpers/_delay'
import { REFRESH_TOKEN_EXPIRED, REFRESH_TOKEN_REUSE_ERROR } from '../fauna/src/anomalies'
import { GRACE_PERIOD_SECONDS, ACCESS_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_LIFETIME_SECONDS, REFRESH_TOKEN_RECLAIMTIME_SECONDS } from './resources/functions/_refresh-modified'

import { verifyTokens } from './helpers/_test-extensions'
const q = fauna.query
const { Tokens, Call, Create, Collection, Get, Paginate, Documents, Lambda, Var } = q

let index = 0

test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.

  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  index = index + 1
  const adminClient = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, adminClient, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/anomalies.fql',
    'fauna/resources/collections/dinos.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/logout.js',
    'fauna/resources/indexes/access-token-by-refresh-token.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/roles/loggedin.js',
    'fauna/resources/roles/refresh.js',
    // Custom function for tests to verify the age calculation.
    'tests/resources/functions/_refresh-modified.js',
    'tests/resources/functions/_login-modified.js'
  ])
  // create data, register, and login.
  t.context.testDocumentRef = (await adminClient.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  await adminClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  t.context.loginResult = await adminClient.query(Call('login-modified', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': you are able to refresh access tokens by using the refresh token', async t => {
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

test(path.basename(__filename) + ': you are able to refresh access tokens multiple times within the GRACE_PERIOD_SECONDS', async t => {
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

test(path.basename(__filename) + ': you are not able to refresh when the REFRESH_TOKEN_LIFETIME_SECONDS has expired from the original login refresh token', async t => {
  t.plan(1)
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  // since the first refresh token is called with the original
  await delay(REFRESH_TOKEN_LIFETIME_SECONDS * 1000 + 2000)
  const refreshResult = await refreshClient.query(Call('refresh'))
  t.deepEqual(refreshResult, REFRESH_TOKEN_EXPIRED)
})

test(path.basename(__filename) + ': you are not able to refresh when the REFRESH_TOKEN_LIFETIME_SECONDS has expired from an already refreshed refresh token', async t => {
  t.plan(1)
  const initialClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const initialRefreshResult = await initialClient.query(Call('refresh'))
  const refreshClient = getClient(fauna, initialRefreshResult.tokens.refresh.secret)
  // since the first refresh token is called with the original
  await delay(REFRESH_TOKEN_LIFETIME_SECONDS * 1000 + 2000)
  const refreshResult = await refreshClient.query(Call('refresh'))
  t.deepEqual(refreshResult, REFRESH_TOKEN_EXPIRED)
})

test(path.basename(__filename) + ': after the REFRESH_TOKEN_LIFETIME_SECONDS has expired the token still exists, after REFRESH_TOKEN_RECLAIMTIME_SECONDS it is gone', async t => {
  t.plan(2)
  const adminClient = t.context.databaseClients.childClient
  // since the first refresh token is called with the original
  await delay(REFRESH_TOKEN_LIFETIME_SECONDS * 1000 + 2000)
  // by now the access token is gone, the refresh token remains
  const allTokens = await adminClient.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  t.is(allTokens.data.length, 1)

  // after the reclaimtime has passed, the token is gone.
  await delay(REFRESH_TOKEN_RECLAIMTIME_SECONDS - (REFRESH_TOKEN_LIFETIME_SECONDS * 1000 + 2000))
  const allTokens2 = await adminClient.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  t.is(allTokens2.data.length, 1)
})

test(path.basename(__filename) + ': you are NOT able to use the access tokens after ACCESS_TOKEN_LIFETIME_SECONDS', async t => {
  t.plan(2)
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  t.truthy(refreshResult.tokens.access)
  await delay(ACCESS_TOKEN_LIFETIME_SECONDS * 1000 + 2000)

  const accessToken = refreshResult.tokens.access.secret
  const loggedInClient = getClient(fauna, accessToken)

  await t.throwsAsync(async () => {
    await loggedInClient.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.Unauthorized })
})

test(path.basename(__filename) + ':  you are NOT able to use the refresh token after the GRACE_PERIOD_SECONDS', async t => {
  t.plan(6)
  const adminClient = t.context.databaseClients.childClient

  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const refreshResult = await refreshClient.query(Call('refresh'))
  t.truthy(refreshResult.tokens.access)
  await delay(GRACE_PERIOD_SECONDS * 1000 + 2000)
  // The age is now higher than the grace period.
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
  const refreshClient = getClient(fauna, t.context.loginResult.tokens.refresh.secret)
  const loggedInClient = getClient(fauna, t.context.loginResult.tokens.access.secret)
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
