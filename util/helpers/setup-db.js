import path from 'path'
import fs from 'fs'
import shell from 'shelljs'

const fullPath = path.resolve(process.cwd(), '.env.' + process.env.NODE_ENV)
const config = require('dotenv').config({ path: fullPath })

export const populateDatabaseSchemaFromFiles = async (schemaMigrate, q, childClient, paths) => {
  const snippets = await schemaMigrate.getSnippetsFromPaths(paths)
  const emptySnippets = schemaMigrate.getSnippetsFromStrings([])
  const diff = schemaMigrate.diffSnippets(emptySnippets, snippets)
  const migrations = schemaMigrate.generateMigrations(diff)
  const letObj = schemaMigrate.generateMigrationLetObject(migrations)
  const query = q.Let(letObj, true)
  return await childClient.query(query)
}

export const loadApplicationFile = async (file) => {
  return fs.readFileSync(
    path.join(process.cwd(), file), 'utf8'
  )
}

export const deleteMigrationDir = async () => {
  shell.rm('-rf', './fauna/temp')
}

// set up a child database for testing, we pass in the fauna
// library since else this reusable file will use a different fauna library
// which stops of to verify whether errors are instances of fauna errors.
export const setupTestDatabase = async (fauna, testName) => {
  const { CreateKey, CreateDatabase, Select, Do, If, Exists, Delete, Database } = fauna.query
  // Seems dotenv is not loading properly although the env file is parsed correctly.
  const client = getClient(fauna, process.env.FAUNA_ADMIN_KEY || config.parsed.FAUNA_ADMIN_KEY)
  const key = await client.query(
    Do(
      If(
        Exists(Database(testName)),
        Delete(Database(testName)),
        true
      ),
      CreateKey({
        database: Select(['ref'], CreateDatabase({ name: testName })),
        role: 'admin'
      })
    ))

  const childDbClient = getClient(fauna, key.secret)
  return { parentClient: client, childClient: childDbClient }
}

export const destroyTestDatabase = async (q, testName, parentClient) => {
  const { Do, If, Exists, Delete, Database } = q
  await parentClient.query(
    Do(
      cleanUpChildDbKeys(q, testName),
      If(
        Exists(Database(testName)),
        Delete(Database(testName)),
        true
      )
    )
  )
}

export const cleanUpChildDbKeys = (q, testName) => {
  const {
    Select, If, Delete, Paginate, Keys, ContainsField, Let, Var,
    Lambda, Get, Foreach, And, Equals
  } = q
  return Foreach(
    Paginate(Keys(), { size: 100000 }),
    Lambda(['k'], Let(
      {
        key: Get(Var('k'))
      },
      If(
        // Delete all keys that belong to child databases.
        And(ContainsField('database', Var('key')),
          Equals(Select(['database', 'id'], Var('key')), testName)),
        Delete(Select(['ref'], Var('key'))),
        false
      )))
  )
}

export const getClient = (fauna, secret) => {
  const opts = { secret: secret }
  if (process.env.FAUNADB_DOMAIN) opts.domain = process.env.FAUNADB_DOMAIN
  if (process.env.FAUNADB_SCHEME) opts.scheme = process.env.FAUNADB_SCHEME
  const client = new fauna.Client(opts)
  return client
}
