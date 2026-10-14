'use strict'
const fs=require('node:fs'),test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/PTSPaperGenerator.jsx'),'utf8')
test('canonical PTS QuestionPanel visibly links separate signed approved-only source',()=>{
 assert.match(source,/data-grade910-approved-only-workspace-handoff/)
 assert.match(source,/href="\/academic\/grade910-verified-picker"/)
 assert.match(source,/not automatically academically approved/)
})
test('handoff does not silently merge an unverified manifest or override print/save functions',()=>{
 const snippet=source.slice(source.indexOf('data-grade910-approved-only-workspace-handoff')-7,source.indexOf('data-paper-controls'))
 assert.doesNotMatch(snippet,/savePaper\(|doPrint\(|localStorage\.setItem|isApproved\s*:\s*true/)
})
