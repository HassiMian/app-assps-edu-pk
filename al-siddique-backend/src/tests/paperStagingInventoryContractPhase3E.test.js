// No database connection. Ensures staging review remains a read-only, non-autoloaded asset.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const repo=path.resolve(__dirname,'../../..')
const inventory=fs.readFileSync(path.join(repo,'ops/paper-staging-review/schema-inventory-READ-ONLY.sql'),'utf8')
const withoutComments=inventory.replace(/--[^\r\n]*/gu,'').trim()
const statements=withoutComments.split(';').map(s=>s.trim()).filter(Boolean)
test('catalog preflight starts explicitly READ ONLY, bounds timeouts and ends ROLLBACK',()=>{
 assert.equal(statements[0],'BEGIN TRANSACTION READ ONLY')
 assert.ok(statements.some(s=>/SET LOCAL statement_timeout\s*=\s*'5s'/iu.test(s)))
 assert.ok(statements.some(s=>/SET LOCAL lock_timeout\s*=\s*'1s'/iu.test(s)))
 assert.equal(statements.at(-1),'ROLLBACK')
 assert.match(withoutComments,/information_schema\.columns/u)
 assert.match(withoutComments,/pg_catalog\.pg_class/u)
 assert.match(withoutComments,/pg_catalog\.pg_constraint/u)
 assert.match(withoutComments,/pg_catalog\.pg_policies/u)
})
test('preflight cannot mutate DB schema/data or read actual tenant paper content',()=>{
 const allowed=/^(BEGIN TRANSACTION READ ONLY|SET LOCAL|SELECT\s|ROLLBACK$)/iu
 for(const statement of statements)assert.match(statement,allowed)
 assert.doesNotMatch(withoutComments,/\b(CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|COPY|DO|CALL|EXECUTE|GRANT|REVOKE|VACUUM|ANALYZE)\b/iu)
 assert.doesNotMatch(withoutComments,/\b(native_json_text|email|password_hash|students|exam_results)\b/iu)
})
test('dormant staging adapter imports only pure revision policy, NEVER the live pool/migration/router',()=>{
 const adapter=fs.readFileSync(path.join(__dirname,'../services/papers/paperStagingRevisionAdapter.js'),'utf8')
 assert.match(adapter,/require\('\.\/paperRevisionPolicy\.js'\)/u)
 assert.doesNotMatch(adapter,/require\([^)]*(database|migrate|server|routes)/iu)
 for(const entry of ['server.js','app.js','config/migrate.js']){
  const file=path.join(__dirname,'..',entry)
  if(fs.existsSync(file))assert.doesNotMatch(fs.readFileSync(file,'utf8'),
   /paperStagingRevisionAdapter|schema-inventory-READ-ONLY/u)
 }
 const ops=path.join(repo,'ops/paper-staging-review/schema-inventory-READ-ONLY.sql')
 assert.ok(fs.existsSync(ops))
 assert.equal(fs.existsSync(path.join(__dirname,'../config/migrations/paperStagingRevisionAdapter.js')),false)
})
