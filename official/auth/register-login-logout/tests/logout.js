import test from 'ava'
import path from 'path'
import { destroyTestDatabase, getClient, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Call, Create, Collection, Get } = q

let index = 0

test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, client, [
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

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': we can logout one token of a specific user', async t => {
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const loginResult1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient1 = getClient(fauna, loginResult1.token.secret)
  const loginResult2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient2 = getClient(fauna, loginResult2.token.secret)
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

test(path.basename(__filename) + ': we can logout all tokens of a specific user', async t => {
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const loginResult1 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient1 = getClient(fauna, loginResult1.token.secret)
  const loginResult2 = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  const loggedInClient2 = getClient(fauna, loginResult2.token.secret)
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
