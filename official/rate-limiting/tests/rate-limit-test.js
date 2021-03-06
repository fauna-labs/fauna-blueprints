import test from 'ava'
import path from 'path'
import fauna, { Get } from 'faunadb'
import { populateDatabaseSchemaFromFiles, destroyTestDatabase, setupTestDatabase, getClient } from '../../../util/helpers/setup-db'
import * as schemaMigrate from 'fauna-schema-migrate'
import { delay } from './helpers/_delay'
const q = fauna.query
const { Call, Do, Add, CurrentIdentity, Create, Collection, Tokens, Lambda, Paginate, Documents } = q

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
    'fauna/resources/functions/rate-limit.js',
    'fauna/resources/indexes/access-logs-by-action-and-identity-ordered-by-ts.fql',
    // A few functions that use the ratelimiting
    'tests/resources/_email-ratelimited-add.fql',
    'tests/resources/_users.fql',
    'tests/resources/_users-role.fql'
  ])

  t.context.testUserRef1 = (await client.query(Create(Collection('users'), { data: { name: 'Brecht' } }))).ref
  t.context.testUserRef2 = (await client.query(Create(Collection('users'), { data: { name: 'John' } }))).ref
})

test.afterEach.always(async (t) => {
  // Destroy the child database to clean up (using the parentClient)
  await destroyTestDatabase(fauna.query, t.context.testName, t.context.databaseClients.parentClient)
})

test(path.basename(__filename) + ': you can only call the same rate limiting call 3 times in the given timeframe', async t => {
  // define the amount of tests
  t.plan(6)
  const client = t.context.databaseClients.childClient

  const res1 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  const res2 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  const res3 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  t.is(res1, 4)
  t.is(res2, 4)
  t.is(res3, 4)
  try {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_RATE_LIMIT')
  }
  // it works fine for another identifier
  const res4 = await client.query(Do(Call('rate_limit', 'add', 'otheridentifier', 3, 1000), Add(2, 2)))
  t.is(res4, 4)

  // Waiting will make it available again.
  await delay(1000)
  await t.notThrowsAsync(async () => {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  })
})

test(path.basename(__filename) + ': ratelimiting is handled correctly when there are old ratelimit logs', async t => {
  // define the amount of tests
  t.plan(2)
  const client = t.context.databaseClients.childClient

  await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  await delay(1000)

  await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))

  try {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_RATE_LIMIT')
  }
  try {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_RATE_LIMIT')
  }
})

test(path.basename(__filename) + ': ratelimit successfully reduces the amount of calls. ', async t => {
  // define the amount of tests
  t.plan(7)
  const client = t.context.databaseClients.childClient

  const res1 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  const res2 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  const res3 = await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  t.is(res1, 4)
  t.is(res2, 4)
  t.is(res3, 4)
  try {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].description, 'ERROR_RATE_LIMIT')
  }
  // it works fine for another action
  const res4 = await client.query(Do(Call('rate_limit', 'add2', 'brecht@test.com', 3, 1000), Add(2, 2)))
  t.is(res4, 4)
  // it works fine for another identifier
  const res5 = await client.query(Do(Call('rate_limit', 'add', 'otheridentifier', 3, 1000), Add(2, 2)))
  t.is(res5, 4)

  // Waiting will make it available again.
  await delay(1000)
  await t.notThrowsAsync(async () => {
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
    await client.query(Do(Call('rate_limit', 'add', 'brecht@test.com', 3, 1000), Add(2, 2)))
  })
})

test(path.basename(__filename) + ': you can also use it inside another UDF', async t => {
  // define the amount of tests
  t.plan(4)
  const client = t.context.databaseClients.childClient

  // take a lok at ../resources/_email_ratelimited_add.fql
  // email_ratelimited_add is function that uses the rate limiting on a hardcoded email.
  // This could, for example, be used to limit the amount of login attempts for a given email.
  const res1 = await client.query(Call('email_ratelimited_add'))
  const res2 = await client.query(Call('email_ratelimited_add'))
  const res3 = await client.query(Call('email_ratelimited_add'))
  t.is(res1, 4)
  t.is(res2, 4)
  t.is(res3, 4)

  try {
    await client.query(Call('email_ratelimited_add'))
  } catch (err) {
    t.is(err.requestResult.responseContent.errors[0].cause[0].cause[0].description, 'ERROR_RATE_LIMIT')
  }
  await delay(1000)
})

test(path.basename(__filename) + ': ratelimiting reduces the cost of read operations', async t => {
  // define the amount of tests
  t.plan(4)
  const client = t.context.databaseClients.childClient
  const token1 = await client.query(Create(Tokens(), { instance: t.context.testUserRef1 }))
  let i = 0
  const loggedInClient1 = getClient(fauna, token1.secret, (result) => {
    const readOps = parseInt(result.responseHeaders['x-byte-read-ops'])
    if (i === 0) {
      // The amount of read ops is not correct atm, should be > 10 and > 0
      t.is(readOps, 9)
    } else if (i === 1) {
      t.is(readOps, 9)
    } else if (i === 2) {
      t.is(readOps, 0)
    }
    i = i + 1
  })

  // Get some data to increase read ops, create 10 Johns.
  await client.query(Do(
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } }),
    Create(Collection('users'), { data: { name: 'John' } })
  ))

  const GetUsers = q.Map(Paginate(Documents(Collection('users'))), Lambda(x => Get(x)))
  await loggedInClient1.query(Do(Call('rate_limit', 'get_users', CurrentIdentity(), 2, 1000), GetUsers))
  await loggedInClient1.query(Do(Call('rate_limit', 'get_users', CurrentIdentity(), 2, 1000), GetUsers))
  await t.throwsAsync(async () => {
    await loggedInClient1.query(Do(Call('rate_limit', 'get_users', CurrentIdentity(), 2, 1000), GetUsers))
  })
  // wait for observer messages to arrive.
  await delay(1000)
})
