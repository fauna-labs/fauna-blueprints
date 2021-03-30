import test from 'ava'
import path from 'path'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles, getClient } from '../../../../util/helpers/setup-db'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Call, Paginate, Documents, Collection, Lambda, Get, CreateKey, Role } = q

let index = 0
test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/functions/register.fql',
    'fauna/resources/roles/public.fql'
  ])
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': verify account was created', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  // We now have a register function which we can callbundleRenderer.renderToStream
  await client.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  const accounts = await client.query(q.Map(
    Paginate(
      Documents(Collection('accounts'))
    ),
    Lambda(ref => Get(ref))
  ))
  // There will be an email
  t.is(accounts.data[0].data.email, 'brecht@brechtsdomain.be')
  // Passwords are never returned
  t.is(accounts.data[0].data.password, undefined)
})

test(path.basename(__filename) + ': you can register with a key that uses the public role', async t => {
  const client = t.context.databaseClients.childClient
  const key = await client.query(CreateKey({ role: Role('public') }))
  const publicClient = getClient(fauna, key.secret)
  const res = await publicClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
  t.truthy(res)
})
