'use strict';
const assert = require('node:assert/strict');
function validateFrozenComparison(original, latest) {
  for (const d of [original, latest]) {
    if (!Number.isSafeInteger(d.rows) || !Number.isSafeInteger(d.genuineZeros)
        || d.rows < 0 || d.genuineZeros < 0 || d.genuineZeros > d.rows) {
      throw new Error('INVALID_EVIDENCE');
    }
  }
  return {originalHistoricalIntegrity:
      (original.rows === latest.rows && original.genuineZeros === latest.genuineZeros) ? 'MATCH' : 'HOLD',
    currentOperationalHealth:'INDEPENDENT_CHECK_REQUIRED'};
}
function canonicalClass(s) {
  const x=String(s ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  return x === 'pre-nine' ? 'pre nine' : x;
}
assert.equal(validateFrozenComparison({rows:1853,genuineZeros:224},{rows:1854,genuineZeros:213}).originalHistoricalIntegrity,'HOLD');
assert.equal(validateFrozenComparison({rows:1853,genuineZeros:224},{rows:1853,genuineZeros:224}).originalHistoricalIntegrity,'MATCH');
assert.equal(canonicalClass('Pre-Nine'),canonicalClass('Pre Nine'));
assert.notEqual(canonicalClass('Pre-Nine'),canonicalClass('Nine'));
assert.throws(()=>validateFrozenComparison({rows:1854,genuineZeros:1855},{rows:1854,genuineZeros:213}),/INVALID_EVIDENCE/);
console.log('PASS: history/current health separation, school aliases; no writes');
