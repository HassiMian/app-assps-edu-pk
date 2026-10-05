const test = require('node:test')
const assert = require('node:assert/strict')
const { reviewPortalPaperDocument, assertPinned } = require('../services/papers/portalDocumentBoundaryV6C')

test('all five copied SaaS contract modules are exact reviewed bytes', () => {
  assert.equal(assertPinned(), true)
})

test('legacy Connect paper is inspectable without invented canonical or print authority', async () => {
  const payload={ name:'Class Seven سائنس', documentFormat:'pts-native-v13',
    config:{classLevel:'Seven',section:'A',subject:'Science',language:'urdu',title:'Term Test',totalMarks:50},
    official_section:[{id:'a',title:'حصہ اول',questions:[{id:'q1',text:'سوال نمبر ایک؟',marks:5,options:['ا','ب']}]}],
    selectedQuestions:{mcq:{questions:[{id:'qbank-1',en:'Original question?',ur:'اصل سوال؟',marks:1}]}},
    editorSettings:{font:'Jameel Noori Nastaleeq',answerLines:true},
    arbitraryUnknownLegacy:{important:true, nested:['kept','untouched']},
  }
  const original=JSON.stringify(payload)
  const result=await reviewPortalPaperDocument(payload)
  assert.equal(result.family,'legacy-connect-vault')
  assert.equal(result.reviewStatus,'LOSSLESS_ADAPTER_REQUIRED')
  assert.equal(result.summary.sectionCount,1)
  assert.equal(result.summary.language,'urdu')
  assert.equal(result.canonicalWriteAllowed,false)
  assert.equal(result.printApprovalClaim,false)
  assert.equal(JSON.stringify(payload),original)
  assert.match(result.snapshotHash,/^[a-f0-9]{64}$/)
})

test('an unknown or malicious discriminator cannot masquerade as canonical',async()=>{
  const unknown=await reviewPortalPaperDocument({format:'assps-canonical-paper-v999',schemaVersion:999})
  assert.equal(unknown.reviewStatus,'UNKNOWN_DISCRIMINATOR')
  assert.equal(unknown.canonicalWriteAllowed,false)
  const malformed=await reviewPortalPaperDocument({format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,id:'forged',sourceIdentity:null,sections:[]})
  assert.equal(malformed.family,'historical-v13')
  assert.equal(malformed.reviewStatus,'SOURCE_INVALID')
  assert.equal(malformed.migrationEligible,false)
  assert.ok(malformed.issues.some(x=>x.includes('sourceIdentity')))
})

test('Phase3R reviewed new-authoring validator rejects false server-approved draft',async()=>{
  const altered=await reviewPortalPaperDocument({format:'assps-new-authoring-paper',documentModel:'PaperDocumentNewAuthoring',schemaVersion:1,id:'draft-123',status:'PUBLISHED',sourceIdentity:{authorizationState:'SERVER_APPROVED'}})
  assert.equal(altered.family,'approved-curriculum-authoring')
  assert.equal(altered.reviewStatus,'SOURCE_INVALID')
  assert.equal(altered.canonicalWriteAllowed,false)
  assert.equal(altered.printApprovalClaim,false)
})

test('nested actual canonical document uses exact validator and unchanged caller bytes',async()=>{
  const payload={name:'wrapped',document:{format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,id:'x',sourceIdentity:{sourcePaperId:'fabricated'}}}
  const before=JSON.stringify(payload)
  const r=await reviewPortalPaperDocument(payload)
  assert.equal(r.family,'historical-v13')
  assert.equal(r.reviewStatus,'SOURCE_INVALID')
  assert.equal(JSON.stringify(payload),before)
})

test('null, array or string payloads fail closed',async()=>{
  for(const x of [null,[],undefined,'paper']){
    const r=await reviewPortalPaperDocument(x)
    assert.equal(r.reviewStatus,'UNSUPPORTED')
    assert.equal(r.canonicalWriteAllowed,false)
  }
})
