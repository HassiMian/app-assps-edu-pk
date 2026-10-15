const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
 path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/examination/MarksSheet.jsx'), 'utf8')

test('refresh only clears prior loaded marks after successful exam-list refresh', () => {
 const match=source.match(/const refreshData = async \(\) => \{([\s\S]*?)\n \}/)
 assert.ok(match,'refreshData must exist')
 assert.match(match[1],/const refreshed = await loadExams\(\)/)
 assert.match(match[1],/if \(refreshed\) resetRoster\(\)/)
 assert.doesNotMatch(match[1],/setMarks\(\{\}\)|setSavedMarks\(\{\}\)/)
})

test('incomplete saved marks read blocks writes without clearing same-scope marks or unsaved edits', () => {
 const begin=source.indexOf('const searchStudents = async')
 const end=source.indexOf('const updateMark',begin)
 assert.ok(begin>=0&&end>begin,'search scope must exist')
 const body=source.slice(begin,end)
 assert.match(body,/setMarksLoaded\(false\)/)
 const failed=body.match(/catch \(err\) \{\s*if \(request !== rosterFetchSeq.current\) return([\s\S]*?)\n \}/)
 assert.ok(failed, 'asynchronous saved marks failure catch must exist')
 assert.match(failed[1],/unsaved edits were preserved/)
 assert.doesNotMatch(failed[1],/setMarks\(\{\}\)|setSavedMarks\(\{\}\)|setEditedMarks\(\{\}\)/)
 const startFetch=body.slice(0,body.indexOf('try {'))
 assert.doesNotMatch(startFetch,/setSavedMarks\(\{\}\)|setMarks\(\{\}\)/)
})
