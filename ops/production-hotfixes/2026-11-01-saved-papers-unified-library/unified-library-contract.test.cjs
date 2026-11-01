'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'source/UnifiedSavedAssessmentSection.jsx'),'utf8')
const panelPatch=fs.readFileSync(path.join(__dirname,'SavedPaperLibraryPanel.jsx.patch'),'utf8')
test('assessment and vault remain separate trusted sources',()=>{
 assert.match(source,/api\.get\('\/portal\/paper-studio\/library'/)
 assert.match(source,/p\?\.source === 'assessment-studio'/)
 assert.match(source,/revisionAvailable === true/)
})
test('assessment collection never submits mutation requests',()=>{
 assert.doesNotMatch(source,/\bapi\.(?:post|patch|put|delete)\(/)
 assert.match(source,/api\.get\('\/assessment-studio\/papers\/'/)
})
test('auth epoch invalidates stale authorized responses',()=>{
 assert.match(source,/useRef\(0\)/)
 assert.match(source,/epoch\.current !== token/)
})
test('saved-paper panel adds an independent Assessment Studio section',()=>{
 assert.match(panelPatch,/UnifiedSavedAssessmentSection/)
 assert.match(panelPatch,/sourceFilter === 'all'/)
})
