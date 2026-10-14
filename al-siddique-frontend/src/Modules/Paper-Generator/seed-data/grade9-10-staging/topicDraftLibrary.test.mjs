import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTopicDraftLibrary,inspectTopicDraftLibrary,advanceTopicDraftLibrary,restoreTopicDraftRevision,MAX_TOPIC_DRAFT_HISTORY}
 from './topicDraftLibrary.mjs';
const H='a'.repeat(64);
const makeDraft=id=>({id,review:{status:'draft'},source:{pdfSha256:H}});
test('tenant draft library starts empty and revisioned',()=>{
 const x=createTopicDraftLibrary({curriculumKey:'IX-BIO-EM-2025-26',sourcePdfSha256:H,now:'2026-10-02T00:00:00.000Z'});
 assert.equal(x.revision,0);assert.deepEqual(x.drafts,[]);assert.deepEqual(x.blocks,[]);
 assert.equal(inspectTopicDraftLibrary(x,{curriculumKey:'IX-BIO-EM-2025-26',sourcePdfSha256:H}).valid,true);
});
test('optimistic revision check prevents lost updates',()=>{
 const x=createTopicDraftLibrary({curriculumKey:'K',sourcePdfSha256:H});
 const a=advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[makeDraft('D1')],blocks:[],now:'A'});
 assert.equal(a.ok,true);assert.equal(a.library.revision,1);
 const conflict=advanceTopicDraftLibrary(a.library,{expectedRevision:0,drafts:[makeDraft('D2')],blocks:[],now:'B'});
 assert.equal(conflict.ok,false);assert.equal(conflict.code,'REVISION_CONFLICT');
});
test('blocks may reference persistent or explicitly known seed drafts only',()=>{
 const x=createTopicDraftLibrary({curriculumKey:'K',sourcePdfSha256:H});
 const good=advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[makeDraft('D1')],
  knownExternalIds:['SEED1'],blocks:[{id:'B1',type:'short',questionIds:['D1','SEED1'],attemptAny:1}]});
 assert.equal(good.ok,true);
 const bad=advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[makeDraft('D1')],
  blocks:[{id:'B1',type:'short',questionIds:['MISSING'],attemptAny:1}]});
 assert.equal(bad.ok,false);assert.match(bad.errors.join('|'),/unknown question/);
});
test('persistent staging rejects approved status or wrong textbook hash',()=>{
 const x=createTopicDraftLibrary({curriculumKey:'K',sourcePdfSha256:H});
 const approved={...makeDraft('A'),review:{status:'approved'}};
 assert.equal(advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[approved],blocks:[]}).ok,false);
 const wrong={...makeDraft('B'),source:{pdfSha256:'b'.repeat(64)}};
 assert.equal(advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[wrong],blocks:[]}).ok,false);
});
test('rollback restores prior content as a NEW revision',()=>{
 let x=createTopicDraftLibrary({curriculumKey:'K',sourcePdfSha256:H});
 x=advanceTopicDraftLibrary(x,{expectedRevision:0,drafts:[makeDraft('D1')],blocks:[],now:'1'}).library;
 x=advanceTopicDraftLibrary(x,{expectedRevision:1,drafts:[makeDraft('D1'),makeDraft('D2')],blocks:[],now:'2'}).library;
 const restored=restoreTopicDraftRevision(x,{expectedRevision:2,targetRevision:1,now:'3'});
 assert.equal(restored.ok,true);assert.equal(restored.library.revision,3);
 assert.deepEqual(restored.library.drafts.map(q=>q.id),['D1']);
});
test('history is capped and duplicate draft identities are rejected',()=>{
 let x=createTopicDraftLibrary({curriculumKey:'K',sourcePdfSha256:H});
 for(let i=0;i<MAX_TOPIC_DRAFT_HISTORY+4;i++){
  x=advanceTopicDraftLibrary(x,{expectedRevision:x.revision,drafts:[makeDraft('D'+i)],blocks:[],now:String(i)}).library;
 }
 assert.equal(x.history.length,MAX_TOPIC_DRAFT_HISTORY);
 const dup=advanceTopicDraftLibrary(x,{expectedRevision:x.revision,drafts:[makeDraft('X'),makeDraft('X')],blocks:[]});
 assert.equal(dup.ok,false);assert.match(dup.errors.join('|'),/Duplicate draft ID/);
});
