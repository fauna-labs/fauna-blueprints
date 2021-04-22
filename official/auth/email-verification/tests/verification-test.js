import test from 'ava'
import path from 'path'
import fauna, { Get } from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, getClient } from '../../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Create, Collection, Call, Tokens, Update } = q

let index = 0
test.beforeEach(async (t) => {
  t.context.testName = path.basename(__filename) + (index = ++index)
  // Set up a child database in before or beforeAll and receive a client to the child database
  // as well as a client to the parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  // initialize your database with resources.
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/users.fql',
    'fauna/resources/collections/email-verification-request.fql',
    'fauna/resources/functions/verify-account.fql',
    'fauna/resources/functions/get-account-verification-token.js',
    'fauna/resources/roles/email-verification-role.fql',
    'fauna/resources/roles/unverified-role.fql',
    'fauna/resources/roles/loggedin.js'
  ])
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': we can get a verification token and use it to verify an account', async t => {
  // define the amount of tests
  t.plan(2)

  const client = t.context.databaseClients.childClient
  const account = await client.query(Create(Collection('accounts'), {
    data: {
      email: 'brecht@brechtsdomain.com',
      verified: false
    }
  }))

  t.false(account.data.verified)
  const verificationToken = await client.query(Call('get_account_verification_token', account.ref))
  const verificationClient = getClient(fauna, verificationToken.secret)

  await verificationClient.query(Call('verify_account'))
  const account2 = await client.query(Get(account.ref))
  t.true(account2.data.verified)
})

test(path.basename(__filename) + ': an unverified account does not have access to data, a verified one does', async t => {
  // define the amount of tests
  t.plan(2)

  const client = t.context.databaseClients.childClient
  const account = await client.query(Create(Collection('accounts'), {
    data: {
      email: 'brecht@brechtsdomain.com',
      verified: false
    }
  }))

  // even if we have a token for accounts.
  const loggedInToken = await client.query(Create(Tokens(), { instance: account.ref }))
  const loggedInClient = getClient(fauna, loggedInToken.secret)

  // the 'logged'in role does not provide us access.
  await t.throwsAsync(async () => {
    await loggedInClient.query(Get(account.ref))
  }, { instanceOf: fauna.errors.PermissionDenied })

  const verificationToken = await client.query(Call('get_account_verification_token', account.ref))
  const verificationClient = getClient(fauna, verificationToken.secret)

  await verificationClient.query(Call('verify_account'))
  const account2 = await loggedInClient.query(Get(account.ref))
  t.truthy(account2)
})
