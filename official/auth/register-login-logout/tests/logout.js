import test from 'ava'
import { populateDatabaseSchemaFromFiles, setupTestDatabase, destroyTestDatabase, getClient } from './helpers/_setup-db'
import * as fauna from 'faunadb'
const q = fauna.query
const { Call, Create, Collection, Get } = q

const testName = 'logout'
test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/dinos.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/functions/logout.fql',
    'fauna/resources/roles/loggedin.fql',
    'fauna/resources/indexes/accounts-by-email.fql'
  ])
  t.context.testDocumentRef = (await client.query(Create(Collection('dinos'), { data: { hello: 'world' } }))).ref
  await client.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
})

test.after(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(testName, t.context.databaseClients.parentClient)
})

test(testName + ': we can logout one token of a specific user', async t => {
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const loginResult1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient1 = getClient(loginResult1.token.secret)
  const loginResult2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient2 = getClient(loginResult2.token.secret)
  // we can retrieve the document
  const doc1 = await loggedInClient1.query(Get(t.context.testDocumentRef))
  let doc2 = await loggedInClient2.query(Get(t.context.testDocumentRef))
  t.truthy(doc1.data)
  t.truthy(doc2.data)

  // log out the first login token.
  await loggedInClient1.query(Call('logout', false))

  // The second client can still access the document
  doc2 = await loggedInClient2.query(Get(t.context.testDocumentRef))
  t.truthy(doc2.data)
  // The first client can't
  await t.throwsAsync(async () => {
    await loggedInClient1.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.Unauthorized })
})

test(testName + ': we can logout all tokens of a specific user', async t => {
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const loginResult1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient1 = getClient(loginResult1.token.secret)
  const loginResult2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient2 = getClient(loginResult2.token.secret)
  // we can retrieve the document
  const doc1 = await loggedInClient1.query(Get(t.context.testDocumentRef))
  const doc2 = await loggedInClient2.query(Get(t.context.testDocumentRef))
  t.truthy(doc1.data)
  t.truthy(doc2.data)

  // log out the all tokens by passing true
  await loggedInClient1.query(Call('logout', true))

  // None of the tokens can still access the document.
  await t.throwsAsync(async () => {
    await loggedInClient1.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.Unauthorized })

  await t.throwsAsync(async () => {
    await loggedInClient2.query(Get(t.context.testDocumentRef))
  }, { instanceOf: fauna.errors.Unauthorized })
})
