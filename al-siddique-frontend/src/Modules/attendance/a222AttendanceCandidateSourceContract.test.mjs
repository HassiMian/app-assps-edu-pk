import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const root=new URL('.',import.meta.url)
const module=readFileSync(new URL('AttendanceModule.jsx',root),'utf8')
const mark=readFileSync(new URL('MarkAttendance.jsx',root),'utf8')
const guard=readFileSync(new URL('attendanceRosterGuard.js',root),'utf8')
const sources=[module,mark]
test('two independent attendance components retained',()=>{
 assert.match(module,/export default function AttendanceModule/)
 assert.match(mark,/export default function MarkAttendance/)
})
test('both import guarded roster reconciliation',()=>{
 for (const s of sources)assert.match(s,/import \{ reconcileAttendanceRoster \}/)
})
test('both distinguish exact API grade identities',()=>{
 for(const s of sources) {
  assert.match(s,/function attendanceApiClass\(value\) \{\s*return value/)
  assert.doesNotMatch(s,/return value === ["']Pre Nine["'] \? ["']Nine["']/)
 }
})
test('both remove cross-grade section fallback',()=>{
 for(const s of sources) {
  assert.match(s,/return sectionsForClass\(className\)/)
  assert.doesNotMatch(s,/sectionsForClass\(["']Pre Nine["']\)/)
 }
})
test('both keep school academic class list',()=>{
 for(const s of sources) assert.match(s,/useAcademicStore\(/)
})
test('both update selected class after asynchronous official setup',()=>{
 for(const s of sources) {
  assert.match(s,/CLASSES\.length && \(!selectedClass \|\| !CLASSES\.includes\(selectedClass\)\)/)
  assert.match(s,/setSelectedClass\(CLASSES\[0\]\)/)
 }
})
test('both reject unconfigured class before fetching',()=>{
 for(const s of sources)assert.match(s,/!CLASSES\.includes\(selectedClass\) \|\| !available/)
})
test('both require exact available section from academic setup',()=>{
 for(const s of sources)assert.match(s,/!available(?:Sections)?\.includes\(selectedSection\)/)
})
test('both guard concurrent stale response serial',()=>{
 for(const s of sources) {
  assert.match(s,/requestSerialRef\.current/)
  assert.match(s,/requestSerial !== requestSerialRef\.current/)
 }
})
test('both reject response for previous class section date',()=>{
 for(const s of sources)assert.match(s,/selectedScopeRef\.current !== scopeKey/)
})
test('both enforce the exact loaded scope on save',()=>{
 for(const s of sources)assert.match(s,/loadedScopeRef\.current !== scopeKey/)
})
test('both stop rendering data after roster fetch error',()=>{
 for(const s of sources) {
  assert.match(s,/setStudents\(\[\]\)/)
  assert.match(s,/setAttendance\(\{\}\)/)
 }
})
test('both do not convert network failure into success-shaped empty arrays',()=>{
 for(const s of sources)assert.doesNotMatch(s,/\.catch\(\(\) => \(\{ data: \{ data: \[\] \} \}\)\)/)
})
test('both filters preserve actual class and section',()=>{
 for(const s of sources) {
  assert.match(s,/class: attendanceApiClass\(selectedClass\)/)
  assert.match(s,/section: selectedSection/)
 }
})
test('MarkAttendance never marks unmarked students present silently',()=>{
 assert.doesNotMatch(mark,/attendance\[student\.id\] \|\| ['"]present['"]/)
 assert.match(mark,/\.filter\(student => attendance\[student\.id\]/)
})
test('MarkAttendance requires explicit marked records before save',()=>{
 assert.match(mark,/if \(!records\.length\)/)
 assert.match(mark,/Mark at least one student before saving/)
})
test('AttendanceModule saves only IDs in the loaded roster',()=>{
 assert.match(module,/new Set\(students\.map/)
 assert.match(module,/currentRoster\.has\(Number\(id\)\)/)
})
test('previous attendance dashboard and charts retained',()=>{
 assert.match(module,/DonutChart/)
 assert.match(module,/BarChart/)
 assert.match(module,/Smart Scan/)
})
test('previous MarkAttendance visual components preserved',()=>{
 assert.match(mark,/StatCard/)
 assert.match(mark,/UserCheck/)
 assert.match(mark,/statusMeta/)
})
test('both preserve daily date selection',()=>{
 for(const s of sources)assert.match(s,/getPakistanDateString\(/)
})
test('both keep existing attendance-save API endpoint',()=>{
 for(const s of sources)assert.match(s,/api\.post\(['"]\/api\/attendance\/mark['"]/)
})
test('both publish attendance refresh event after successful save',()=>{
 for(const s of sources)assert.match(s,/emitAttendanceUpdated/)
})
test('guard normalizes Pre Nine without aliasing Nine',()=>{
 assert.match(guard,/if\(text==='pre 9'\|\|text==='pre9'\) return 'pre nine'/)
 assert.doesNotMatch(guard,/return 'nine'.*pre9/)
})
test('guard requires roster-safe student ID',()=>{
 assert.match(guard,/Number\.isSafeInteger\(id\)/)
})
test('guard throws on missing scoped roster identity',()=>{
 assert.match(guard,/ATTENDANCE_ROSTER_SCOPE_MISMATCH/)
})
test('guard accepts marks only from matching roster',()=>{
 assert.match(guard,/!roster\.has\(id\)/)
})
test('guard prevents section-inconsistent marks',()=>{
 assert.match(guard,/sectionKey\(row\.section\)!==sectionKey\(section\)/)
})
