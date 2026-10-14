import test from 'node:test'
import assert from 'node:assert/strict'
import {CLASS_ORDER,LABELS,classSubjectGroups,extractOriginalEvidence,escapeReviewHtml,classPrintHtml} from '../composerReviewDomain.js'
test('class hierarchy always follows school order, including Starter Mover Flyer',()=>{
 const rows=[{id:'a',className:'Seven',subject:'Social Studies'},
 {id:'b',className:'Mover',subject:'Math'},{id:'c',className:'Starter',subject:'English'},
 {id:'d',className:'Seven',subject:'Islamiyat'},{id:'e',className:'Flyer',subject:'Urdu'}]
 const grouped=classSubjectGroups(rows)
 assert.deepEqual(grouped.map(x=>x.className),['Starter','Mover','Flyer','Seven'])
 assert.equal(grouped.find(x=>x.className==='Seven').subjects[0].subject,'Islamiyat')
 assert.equal(LABELS.Starter,'Starter · Playgroup')
 assert.equal(LABELS.Mover,'Mover · Nursery')
 assert.equal(LABELS.Flyer,'Flyer · Prep')
 assert.ok(CLASS_ORDER.includes('Pre-Nine'))
 assert.ok(!CLASS_ORDER.includes('Nine'))
})
test('source extraction never edits the original text or line offsets',()=>{
 const doc={sourceSubmissions:[{source_id:'WA14-L2999',received_at:'2026-10-14 20:00',
  source_excerpt_pieces:[{source_start_line:21,source_end_line:24,verbatim:'اسلامیات\nPage 91–95'}]}]}
 const before=JSON.stringify(doc)
 const lines=extractOriginalEvidence(doc)
 assert.equal(lines.length,1)
 assert.equal(lines[0].verbatim,'اسلامیات\nPage 91–95')
 assert.equal(lines[0].lineFrom,21)
 assert.equal(JSON.stringify(doc),before)
})
test('HTML printing escapes injected markup and retains source attribution',()=>{
 const attack='<script>alert("NO")</script> & "onload"'
 const html=classPrintHtml([{
  className:'Six',subjects:[{subject:'Pakistan Studies',source:{
    sourceSubmissions:[{source_id:'WA14-L1234',source_excerpt_pieces:[
      {source_start_line:10,source_end_line:12,verbatim:attack}
    ]}],
    corrections:[{proposedText:'Revised <chapter> & تیسرا باب',decision:'PROPOSED_NOT_APPROVED'}]
  }}]
 }],{generatedAt:'2026-10-14'})
 assert.ok(html.includes('WA14-L1234'))
 assert.ok(html.includes('lines 10–12'))
 assert.ok(html.includes('&lt;script&gt;'))
 assert.ok(!html.includes('<script>'))
 assert.ok(html.includes('PROPOSED_NOT_APPROVED'))
 assert.ok(html.includes('Jameel Noori Nastaleeq'))
 assert.ok(html.includes('@page{size:A4'))
 assert.ok(html.includes('PRIVATE SOURCE REVIEW'))
})
test('class print never fabricates missing evidence',()=>{
 const html=classPrintHtml([{className:'Pre-Nine',subjects:[{subject:'Islamiyat'}]}])
 assert.ok(html.includes('Original source is not available'))
 assert.ok(!html.includes('APPROVED ✓'))
})
test('grouping ignores unrecognized class and preserves distinct same-class subjects',()=>{
 const rows=[{className:'Six',subject:'English A'},{className:'Six',subject:'English B'},
  {className:'Nine',subject:'English'}]
 const grouped=classSubjectGroups(rows)
 assert.equal(grouped.length,1)
 assert.equal(grouped[0].subjects.length,2)
 assert.ok(escapeReviewHtml('<&">').includes('&lt;&amp;&quot;&gt;'))
})
