import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import { delay } from './helpers/_delay'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
const q = fauna.query
const { Call, Create, Collection, Get, Paginate, Documents } = q

const testName = path.basename(__filename)

test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(q, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/roles/loggedin.js',
    'fauna/resources/collections/dinos.fql',
    // custom resources for this test with lower TTLs fro access and refresh tokens (10s and 20s)
    'tests/resources/functions/_login-modified.js'
  ])
  // create some data in the test collection
  t.context.testDocumentRef = (await client.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  // and register a user
  await client.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.after(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, t.context.databaseClients.parentClient)
})

test(testName + ': within 10 seconds (ttl of access token), we can access data via the test membership role', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login-modified', 'brecht@brechtsdomain.be', 'verysecure'))
  const accessToken = loginResult.tokens.access.secret
  const loggedInClient = getClient(fauna, accessToken)
  const doc = await loggedInClient.query(Get(t.context.testDocumentRef))
  t.truthy(doc.data)
  t.is(doc.data.hello, 'world')
})

test(testName + ': after 10 seconds (ttl of access token), we can no longer access data', async t => {
  t.plan(3)
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login-modified', 'brecht@brechtsdomain.be', 'verysecure'))

  const accessToken = loginResult.tokens.access.secret
  const loggedInClient = getClient(fauna, accessToken)
  // wait 11s
  await delay(11000)

  // we can no longer get the document with this token
  await t.throwsAsync(async () => {
    await loggedInClient.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.Unauthorized })

  // nor can we paginate the collection
  await t.throwsAsync(async () => {
    await loggedInClient.query(Paginate(Documents(Collection('dinos'))))
  }, { instanceOf: fauna.errors.Unauthorized })

  // we can no longer access the token document itself, not even with the admin key.
  await t.throwsAsync(async () => {
    await client.query(Get(loginResult.tokens.access.ref))
  }, { instanceOf: fauna.errors.NotFound })
})

test(testName + ': refresh tokens do not provide access to the data', async t => {
  await t.throwsAsync(async () => {
    const client = t.context.databaseClients.childClient
    const loginResult = await client.query(Call('login-modified', 'brecht@brechtsdomain.be', 'verysecure'))
    const refreshToken = loginResult.tokens.refresh.secret
    const refreshClient = getClient(fauna, refreshToken)
    await refreshClient.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.PermissionDenied })
})
