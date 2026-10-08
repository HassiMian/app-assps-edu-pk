const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {eligible}=require('../qbank/recover-unhashed-official-sources.cjs')
const ROOT=path.resolve(__dirname,'../..')

test('unhashed recovery accepts only unique official-page anchors',()=>{
  assert.equal(eligible({pdfSha256:null,catalogLinkStatus:'OFFICIAL_PAGE_ANCHOR_FOUND',catalogLinkMatchCount:1,catalogAssetUrl:'https://example.invalid/a.pdf'}),true)
  assert.equal(eligible({pdfSha256:'a'.repeat(64),catalogLinkStatus:'OFFICIAL_PAGE_ANCHOR_FOUND',catalogLinkMatchCount:1,catalogAssetUrl:'https://example.invalid/a.pdf'}),false)
  assert.equal(eligible({pdfSha256:null,catalogLinkStatus:'AMBIGUOUS_REPEATED_LABEL',catalogLinkMatchCount:7,catalogAssetUrl:null}),false)
  assert.equal(eligible({pdfSha256:null,catalogLinkStatus:'OFFICIAL_PAGE_ANCHOR_FOUND',catalogLinkMatchCount:2,catalogAssetUrl:'https://example.invalid/a.pdf'}),false)
})

test('current unresolved source queue never auto-resolves ambiguous Tarjuma rows',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'),'utf8'))
  const rows=manifest.entries.filter(eligible)
  assert.ok(rows.every(e=>e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND'&&Number(e.catalogLinkMatchCount)===1&&!e.pdfSha256))
  assert.ok(!rows.some(e=>['pectaa-catalog-001','pectaa-catalog-014'].includes(e.recordId)))
})
