'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const database=fs.readFileSync(path.join(root,'config/database.js'),'utf8')
const policy=fs.readFileSync(path.join(root,'../ops/rls/archv1-paper-signed-tenant-clone.sql'),'utf8')

test('every signed PostgreSQL Paper table is blocked from unsigned pooled SQL',()=>{
 const js=database.match(/const PROTECTED_PAPER_RELATIONS\s*=\s*\/\\b\(\?:(.*?)\)\\b\/i/s)
 const pg=policy.match(/FOR tab IN SELECT unnest\(ARRAY\[(.*?)\]\) LOOP/s)
 assert.ok(js&&pg)
 const checked=new Set(js[1].split('|'))
 const signed=new Set([...pg[1].matchAll(/'([a-z_]+)'/g)].map(match=>match[1]))
 assert.deepEqual([...checked].sort(),[...signed].sort())
 assert.equal(checked.size,26)
})
test('signed school context includes transaction ID and actor binding',()=>{
 assert.match(database,/txid_current\(\)::text AS xid/)
 assert.match(database,/\$\{actorId\}\|\$\{actorRole\}/)
 assert.match(policy,/\| txid_current\(\)::text/)
 assert.match(policy,/current_setting\('app.paper_actor_role'/)
})
