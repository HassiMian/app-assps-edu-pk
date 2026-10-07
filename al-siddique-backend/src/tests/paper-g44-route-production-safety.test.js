const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const routePath = path.resolve(__dirname, '../routes/paperRoute.js')
const migratePath = path.resolve(__dirname, '../config/migrate.js')
const migrationPath = path.resolve(__dirname, '../../migrations/020_paper_vault_schema.js')
const route = fs.readFileSync(routePath, 'utf8')
const migrate = fs.readFileSync(migratePath, 'utf8')
const migration = fs.readFileSync(migrationPath, 'utf8')

test('G44 paper route performs no runtime schema DDL', () => {
  assert.doesNotMatch(route, /CREATE\s+TABLE|CREATE\s+INDEX|ALTER\s+TABLE/i)
  assert.doesNotMatch(route, /ensurePaperVaultSchema/)
})

test('G44 paper upload filename uses cryptographically secure randomness', () => {
  assert.match(route, /require\('crypto'\)/)
  assert.match(route, /randomUUID\(\)/)
  assert.doesNotMatch(route, /Math\.random\(\)/)
})

test('G44 versioned paper vault migration owns base table and indexes', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS paper_vault/)
  assert.match(migration, /idx_paper_vault_school_updated/)
  assert.match(migration, /idx_paper_vault_owner_updated/)
  assert.match(migration, /idx_paper_vault_class_subject/)
  assert.match(migration, /await client\.query\('BEGIN'\)/)
  assert.match(migration, /await client\.query\('COMMIT'\)/)
})

test('G44 migration runner applies migration 020 fail-closed', () => {
  assert.match(migrate, /require\('\.\.\/\.\.\/migrations\/020_paper_vault_schema'\)/)
  assert.match(migrate, /await paperVaultMigration\.up\(\)/)
  assert.match(migrate, /Paper Vault Schema Migration Error/)
})
