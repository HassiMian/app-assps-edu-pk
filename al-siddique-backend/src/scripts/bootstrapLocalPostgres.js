#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

const envPath = path.resolve(__dirname, '../.env')
const parsed = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {}
const env = { ...process.env, ...parsed }

function ident(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`)
  }
  return value
}

function literal(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

async function main() {
  const host = env.DB_HOST || 'localhost'
  const port = Number(env.DB_PORT || 5432)
  const database = ident(env.DB_NAME || 'apexos_db')
  const user = ident(env.DB_USER || 'apexos_user')
  const password = env.DB_PASSWORD || ''
  const adminUser = env.PG_ADMIN_USER || 'postgres'
  const adminPassword = env.PG_ADMIN_PASSWORD || 'admin123'

  const adminPool = new Pool({
    host,
    port,
    database: 'postgres',
    user: adminUser,
    password: adminPassword,
  })

  const client = await adminPool.connect()
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${literal(user)}) THEN
          CREATE ROLE ${user} LOGIN PASSWORD ${literal(password)};
        ELSE
          ALTER ROLE ${user} WITH LOGIN PASSWORD ${literal(password)};
        END IF;
      END $$;
    `)

    const existingDb = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    let createdDatabase = false
    if (!existingDb.rowCount) {
      await client.query(`CREATE DATABASE ${database} OWNER ${user}`)
      createdDatabase = true
    }

    console.log(JSON.stringify({
      ok: true,
      host,
      port,
      database,
      user,
      createdDatabase,
    }, null, 2))
  } finally {
    client.release()
    await adminPool.end()
  }
}

main().catch(error => {
  console.error(error.message || error)
  process.exitCode = 1
})
