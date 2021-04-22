import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, deleteMigrationDir, getClient } from '../../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
import { delay } from './helpers/_delay'
import { CUSTOM_PASSWORD_RESET_TIMEOUT } from './resources/_adapted-request-password-reset'

const q = fauna.query
const { Create, Collection, Identify, Call, Count, Tokens } = q

let index = 0
test.beforeEach(async (t) => {
  t.context.testName = path.basename(__filename) + (index = ++index)
  // Set up a child database in before or beforeAll and receive a client to the child database
  // as well as a client to the parent database.
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  // initialize your database with resources.
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    // resources of the blueprint
    'fauna/resources/collections/accounts.fql',
    'fauna/resources/collections/password-reset-request.fql',
    'fauna/resources/indexes/accounts-by-email.fql',
    'fauna/resources/indexes/password-reset-requests-by-account.fql',
    'fauna/resources/indexes/tokens-by-instance.fql',
    'fauna/resources/functions/reset-password.js',
    'fauna/resources/roles/reset-token-role.fql',
    'fauna/resources/roles/public.fql',
    'tests/resources/_adapted-request-password-reset.js'

  ])
  // create some data in case necessary collection, store it in the context.
  t.context.accountRef = (await client.query(
    Create(Collection('accounts'),
      {
        data: { email: 'brecht@brechtsdomain.com' },
        credentials: { password: 'testtest' }
      }))).ref
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': We can ask a password reset token and use it', async t => {
  // define the amount of tests
  t.plan(3)

  const client = t.context.databaseClients.childClient
  const idRes1 = await client.query(Identify(t.context.accountRef, 'testtest'))
  t.is(idRes1, true)
  const idRes2 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes2, false)

  const resetResult = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient = getClient(fauna, resetResult.secret)
  await resetClient.query(Call('reset_password', 'newpassword'))
  const idRes3 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes3, true)
})

test(path.basename(__filename) + ': After the given delay, password reset tokens become unusable', async t => {
  t.plan(1)
  const client = t.context.databaseClients.childClient
  const resetResult = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient = getClient(fauna, resetResult.secret)
  await delay(CUSTOM_PASSWORD_RESET_TIMEOUT * 1000 + 2000)
  await t.throwsAsync(async () => {
    await resetClient.query(Call('reset_password', 'newpassword'))
  }, { instanceOf: fauna.errors.Unauthorized })
})

test(path.basename(__filename) + ': When passwords become unusable we can still ask a new password reset token', async t => {
  t.plan(1)
  const client = t.context.databaseClients.childClient
  await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  await delay(CUSTOM_PASSWORD_RESET_TIMEOUT * 1000 + 2000)
  // ask new token.
  const resetResult = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient = getClient(fauna, resetResult.secret)
  await resetClient.query(Call('reset_password', 'newpassword'))
  const idRes = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes, true)
})

test(path.basename(__filename) + ': Only one reset token per account exists', async t => {
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const resetResult = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient = getClient(fauna, resetResult.secret)

  let tokenCount = await client.query(Count(Tokens()))
  t.is(tokenCount, 1)
  const resetResult2 = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient2 = getClient(fauna, resetResult2.secret)

  tokenCount = await client.query(Count(Tokens()))
  t.is(tokenCount, 1)
  await t.throwsAsync(async () => {
    await resetClient.query(Call('reset_password', 'newpassword'))
  }, { instanceOf: fauna.errors.Unauthorized })

  await resetClient2.query(Call('reset_password', 'newpassword2'))
  const idRes1 = await client.query(Identify(t.context.accountRef, 'newpassword2'))
  t.is(idRes1, true)
})

test(path.basename(__filename) + ': A password reset token can only be used once', async t => {
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const resetResult = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
  const resetClient = getClient(fauna, resetResult.secret)
  await resetClient.query(Call('reset_password', 'newpassword'))

  await t.throwsAsync(async () => {
    await resetClient.query(Call('reset_password', 'newpassword2'))
  }, { instanceOf: fauna.errors.Unauthorized })
  const idRes1 = await client.query(Identify(t.context.accountRef, 'newpassword'))
  t.is(idRes1, true)
})
