const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '../..')
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

test('exam result batching bounds explicit exam ids and removes the generic 500-row cap for an explicit batch', () => {
  const source = read('al-siddique-backend/src/routes/examRoutes.js')
  assert.match(source, /exam_ids must contain between 1 and 100 valid exam IDs\./)
  assert.match(source, /er\.exam_id = ANY\(\$\$\{idx\+\+\}::int\[\]\)/)
  assert.match(source, /if \(!explicitExamIds\.length\) sql \+= ` LIMIT 500`/)
})

test('Paper Vault fails closed until migration 020 has initialized the required schema', () => {
  const route = read('al-siddique-backend/src/routes/paperRoute.js')
  const migrate = read('al-siddique-backend/src/config/migrate.js')
  assert.match(route, /PAPER_VAULT_SCHEMA_NOT_READY/)
  assert.match(route, /to_regclass\('public\.paper_vault'\)/)
  assert.equal((route.match(/await ensurePaperVaultSchema\(\)/g) || []).length, 4)
  assert.ok((route.match(/const status = Number\(err\.status\) \|\| 500/g) || []).length >= 2)
  assert.ok((route.match(/code: err\.code \|\| undefined/g) || []).length >= 2)
  assert.match(migrate, /\.\.\/\.\.\/migrations\/020_paper_vault_schema/)
})
