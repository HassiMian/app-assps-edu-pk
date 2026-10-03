import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASE3P_SCHEMA,composeCurriculumPhase3PPreview}
 from '../editorV2/curriculumPhase3PBridge.js';
import {attachReadOnlyPublicationLineagePhase3W}
 from '../editorV2/curriculumPublicationLineagePhase3W.js';
import {createPhase3QWorkspace,phase3QToggleQuestion,phase3QSwitchType,phase3QPreview}
 from '../editorV2/curriculumPreparationPhase3Q.js';
import {createNewAuthoringPaperDocument,validateNewAuthoringPaperDocument}
 from '../editorV2/newAuthoringPaperDocumentPhase3R.js';
const enHash='a'.repeat(64),urHash='b'.repeat(64),signedDigest='c'.repeat(64);
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-bio-pair',edition:'2025-26',syllabusVersion:'ix-2025-26'};
const subject={id:'biology9',classId:'nine',syllabusId:'ptb'};
const selection={syllabusMode:'full',examYear:null};
const bookIds={en:'book-en',ur:'book-ur'};
const checksums={en:enHash,ur:urHash};
const academic=id=>({id,type:'short',marks:2,medium:'dual',curriculum:{...identity},
 chapter:{id:'IX-C1',number:1},topicId:'1.1',
 content:{en:{stem:'English '+id,answer:'Answer '+id},
 ur:{stem:'اردو '+id,answer:'جواب '+id}},review:{status:'approved',evidenceId:'verified-1'},
 source:{languages:{en:{pdfSha256:enHash,page:8,topicId:'1.1'},
 ur:{pdfSha256:urHash,page:9,topicId:'1.1'}}}});
const records=[academic('q1'),academic('q2')];
const projection=()=>({schema:PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
 identity:{...identity},subjects:[subject],sourceBookIds:{...bookIds},
 sourceChecksums:{...checksums},selection:{...selection},
 chapters:[{id:'IX-C1',subjectId:subject.id,n:1,en:'Introduction',ur:'تعارف',
 topics:[{id:'1.1',en:'Science of Biology',ur:'حیاتیات کی سائنس'}]}],
 questions:[{id:'q1',subjectId:subject.id,type:'short',chapterId:'IX-C1',topicId:'1.1',
 marks:2,text:'English q1',textUrdu:'اردو q1',options:[],
 answerEn:'Answer q1',answerUrdu:'جواب q1',academicRecord:structuredClone(records[0])}]});
const signed=()=>({status:'PUBLISHED_APPROVED',trustOrigin:'SERVER_INDEPENDENT_AUDIT',
 signatureVerification:'PINNED_ED25519_VERIFIED',publicationId:'pub-bio9-v7',
 revision:7,recordsDigest:signedDigest,curriculumIdentity:{...identity},
 selection:{...selection},sourceBookIds:{...bookIds},sourceChecksums:{...checksums},
 records:structuredClone(records)});
