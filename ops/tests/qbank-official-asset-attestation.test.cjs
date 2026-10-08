const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {MAP,directUrl}=require('../qbank/attest-local-official-sources.cjs')
const ROOT=path.resolve(__dirname,'..','..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
test('attestation candidate mapping is explicit and official-URL backed',()=>{
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8')); const byId=new Map(manifest.entries.map(e=>[e.recordId,e]))
 assert.equal(Object.keys(MAP).length,12)
 for(const [rid,rel] of Object.entries(MAP)){
   const e=byId.get(rid); assert.ok(e,`missing ${rid}`)
   assert.ok(e.catalogAssetUrl||e.pdfUrl,`official URL missing ${rid}`)
   assert.match(directUrl(e.catalogAssetUrl||e.pdfUrl),/^https:\/\//)
   assert.ok(rel.endsWith('.pdf'))
 }
})
