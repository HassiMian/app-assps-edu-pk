#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { validateReviewBundle } = require('../services/papers/paperIndependentReviewIntakeV6G4')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/validate-independent-review-v6g8.js <review-bundle.json> [forbidden-reviewer-id ...]')
  process.exit(2)
}
const resolved = path.resolve(file)
let bundle
try { bundle = JSON.parse(fs.readFileSync(resolved,'utf8')) }
catch (err) { console.error(`REVIEW_BUNDLE_READ_FAILED: ${err.message}`); process.exit(2) }
const forbidReviewerIds = process.argv.slice(3)
const result = validateReviewBundle(bundle,{grade:9,subject:'Biology',forbidReviewerIds})
console.log(JSON.stringify({file:resolved,...result},null,2))
process.exit(result.valid ? 0 : 3)
