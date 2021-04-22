import test from 'ava'
import path from 'path'
import fauna from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
const q = fauna.query
const { Call, Do, Add, Let, If, Equals, Var, Documents, Collection, Get, Lambda, Paginate } = q

// DISCLAIMER
// In theory this test can fail since the index uses is not serializable.
// Not serializable is the right choice for this though since else there could be contention on
// rate-limiting implementations that are not scoped to a narrow action or user.
//
// This becomes relevant in case you have set rate-limiting relatively high and:
// - many calls would happen from one user on the same action
// - the action/identity is not narrowly scoped (e.g. a 'register' action with a string 'public' as identity).
// Setting the index to serializability: false will remove the reads from the Optimistic Concurrency Check
// which means reads might see outdated data. For rate-limiting it's generally fine if someone is able to do
// one or two more calls than originally intended.

let index = 0
test.beforeEach(async (t) => {
  // Set up the child database and retrieve both a fauna Client
  // to query the database as parent database.
  t.context.testName = path.basename(__filename) + (index = ++index)
  t.context.databaseClients = await setupTestDatabase(fauna, t.context.testName)
  const client = t.context.databaseClients.childClient
  await populateDatabaseSchemaFromFiles(schemaMigrate, fauna.query, client, [
    'fauna/resources/collections/access-logs.fql',
    'fauna/resources/functions/call-limit.js',
    'fauna/resources/functions/reset-logs.fql',
    'fauna/resources/indexes/access-logs-by-action-and-identity-ordered-by-ts.fql'
  ])
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': you can only call the same rate limiting call 3 times in the given timeframe', async t => {
  // define the amount of tests
  t.plan(6)
  const client = t.context.databaseClients.childClient

  const res1 = await client.query(Do(Call('call_limit', 'add', 'brecht@test.com', 3), Add(2, 2)))
  const res2 = await client.query(Do(Call('call_limit', 'add', 'brecht@test.com', 3), Add(2, 2)))
  const res3 = await client.query(Do(Call('call_limit', 'add', 'brecht@test.com', 3), Add(2, 2)))
  t.is(res1, 4)
  t.is(res2, 4)
  t.is(res3, 4)

  try {
    await client.query(Do(Call('call_limit', 'add', 'brecht@test.com', 3), Add(2, 2)))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_CALL_LIMIT')
  }
  // it works fine for another identifier
  const res4 = await client.query(Do(Call('call_limit', 'add', 'otheridentifier', 3), Add(2, 2)))
  t.is(res4, 4)

  // Waiting will not make it available again in contrary to rate-limiting but we can reset it!
  await client.query(Call('reset_logs', 'add', 'brecht@test.com'))
  const res5 = await client.query(Do(Call('call_limit', 'add', 'brecht@test.com', 3), Add(2, 2)))
  t.is(res5, 4)
})

test(path.basename(__filename) + ': simulating fake logins, successful logins create no logs', async t => {
  // define the amount of tests
  t.plan(1)
  const client = t.context.databaseClients.childClient

  await client.query(
    Let({ loginResult: { something: 'something' } },
      If(
        Equals(Var('loginResult'), false),
        Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
        // clear previous fails and login.
        Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
      )
    )
  )

  const logs = await client.query(q.Map(Paginate(Documents(Collection('access_logs'))), Lambda(x => Get(x))))
  t.is(logs.data.length, 0)
})

test(path.basename(__filename) + ': simulating fake logins, bad logins create logs, after x attempts, we are blocked', async t => {
  // define the amount of tests
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const failedFakeLoginQuery = Let({ loginResult: false },
    If(
      Equals(Var('loginResult'), false),
      Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
      // clear previous fails and login.
      Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
    )
  )
  await client.query(failedFakeLoginQuery)
  const logs = await client.query(q.Map(Paginate(Documents(Collection('access_logs'))), Lambda(x => Get(x))))
  t.is(logs.data.length, 1)

  await client.query(failedFakeLoginQuery)
  await client.query(failedFakeLoginQuery)

  try {
    await client.query(failedFakeLoginQuery)
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_CALL_LIMIT')
  }
})

test(path.basename(__filename) + ': simulating fake logins, successful logins clean up logs', async t => {
  // define the amount of tests
  t.plan(2)
  const client = t.context.databaseClients.childClient
  const failedFakeLoginQuery = Let({ loginResult: false },
    If(
      Equals(Var('loginResult'), false),
      Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
      // clear previous fails and login.
      Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
    )
  )
  await client.query(failedFakeLoginQuery)
  const logs = await client.query(q.Map(Paginate(Documents(Collection('access_logs'))), Lambda(x => Get(x))))
  t.is(logs.data.length, 1)

  await client.query(
    Let({ loginResult: { something: 'something' } },
      If(
        Equals(Var('loginResult'), false),
        Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
        // clear previous fails and login.
        Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
      )
    )
  )

  const logs2 = await client.query(q.Map(Paginate(Documents(Collection('access_logs'))), Lambda(x => Get(x))))
  t.is(logs2.data.length, 0)
})
