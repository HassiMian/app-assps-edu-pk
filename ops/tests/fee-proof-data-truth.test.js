const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/fees/FeeModule.jsx'), 'utf8')

test('pending fee proof source failures preserve loaded proofs', () => {
  assert.doesNotMatch(source, /catch\s*\([^)]*\)\s*\{?\s*setProofs\(\[\]\)/)
  assert.match(source, /const \[proofLoadError, setProofLoadError\] = useState\(''\)/)
  assert.match(source, /Pending fee proofs could not be refreshed\. Existing loaded proofs were preserved\./)
})

test('empty proof state is only shown after a successful source load', () => {
  assert.match(source, /!loading && !proofLoadError && proofs\.length === 0/)
})
