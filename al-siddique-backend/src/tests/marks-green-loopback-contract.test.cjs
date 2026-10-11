'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const {join}=require('node:path')
const source=readFileSync(join(__dirname,'../server.js'),'utf8')
test('signed marks green always binds localhost, while old production bind unchanged',()=>{
 assert.match(source,/const BIND_HOST = process\.env\.DB_SIGNED_TENANT_RLS_ENABLED === 'true' \? '127\.0\.0\.1' : '0\.0\.0\.0'/)
 assert.match(source,/app\.listen\(PORT, BIND_HOST/)
})
test('signed green refuses database automigration',()=>{
 assert.match(source,/process\.env\.DB_SIGNED_TENANT_RLS_ENABLED === 'true' && autoMigrate/)
 assert.match(source,/SIGNED_GREEN_AUTO_MIGRATION_REFUSED/)
})
