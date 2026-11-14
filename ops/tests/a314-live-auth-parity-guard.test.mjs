import test from 'node:test'
import assert from 'node:assert/strict'
import {checkParity,deriveReviewedCandidate,sha256} from '../a314-live-auth-parity-guard.mjs'
const live=[
 "res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')",
 'const MAX_LOGIN_ATTEMPTS = 15',
 'function getLoginAttempt(key) {',
 '  const entry = loginAttempts.get(key)',
 '  if (!entry) return { count: 0, blockedUntil: 0 }',
 '  return entry',
 '}',
 'function recordLoginFailure(key) {',
 '  const next = {',
 '    blockedUntil: current.count + 1 >= MAX_LOGIN_ATTEMPTS ? Date.now() + BLOCK_DURATION_MS : current.blockedUntil,',
 '  }',
 '}'
].join('\n')
const candidate=deriveReviewedCandidate(live)
const hashes={baselineSha:sha256(live),candidateSha:sha256(candidate)}
test('reviewed targeted source change is accepted',()=>{
 const result=checkParity(live,candidate,hashes)
 assert.equal(result.passed,true,JSON.stringify(result.problems))
})
test('changing the production attempt policy is forbidden',()=>{
 const changed=candidate.replace('MAX_LOGIN_ATTEMPTS = 15','MAX_LOGIN_ATTEMPTS = 5')
 const report=checkParity(live,changed,{...hashes,candidateSha:sha256(changed)})
 assert.equal(report.passed,false)
 assert.match(report.problems.join(' '),/15-attempt/)
})
test('unreviewed extra changes fail even with the checksum updated',()=>{
 const changed=candidate+'// unauthorized cutover change\n'
 const report=checkParity(live,changed,{...hashes,candidateSha:sha256(changed)})
 assert.equal(report.passed,false)
 assert.match(report.problems.join(' '),/beyond audited TTL/)
})
test('a different live source checksum blocks blind patching',()=>{
 const report=checkParity(live,candidate,{...hashes,baselineSha:'0'.repeat(64)})
 assert.equal(report.passed,false)
 assert.match(report.problems.join(' '),/checksum drift/)
})
