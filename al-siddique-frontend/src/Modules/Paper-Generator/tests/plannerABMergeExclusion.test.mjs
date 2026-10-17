import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalLessonCandidates,
  isLegacySeparateABPlan,
  OMITTED_LESSON_CLASSES
} from '../plannerSourceGrouping.js'
import {planWeekRows,notebookModel} from '../weeklyNotebookModel.js'
import {buildTermOverview,termAssessmentRows,buildTermServerPayload} from '../termPlanningModel.js'
import {buildWeeklyServerPayload} from '../weeklyServerPayload.js'

const mk=(klass,subject,id='X',partSource='2026-10-15 to 2026-10-21')=>({
  candidate_key: 'source-'+klass+'-'+subject+'-'+id,
  class_display:klass,proposed_class_level:klass,source_subject_label:subject,
  school_id:1,source_submissions:['WA-'+id],
  source_detail_records:[{
    source_id:'WA-'+id,
    received_at:'2026-10-14',
    term_label_source:'Second Term',
    source_excerpt_pieces:[{
      source_start_line:5,source_end_line:8,
      verbatim:partSource+'\nLesson topic '+subject+' '+id
    }]
  }]
})
const pair=(klass,subject)=>[
  mk(klass,subject+'-A','a-'+klass+'-'+subject),
  mk(klass,subject+'-B','b-'+klass+'-'+subject)
]

test('12 original class labels project to ten active classes and original records are untouched',()=>{
  const data=[
    mk('Starter','English'),mk('Mover','Urdu'),mk('Flyer','Math'),
    ...pair('One','English'),...pair('One','Urdu'),mk('One','Science'),
    ...pair('Two','English'),...pair('Two','Urdu'),mk('Two','Science'),
    ...pair('Three','English'),...pair('Three','Urdu'),mk('Three','Science'),
    mk('Four','English'),mk('Five','English'),mk('Six','Urdu'),mk('Seven','Math'),
    mk('Eight','Urdu'),mk('Pre-Nine','Islamiyat')
  ]
  const before=JSON.stringify(data)
  const visible=canonicalLessonCandidates(data)
  assert.deepEqual(OMITTED_LESSON_CLASSES,['Eight','Pre-Nine'])
  assert.equal(new Set(visible.map(x=>x.proposed_class_level)).size,10)
  assert.equal(visible.length,data.length-2-6)
  assert.equal(canonicalLessonCandidates(data,'Eight').length,0)
  assert.equal(canonicalLessonCandidates(data,'Pre-Nine').length,0)
  for(const klass of ['One','Two','Three']){
    const projected=canonicalLessonCandidates(data,klass)
    assert.equal(projected.filter(x=>x.source_subject_label==='English').length,1)
    assert.equal(projected.filter(x=>x.source_subject_label==='Urdu').length,1)
    assert(!projected.some(x=>/^English-[AB]$|^Urdu-[AB]$/.test(x.source_subject_label)))
    for (const target of projected.filter(x=>x.sourceVariants)){
      assert.deepEqual(target.sourceVariants.map(v=>v.part),['A','B'])
      assert.equal(target.publish_status,'BLOCKED')
      assert.equal(target.ready_for_post_api,false)
      assert.equal(target.source_submissions.length,2)
    }
  }
  assert.equal(JSON.stringify(data),before,'source archive must never be modified')
})

test('unmatched/ambiguous A/B stays separate; no fabricated opposite half',()=>{
  const lone=[mk('One','English-A')]
  assert.deepEqual(canonicalLessonCandidates(lone),lone)
  const ambiguous=[...pair('Two','Urdu'),mk('Two','Urdu-B','another')]
  assert.deepEqual(canonicalLessonCandidates(ambiguous),ambiguous)
})

test('weekly English A/B and Urdu A/B preserve distinct labeled parts and source IDs',()=>{
  const canonical=canonicalLessonCandidates([...pair('Two','English'),...pair('Two','Urdu')],'Two')
  const week={start:'2026-10-15',end:'2026-10-17'}
  const opts={start:'2026-10-15',end:'2027-02-15'}
  const rows=planWeekRows(canonical,'Two',week,opts).rows
  assert.equal(rows.length,2)
  for(const row of rows){
    assert.equal(row.sourceParts.length,2)
    assert.match(row.task,/^\[A\] /)
    assert.match(row.task,/\n\[B\] /)
    assert.equal(row.originalSourceIds.length,2)
    assert(row.flags.every(f=>f.startsWith('[A]')||f.startsWith('[B]')))
  }
  const oldKey=canonical[0].sourceVariants[0].candidate.candidate_key
  const fromLegacy=notebookModel({candidates:canonical,klass:'Two',week,options:opts,
    subjects:null,edits:{[oldKey]:'Teacher previous A-specific edits'}})[0]
  assert.match(fromLegacy.task,/\[A\] Teacher previous A-specific edits/)
  assert.match(fromLegacy.task,/\n\[B\]/)
  const newCombined=notebookModel({candidates:canonical,klass:'Two',week,options:opts,
    subjects:null,edits:{[canonical[0].candidate_key]:'[A] Saved first\n[B] Saved second'}})[0]
  assert.equal(newCombined.task,'[A] Saved first\n[B] Saved second')
})

