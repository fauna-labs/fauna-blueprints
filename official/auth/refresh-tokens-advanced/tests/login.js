import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import { verifyTokens } from './helpers/_test-extensions'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
const q = fauna.query
const { Call, Paginate, Tokens, Lambda, Get, Var } = q

let index = 0
test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(q, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/functions/login.js',
    'fauna/resources/indexes/accounts-by-email.fql'
  ])
  await client.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  await client.query(Call('register', 'brecht2@brechtsdomain.be', 'verysecure'))
})

test.afterEach(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': we can login with correct credentials', async t => {
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  t.truthy(loginResult.tokens.access)
  t.truthy(loginResult.tokens.refresh)
  t.truthy(loginResult.account)
})

test(path.basename(__filename) + ': we can not login with incorrect password', async t => {
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@brechtsdomain.be', 'wrong'))
  t.false(loginResult)
})

test(path.basename(__filename) + ': we can not login with incorrect email', async t => {
  const client = t.context.databaseClients.childClient
  const loginResult = await client.query(Call('login', 'brecht@jefsdomain.be', 'verysecure'))
  // the returned result is the same as incorrect passwords
  t.false(loginResult)
})

test(path.basename(__filename) + ': One login creates two tokens, refresh tokens are unused', async t => {
  const client = t.context.databaseClients.childClient
  let allTokens = await client.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  // initially there are no tokens.
  t.is(allTokens.data.length, 0)
  // Each login creates 2 tokens, one access, one refresh.
  await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  await client.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
  await client.query(Call('login', 'brecht2@brechtsdomain.be', 'verysecure'))

  allTokens = await client.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  await verifyTokens(t, client, { access: 3, refresh: 3 })
})
