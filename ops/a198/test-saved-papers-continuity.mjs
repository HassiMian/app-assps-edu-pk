import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const guard=path.join(path.dirname(fileURLToPath(import.meta.url)),'check-saved-papers-continuity.mjs')
test('A198 preserves browser, Vault, assessment server and current routed module',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-a198-'))
 const file=(relative,body)=>{
   const out=path.join(dir,relative)
   fs.mkdirSync(path.dirname(out),{recursive:true})
   fs.writeFileSync(out,body)
   return out
 }
 const start=(args=[])=>spawnSync(process.execPath,[guard,'--root',dir,...args],{encoding:'utf8'})
 try{
   const src='savedPapers usePaperStore serverPaperId revisionAvailable /api/portal/paper-studio/library'
   const server='/api/assessment-studio/papers'
   file('al-siddique-frontend/src/Modules/Paper-Generator/SavedPapersTab.jsx',src)
   file('al-siddique-frontend/src/Modules/Paper-Generator/AssessmentStudio/core/assessmentPersistence.js',server)
   file('al-siddique-frontend/dist/index.html','<script type="importmap">'+JSON.stringify({imports:{'/assets/SavedPapersTab-LEGACY.js':'/assets/SavedPapersTab-A198.js'}})+'</script>')
   const asset='savedPapers /api/assessment-studio/papers /api/portal/paper-studio/library serverOnly revisionAvailable'
   file('al-siddique-frontend/dist/assets/SavedPapersTab-A198.js',asset)
   assert.equal(start().status,0,'All saved paper sources protected')
   assert.equal(start(['--dist']).status,0,'Active module includes all sources')
   file('al-siddique-frontend/dist/assets/SavedPapersTab-A198.js','savedPapers serverOnly')
   assert.equal(start(['--dist']).status,3,'Strip Vault/server access must block release')
   file('al-siddique-frontend/dist/assets/SavedPapersTab-A198.js',asset)
   file('al-siddique-frontend/dist/index.html','<script type="importmap">'+JSON.stringify({imports:{'/assets/SavedPapersTab-LEGACY.js':'/assets/SavedPapersTab-DOES-NOT-EXIST.js'}})+'</script>')
   assert.equal(start(['--dist']).status,3,'Orphaned old asset must not count')
   file('al-siddique-frontend/src/Modules/Paper-Generator/SavedPapersTab.jsx','savedPapers usePaperStore')
   assert.equal(start().status,3,'Legacy local-only source must block release')
   // Modular V5 source is valid: the tab owns local papers and the imported
   // companion panels own authenticated Vault and Assessment Studio fetches.
   file('al-siddique-frontend/src/Modules/Paper-Generator/AssessmentStudio/SavedPapersV5Panels.jsx',
     '/api/assessment-studio/papers /api/portal/paper-studio/library')
   file('al-siddique-frontend/src/Modules/Paper-Generator/AssessmentStudio/core/liveSavedPapersV5.mjs',
     'serverPaperId revisionAvailable')
   assert.equal(start().status,0,'Modular source must pass without flattening components')
   file('al-siddique-frontend/src/Modules/Paper-Generator/AssessmentStudio/SavedPapersV5Panels.jsx','local-only')
   assert.equal(start().status,3,'Removing server and Vault from modular source must block release')
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
