import path from 'path'
import fs from 'fs'
import * as fauna from 'faunadb'
import * as schemaMigrate from 'fauna-schema-migrate'

const fullPath = path.resolve(process.cwd(), '.env.' + process.env.NODE_ENV)
const config = require('dotenv').config({ path: fullPath })

const q = fauna.query
const { CreateKey, CreateDatabase, Select, Do, If, Exists, Delete, Database } = q

export const populateDatabaseSchemaFromFiles = async (childClient, paths) => {
  const snippets = await schemaMigrate.getSnippetsFromPaths(paths)
  const emptySnippets = schemaMigrate.getSnippetsFromStrings([])
  const diff = schemaMigrate.diffSnippets(emptySnippets, snippets)
  const migrations = schemaMigrate.generateMigrations(diff)
  const letObj = schemaMigrate.generateMigrationLetObject(migrations)
  const query = fauna.query.Let(letObj, true)
  return await childClient.query(query)
}

export const loadApplicationFile = async (file) => {
  return fs.readFileSync(
    path.join(process.cwd(), file), 'utf8'
  )
}

export const setupTestDatabase = async (testName) => {
  // Seems dotenv is not loading properly although the env file is parsed correctly.
  const client = getClient(process.env.FAUNA_ADMIN_KEY || config.parsed.FAUNA_ADMIN_KEY)
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

  const childDbClient = getClient(key.secret)
  return { parentClient: client, childClient: childDbClient }
}

export const destroyTestDatabase = async (testName, parentClient) => {
  await parentClient.query(
    If(
      Exists(Database(testName)),
      Delete(Database(testName)),
      true
    )
  )
}

export const getClient = (secret) => {
  const opts = { secret: secret }
  if (process.env.FAUNADB_DOMAIN) opts.domain = process.env.FAUNADB_DOMAIN
  if (process.env.FAUNADB_SCHEME) opts.scheme = process.env.FAUNADB_SCHEME
  const client = new fauna.Client(opts)
  return client
}
