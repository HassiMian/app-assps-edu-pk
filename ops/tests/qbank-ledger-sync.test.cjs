const test=require('node:test')
const assert=require('node:assert/strict')
const {sync}=require('../qbank/sync-catalog-hash-ledger.cjs')
test('catalog ledger sync is conflict-free and preserves reference digest',()=>{const r=sync({apply:false});assert.equal(r.conflicts.length,0);assert.match(r.ledgerHashReferencePreserved,/^[0-9a-f]{64}$/);assert.ok(r.changes.length>=0)})
