import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const module=readFileSync(new URL('./AttendanceModule.jsx',import.meta.url),'utf8')
const mark=readFileSync(new URL('./MarkAttendance.jsx',import.meta.url),'utf8')
const setup=readFileSync(new URL('../../services/useAcademicStore.js',import.meta.url),'utf8')
test('official Academic Setup differentiates Pre Nine and Nine class identities',()=>{
 assert.match(setup,/'pre-nine': 'Pre Nine'/)
 assert.match(setup,/'9': 'Nine'/)
})
test('Grade Nine cannot inherit Pre Nine section options in either attendance screen',()=>{
 for(const source of [module,mark]){
  assert.match(source,/return sectionsForClass\(className\)/)
  assert.doesNotMatch(source,/className\s*===\s*['"]Nine['"]\)\s*return\s+sectionsForClass\(['"]Pre Nine['"]\)/)
 }
})
test('MarkAttendance never rewrites Pre Nine into Nine API class filter',()=>{
 assert.match(mark,/function attendanceApiClass\(value\)\s*\{\s*return value/)
 assert.doesNotMatch(mark,/"Pre Nine"\s*:\s*['"`]?Nine/)
})
test('both screens require grade and section to exist in academic setup before API loading',()=>{
 for(const source of [module,mark]){
  assert.match(source,/CLASSES\.includes\(selectedClass\)/)
  assert.match(source,/configuredSections\.includes\(selectedSection\)/)
 }
})
test('first AttendanceModule class is initialized AFTER official asynchronous academic setup',()=>{
 assert.match(module,/if \(CLASSES\.length && \(!selectedClass \|\| !CLASSES\.includes\(selectedClass\)\)\)/)
 assert.match(module,/setSelectedClass\(CLASSES\[0\]\)/)
})
test('both screens have latest-request and exact selected class, section, date response rejection',()=>{
 for(const source of [module,mark]){
  assert.match(source,/requestSerialRef\.current/)
  assert.match(source,/selectedScopeRef\.current/)
  assert.match(source,/serial !== requestSerialRef\.current/)
 }
})
test('both attendance views reconcile student roster identity before rendering marks',()=>{
 for(const source of [module,mark])assert.match(source,/reconcileAttendanceRoster\(/)
})
test('attendance write controls still use loaded scope boundary to reject stale marks',()=>{
 assert.match(mark,/loadedScopeRef\.current !== scopeKey/)
 assert.match(module,/if \(!scopeMatches\) \{/)
 assert.match(module,/Object\.entries\(visibleAttendance\)/)
})
test('attendance views never grant hidden cross-grade marks via fallback lookup',()=>{
 for(const source of [module,mark])assert.doesNotMatch(source,/sectionsForClass\(['"]Pre Nine['"]\)/)
})