test('term notes merge in one subject row but preserve independent A and B provenance',()=>{
  const canonical=canonicalLessonCandidates([...pair('Two','English'),...pair('Two','Urdu')],'Two')
  const opts={start:'2026-10-15',end:'2027-02-15',term:'Second Term'}
  const rows=buildTermOverview(canonical,opts)
  assert.equal(rows.length,2)
  for(const row of rows){
    assert.equal(row.sourceParts.length,2)
    assert.match(row.detail,/^\[A\]/)
    assert.match(row.detail,/\n\[B\]/)
    assert.equal(row.originalSourceIds.length,2)
    assert.equal(row.needsReview,true)
    assert(row.events.every(e=>['A','B'].includes(e.sourcePart)))
  }
  const l=termAssessmentRows(rows)
  assert(l.every(e=>e.subject==='English'||e.subject==='Urdu'||e.subject===''))
  const firstOther=buildTermOverview(canonical,{...opts,term:'First Term'})
  for(const row of firstOther){
    assert.equal(row.originalSourceIds.length,0)
    assert(!row.detail.includes('Lesson topic English'),
      'Second Term content must never silently migrate to First Term')
    assert.match(row.sourceStatus,/UNSOURCED TERM/)
  }
})

test('existing legacy per-A/B term edits reappear in the combined row',()=>{
  const canonical=canonicalLessonCandidates(pair('Three','English'),'Three')
  const old=canonical[0].sourceVariants
  const term=buildTermOverview(canonical,{start:'2026-10-15',end:'2027-02-15',
    edits:{[old[0].candidate.candidate_key]:{detail:'Edited A'},
           [old[1].candidate.candidate_key]:{detail:'Edited B'}}})
  assert.equal(term.length,1)
  assert.match(term[0].detail,/\[A\] Edited A/)
  assert.match(term[0].detail,/\[B\] Edited B/)
})


test('merged weekly server draft preserves A/B identities, separate labels, and publication hold',()=>{
  const candidates=canonicalLessonCandidates(pair('Two','English'),'Two')
  const week={start:'2026-10-15',end:'2026-10-17'}
  const rows=planWeekRows(candidates,'Two',week,{start:'2026-10-15',end:'2027-02-15'}).rows
  const payload=buildWeeklyServerPayload({klass:'Two',section:'Yellow',week,rows,
    teacherLabel:'Unverified original owner',sourceZipSha256:'a'.repeat(64)})
  const doc=payload.plannerDocument
  assert.equal(doc.subjects.length,1)
  assert.equal(doc.subjects[0].subject,'English')
  assert.match(doc.subjects[0].lessons[0].homework,/\[A\]/)
  assert.match(doc.subjects[0].lessons[0].homework,/\[B\]/)
  assert.deepEqual(doc.provenance.sourcePartsBySubject[rows[0].id].map(x=>x.part),['A','B'])
  assert.deepEqual(doc.provenance.sourcePartsBySubject[rows[0].id].flatMap(x=>x.originalSourceIds),
    ['WA-a-Two-English','WA-b-Two-English'])
  assert.equal(doc.provenance.academicPublication,'BLOCKED')
  assert.equal(payload.sentToPortal,undefined)
})

test('merged term server draft preserves A/B linkage without collapsing original dates',()=>{
  const candidates=canonicalLessonCandidates(pair('Three','Urdu'),'Three')
  const rows=buildTermOverview(candidates,{start:'2026-10-15',end:'2027-02-15',term:'Second Term'})
  const payload=buildTermServerPayload({klass:'Three',section:'',term:'Second Term',
    start:'2026-10-15',end:'2027-02-15',rows,assessments:termAssessmentRows(rows),
    design:{},sourceZipSha256:'a'.repeat(64)})
  const doc=payload.plannerDocument
  assert.equal(doc.subjects.length,1)
  assert.equal(doc.subjects[0].subject,'Urdu')
  assert.equal(doc.termCoverageRows.length,1)
  assert.deepEqual(doc.provenance.sourcePartsBySubject[rows[0].id].map(x=>x.part),['A','B'])
  assert.equal(doc.provenance.academicPublication,'BLOCKED')
  assert.equal(payload.sentToPortal,undefined)
})


test('historical saved A/B server drafts are detected and must clone, not update',()=>{
  const old = {classLevel:'One',subjects:[{subject:'English-A'},{subject:'English-B'},{subject:'Urdu'}]}
  assert.equal(isLegacySeparateABPlan(old),true)
  assert.equal(isLegacySeparateABPlan({classLevel:'Two',subjects:[{subject:'Urdu B'}]}),true)
  assert.equal(isLegacySeparateABPlan({classLevel:'Three',subjects:[{subject:'English'},{subject:'Urdu'}]}),false)
  assert.equal(isLegacySeparateABPlan({classLevel:'Four',subjects:[{subject:'English-A'}]}),false)
  assert.equal(isLegacySeparateABPlan({classLevel:'Eight',subjects:[{subject:'English-A'}]}),false)
  assert.equal(isLegacySeparateABPlan({classLevel:'One',subjects:[]}),false)
  assert.equal(isLegacySeparateABPlan(null),false)
})
