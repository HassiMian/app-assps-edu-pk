'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path')
const mod=require('../qbank/verify-grade910-school-review-envelope.cjs')
const SRC=path.resolve(__dirname,'../qbank/verify-grade910-school-review-envelope.cjs')
test('no school-institution trust root => signed intake returns explicit fail-closed exit 2',()=>{
 const r=cp.spawnSync(process.execPath,[SRC],{
  env:{PATH:process.env.PATH,HOME:process.env.HOME},encoding:'utf8',timeout:15000})
 assert.equal(r.status,2)
 assert.match(r.stderr,/MISSING_OUT_OF_BAND_SCHOOL_AUTHORITY_CONFIGURATION/)
})
test('no repository-local signed school review or trust authority file is accepted',()=>{
 assert.equal(mod.inside(path.resolve(__dirname,'../../docs/question-bank'),path.resolve(__dirname,'../..')),true)
 assert.equal(mod.inside('/tmp/unrelated-signers',path.resolve(__dirname,'../..')),false)
 assert.throws(()=>mod.loadExternal({
  rootPublicKeyFile:path.join(__dirname,'faux-school-public.pem'),
  reviewBundleFile:path.join(__dirname,'faux-school-review-bundle.json'),
  rootFingerprint:'a'.repeat(64),tenantId:'test',at:'2026-10-11T12:00:00Z'
 }),/SCHOOL_AUTHORITY_EVIDENCE_MUST_BE_OUTSIDE_GIT_WORKTREE/)
})
test('no signature packet can be processed without explicit all-six operator inputs',()=>{
 assert.throws(()=>mod.loadExternal({rootPublicKeyFile:'x',reviewBundleFile:'y'}),
 /MISSING_OUT_OF_BAND_SCHOOL_AUTHORITY_CONFIGURATION/)
})
