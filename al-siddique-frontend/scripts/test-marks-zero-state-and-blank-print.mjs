import assert from 'node:assert/strict'
import {marksEntryReadiness,retainNewerMarkEdits} from '../src/Modules/examination/marksEntryReadiness.js'
import {escapeMarksPrintHtml,approvedMarksLogoUrl,countRecordedMarks} from '../src/Modules/examination/marksBlankPrint.js'
const students=[{id:101,name:'Student A'},{id:102,name:'Student B'},{id:103,name:'Student C'}]
assert.deepEqual(marksEntryReadiness(students),{students:3,saved:0,pending:3,edited:0,blankDraft:0,readyToEnter:true})
assert.deepEqual(marksEntryReadiness(students,{101:0,102:76}),{students:3,saved:2,pending:1,edited:0,blankDraft:0,readyToEnter:true})
assert.deepEqual(marksEntryReadiness(students,{101:0},{102:'0',103:''}),{students:3,saved:1,pending:2,edited:1,blankDraft:1,readyToEnter:true})
assert.deepEqual(marksEntryReadiness([],{}),{students:0,saved:0,pending:0,edited:0,blankDraft:0,readyToEnter:false})
assert.deepEqual(retainNewerMarkEdits({'101':'44','102':'51'},[{student_id:101,marks_obtained:44},{student_id:102,marks_obtained:50}]),{'102':'51'},'Edit made while save awaited must not be lost')
assert.deepEqual(retainNewerMarkEdits({'101':'0'},[{student_id:101,marks_obtained:0}]),{},'Zero is a saved mark')
assert.equal(countRecordedMarks([], 'English',students),0)
assert.equal(countRecordedMarks([{student_id:101,subject:'English',marks_obtained:0},{student_id:102,subject:'English',marks_obtained:null},{student_id:103,subject:'Maths',marks_obtained:99}], 'English',students),1)
const attack='<svg/onload=alert("unsafe")> & \' quoted'
const escaped=escapeMarksPrintHtml(attack)
assert.ok(escaped.includes('&lt;svg/') && !escaped.includes('<svg') && escaped.includes('&quot;'))
assert.equal(approvedMarksLogoUrl('javascript:alert(1)'),'')
assert.equal(approvedMarksLogoUrl('https://evil.site/uploads/branding/logo.png'),'')
assert.equal(approvedMarksLogoUrl('https://api.assps.edu.pk/uploads/private-id/passport.png'),'')
assert.equal(approvedMarksLogoUrl('https://api.assps.edu.pk/uploads/branding/logo.svg'),'')
assert.equal(approvedMarksLogoUrl('https://api.assps.edu.pk/uploads/branding/logo.png'),'https://api.assps.edu.pk/uploads/branding/logo.png')
assert.equal(approvedMarksLogoUrl('/uploads/branding/a.webp'),'https://api.assps.edu.pk/uploads/branding/a.webp')
assert.equal(approvedMarksLogoUrl('data:image/svg+xml,<svg onload=alert(1)>'),'')
console.log('MARKS_ZERO_STATE_AND_PRINT_SECURITY PASS 16 cases: empty vs zero, resumed saves, async edit race, escaped student text, legitimate SaaS logo only')
