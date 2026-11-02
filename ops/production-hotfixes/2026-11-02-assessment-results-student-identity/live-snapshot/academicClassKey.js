'use strict'
// Only an independently known spelling alias. Nine and Pre Nine remain distinct.
const normalizeClassKey = value => {
  const key=String(value??'').trim().toLocaleLowerCase('en').replace(/\s+/g,' ')
  return key==='pre-nine' ? 'pre nine' : key
}
// expression must be a source-code-owned SQL column/expression, never user text.
const sqlCanonicalClass = expression =>
  `(CASE WHEN LOWER(BTRIM(${expression}))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(${expression})) END)`
module.exports={normalizeClassKey,sqlCanonicalClass}