const blocks=[{id:'choice',type:'short',questionIds:['q1'],attemptAny:1}];
const pin=()=>attachReadOnlyPublicationLineagePhase3W({projection:projection(),snapshot:signed()});
test('Phase3V identity hint carries revision, publication and digest into original-record handoff',()=>{
 const before=projection(),source=signed(),old=JSON.stringify(before),oldPub=JSON.stringify(source);
 const bound=attachReadOnlyPublicationLineagePhase3W({projection:before,snapshot:source});
 assert.equal(bound.revision,7);assert.equal(bound.publicationLineage.snapshotRevision,7);
 assert.equal(bound.publicationLineage.publicationId,'pub-bio9-v7');
 assert.equal(bound.publicationLineage.recordsDigest,signedDigest);
 assert.equal(bound.publicationLineage.clientAuthorizationState,'UNVERIFIED_CLIENT_ONLY');
 assert.equal(bound.serverPublicationApproved,false);assert.equal(bound.printApproved,false);
 assert.equal(JSON.stringify(before),old);assert.equal(JSON.stringify(source),oldPub);
 const handoff=composeCurriculumPhase3PPreview({projection:bound,blocks,medium:'ur'});
 assert.equal(handoff.snapshotRevision,7);
 assert.deepEqual(handoff.publicationLineage,bound.publicationLineage);
 assert.deepEqual(handoff.sourceLedger[0].academicRecord,records[0]);
 const doc=createNewAuthoringPaperDocument({handoff,draftId:'draft-phase3w-001'});
 assert.equal(doc.sourceIdentity.approvedSnapshotRevision,7);
 assert.equal(doc.sourceIdentity.publicationId,'pub-bio9-v7');
 assert.equal(doc.sourceIdentity.recordsDigest,signedDigest);
 assert.equal(doc.sourceIdentity.authorizationState,'UNVERIFIED_CLIENT_ONLY');
 assert.equal(doc.printApproved,false);
 assert.equal(validateNewAuthoringPaperDocument(doc).valid,true);
});
test('old topic selector state is invalid immediately after new publication revision',()=>{
 const p=pin(),w=createPhase3QWorkspace(p);
 const nextSnapshot=signed();nextSnapshot.revision=8;
 nextSnapshot.publicationId='pub-bio9-v8';
 const next=attachReadOnlyPublicationLineagePhase3W({projection:projection(),snapshot:nextSnapshot});
 assert.throws(()=>phase3QToggleQuestion(w,next,'q1'),/stale or unapproved/);
 assert.throws(()=>phase3QPreview(w,next),/stale or unapproved/);
 const shortState=phase3QSwitchType(w,p,'short');
 const ready=phase3QToggleQuestion(shortState,p,'q1');
 const doc=createNewAuthoringPaperDocument({handoff:phase3QPreview(ready,p),
  draftId:'draft-phase3w-002'});
 assert.equal(doc.sourceIdentity.approvedSnapshotRevision,7);
});
test('unpublished/pending/unsigned evidence and changed selected source are refused',()=>{
 for(const mutate of [s=>{s.status='PENDING_REVIEW'},
  s=>{s.trustOrigin='CLIENT_ASSERTED'},
  s=>{s.signatureVerification='UNVERIFIED'},
  s=>{s.revision=0},s=>{s.recordsDigest='wrong'},
  s=>{s.sourceChecksums.ur='d'.repeat(64)},
  s=>{s.curriculumIdentity.edition='2026-27'},
  s=>{s.selection={syllabusMode:'alp',examYear:2026}},
  s=>{s.records[0].content.en.stem='Changed textbook text'},
  s=>{s.records.push(structuredClone(s.records[0]))},
  s=>{s.records[0].review.status='draft'},
 ]){const s=signed();mutate(s);
  assert.throws(()=>attachReadOnlyPublicationLineagePhase3W({
   projection:projection(),snapshot:s}),/Phase3W refused/);}
});
test('tampered revision or digest after projection is rejected at handoff',()=>{
 const bound=pin(),stale=structuredClone(bound);
 stale.publicationLineage.snapshotRevision=8;
 assert.throws(()=>composeCurriculumPhase3PPreview({projection:stale,blocks}),
  /invalid or stale publication lineage/);
 const orphan=projection();orphan.revision=7;
 assert.throws(()=>composeCurriculumPhase3PPreview({projection:orphan,blocks}),
  /orphan source revision/);
 const repeated=pin();
 assert.throws(()=>attachReadOnlyPublicationLineagePhase3W({projection:repeated,
  snapshot:signed()}),/unmodified supervised/);
});
test('Phase3R requires the publication triplet, not a bare handoff revision',()=>{
 const handoff=composeCurriculumPhase3PPreview({projection:pin(),blocks});
 for(const mutate of [h=>{h.snapshotRevision=8},
  h=>{h.publicationLineage.publicationId=''},
  h=>{h.publicationLineage.recordsDigest='wrong'},
  h=>{h.publicationLineage=null},
 ]){const h=structuredClone(handoff);mutate(h);
  assert.throws(()=>createNewAuthoringPaperDocument({handoff:h,
   draftId:'draft-phase3w-003'}),/Phase3R refused/);}
 const doc=createNewAuthoringPaperDocument({handoff,draftId:'draft-phase3w-004'});
 for(const mutate of [d=>{d.sourceIdentity.publicationId=null},
  d=>{d.sourceIdentity.recordsDigest='broken'},
  d=>{d.sourceIdentity.approvedSnapshotRevision=null},
 ]){const broken=structuredClone(doc);mutate(broken);
  assert.equal(validateNewAuthoringPaperDocument(broken).valid,false);}
});
test('unpublished local preview remains editable but never claims persistence permission',()=>{
 const h=composeCurriculumPhase3PPreview({projection:projection(),blocks});
 assert.equal(h.publicationLineage,null);assert.equal(h.snapshotRevision,null);
 const doc=createNewAuthoringPaperDocument({handoff:h,draftId:'draft-local-preview-001'});
 assert.equal(doc.sourceIdentity.approvedSnapshotRevision,null);
 assert.equal(doc.sourceIdentity.publicationId,null);
 assert.equal(doc.sourceIdentity.recordsDigest,null);
 assert.equal(doc.sourceIdentity.authorizationState,'UNVERIFIED_CLIENT_ONLY');
 assert.equal(validateNewAuthoringPaperDocument(doc).valid,true);
 assert.equal(doc.serverPublicationApproved,false);
});
