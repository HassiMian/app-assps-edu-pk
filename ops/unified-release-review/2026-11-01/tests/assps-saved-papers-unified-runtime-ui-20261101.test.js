'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const release=path.resolve('/var/www/assps-releases/promotion-auth-v2-20261030')
const html=fs.readFileSync(path.join(release,'index.html'),'utf8')
const raw=/<script\s+type="importmap"\s*>(.*?)<\/script>/s.exec(html)
assert.ok(raw,'active importmap required')
const imports=JSON.parse(raw[1]).imports
const file=imports['/assets/SavedPapersTab-Bmh8SBPy.js']
assert.match(file,/^\/assets\/SavedPapersTab-ASSPS-[A-Za-z0-9_.-]+\.js$/)
const code=fs.readFileSync(path.join(release,file),'utf8')
test('visible Saved Papers is the existing authenticated unified server library',()=>{
 assert.match(code,/api\/portal\/paper-studio\/library/)
 assert.match(code,/api\/assessment-studio\/papers/)
 assert.match(code,/api\/portal\/paper-studio\/papers/)
 assert.match(code,/serverOnly:!0/)
})
test('Saved Papers does not treat local storage as exam/paper authoritative',()=>{
 assert.doesNotMatch(code,/localStorage/)
 assert.match(code,/SERVER_REVISION_SOURCE_OF_TRUTH/)
 assert.match(code,/verified editable revision/)
 assert.match(code,/No local empty document/)
})
test('Vault file reopen and source export use server-owned documents',()=>{
 assert.match(code,/loadVaultCopy=async/)
 assert.match(code,/exportVaultSource=async/)
 assert.match(code,/Vault source could not be exported/)
 assert.match(code,/Paper Vault cannot be loaded/)
})
