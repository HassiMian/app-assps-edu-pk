const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

function source(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf8')
}

test('library refresh failures preserve loaded inventory', () => {
  const s = source('al-siddique-frontend/src/Modules/Library.jsx')
  const block = s.match(/Failed to load library inventory[\s\S]{0,260}?finally/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setBooks\(\[\]\)/)
  assert.match(block, /Existing loaded inventory was preserved/)
})

test('transport refresh failures preserve loaded routes', () => {
  const s = source('al-siddique-frontend/src/Modules/Transport.jsx')
  const block = s.match(/Failed to load transport routes[\s\S]{0,260}?finally/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setRoutes\(\[\]\)/)
  assert.match(block, /Existing loaded routes were preserved/)
})

test('expense source failure is distinct from a verified zero total', () => {
  const s = source('al-siddique-frontend/src/Modules/Expenses.jsx')
  const block = s.match(/Failed to load expenses[\s\S]{0,320}?finally/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setExpenses\(\[\]\)/)
  assert.match(s, /loadError && expenses\.length === 0 \? 'Unavailable'/)
  assert.match(s, /Expense data is temporarily unavailable\./)
})

test('family refresh failures preserve loaded families and expose source availability', () => {
  const store = source('al-siddique-frontend/src/services/useFamilyStore.js')
  const module = source('al-siddique-frontend/src/Modules/families/FamilyModule.jsx')
  const failure = store.match(/catch \(err\) \{[\s\S]{0,260}?Existing loaded families were preserved\.[\s\S]{0,120}?finally/)?.[0] || ''
  assert.ok(failure)
  assert.doesNotMatch(failure, /setFamilies\(\[\]\)/)
  assert.match(module, /loading: familiesLoading, error: familyError/)
  assert.match(module, /familyError && families\.length === 0/)
  assert.match(module, /Family data is temporarily unavailable\./)
})

test('dashboard refresh failures preserve last-known-good core data', () => {
  const s = source('al-siddique-frontend/src/pages/Dashboard.jsx')
  const block = s.match(/Dashboard fetch error[\s\S]{0,360}?finally/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setStats\(null\)|setStudents\(\[\]\)|setClassData\(\[\]\)/)
  assert.match(block, /Existing loaded dashboard data was preserved/)
})

test('date sheet sync failures preserve loaded server state instead of fabricating an empty sheet', () => {
  const s = source('al-siddique-frontend/src/Modules/DateSheet.jsx')
  const block = s.match(/Date sheet server sync failed[\s\S]{0,520}?\n\s*}\n\s*}/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setSheets\(\[\]\)|loadDateSheet\([^\n]*\[\]\)/)
  assert.match(block, /Existing loaded date sheet data was preserved/)
})
