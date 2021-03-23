import test from 'ava'
import path from 'path'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'
import { destroyTestDatabase, setupTestDatabase, populateDatabaseSchemaFromFiles } from '../../../../util/helpers/setup-db'
const q = fauna.query
const { Call, Paginate, Documents, Collection, Lambda, Get } = q

const testName = path.basename(__filename)
let databaseClients = { parentClient: null, childClient: null }
test.before(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  databaseClients = await setupTestDatabase(fauna, testName)
})

test.after.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(q, testName, databaseClients.parentClient)
})

test(testName + ': verify account was created', async t => {
  const client = databaseClients.childClient
  // Populate the schema on the child database.
  await populateDatabaseSchemaFromFiles(schemaMigrate, q, client, [
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
