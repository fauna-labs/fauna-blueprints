import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'

const q = fauna.query
const { Call, Do, Create, Collection, Count, Documents } = q

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
    'fauna/resources/functions/validate-email.fql',
    'fauna/resources/functions/validate-password.fql',
    'tests/resources/accounts.fql'
  ])
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  // await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': validate email aborts the entire query when the email is not conform to the regex', async t => {
  const client = t.context.databaseClients.childClient

  t.plan(4)
  const email = 'brecht@brechtsdomain.com'
  const result = await client.query(Do(
    Call('validate_email', email),
    Create(Collection('accounts'), { data: { email: email } }))
  )
  t.truthy(result.ref)
  const emailfake = 'Im not an email'
  const count1 = await client.query(Count(Documents(Collection('accounts'))))
  t.is(count1, 1)

  await t.throwsAsync(async () => {
    await client.query(Do(
      Call('validate_email', emailfake),
      Create(Collection('accounts'), { data: { email: emailfake } }))
    )
  }, { instanceOf: Error })

  const count2 = await client.query(Count(Documents(Collection('accounts'))))
  t.is(count2, 1)
})

test(path.basename(__filename) + ': validate password aborts the entire query when the password is not long enough', async t => {
  const client = t.context.databaseClients.childClient

  t.plan(4)
  const password = 'testtest'
  const result = await client.query(Do(
    Call('validate_password', password),
    Create(Collection('accounts'), { credentials: { password: password } }))
  )
  t.truthy(result.ref)
  const passwordTooShort = 'test'
  const count1 = await client.query(Count(Documents(Collection('accounts'))))
  t.is(count1, 1)

  await t.throwsAsync(async () => {
    await client.query(Do(
      Call('validate_password', passwordTooShort),
      Create(Collection('accounts'), { credentials: { password: password } }))
    )
  }, { instanceOf: Error })

  const count2 = await client.query(Count(Documents(Collection('accounts'))))
  t.is(count2, 1)
})
