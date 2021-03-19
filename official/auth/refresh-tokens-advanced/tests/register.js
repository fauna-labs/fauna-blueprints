import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
const q = fauna.query
const { Call, Paginate, Documents, Collection, Lambda, Get } = q

const testName = path.basename(__filename)
test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, testName)
})

test.after(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, t.context.databaseClients.parentClient)
})

test(testName + ': verify account was created', async t => {
  const client = t.context.databaseClients.childClient
  // Populate the schema on the child database.
  await populateDatabaseSchemaFromFiles(q, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/functions/register.fql'
  ])
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
