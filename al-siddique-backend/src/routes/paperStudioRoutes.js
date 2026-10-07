const express = require('express')
const router = express.Router()
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { normalizedRole, teacherContext, listProjectedPapers, getProjectedPaper } = require('../services/paperStudioProjectionService')
const { buildCanonicalCutoverReadiness } = require('../services/papers/paperCanonicalCutoverReadinessV6F')
const { buildCanonicalCanaryPreflight } = require('../services/papers/paperCanonicalCanaryPreflightV6H0')
const { buildCanonicalCanaryPlan } = require('../services/papers/paperCanonicalCanaryPlanV6H2')
const { buildCanonicalCanaryRollbackPlan } = require('../services/papers/paperCanonicalCanaryRollbackPlanV6H3')
const { buildCanonicalCanaryReviewPacket } = require('../services/papers/paperCanonicalCanaryReviewPacketV6H4')
const { buildRevisionBoundCanonicalDocx, assessCanonicalDocxEligibility } = require('../services/papers/paperCanonicalDocxProjectionV6G21')
const { validateReviewBundle } = require('../services/papers/paperIndependentReviewIntakeV6G4')
const { buildPublisherPromotionPrecheck } = require('../services/papers/paperPublisherPromotionPrecheckV6G9')
const { buildPublisherPromotionEnvelope } = require('../services/papers/paperPublisherPromotionEnvelopeV6G10')
const { verifyPublisherDetachedSignature } = require('../services/papers/paperPublisherDetachedSignatureV6G11')
const { validatePublisherApprovalDecision } = require('../services/papers/paperPublisherApprovalDecisionV6G12')
const { buildPublisherApprovalActivationPreflight } = require('../services/papers/paperPublisherApprovalActivationPreflightV6G13')
const { validatePublisherKeyCustodyPreflight } = require('../services/papers/paperPublisherKeyCustodyPreflightV6G14')
const { validatePublisherEditionReviewPreflight } = require('../services/papers/paperPublisherEditionReviewPreflightV6G15')
const { buildAcademicPublicationPrecheck } = require('../services/papers/paperAcademicPublicationPrecheckV6G16')
const { buildPublisherReleaseEnvelope } = require('../services/papers/paperPublisherReleaseEnvelopeV6G17')
const { verifyPublisherReleaseDetachedSignature } = require('../services/papers/paperPublisherReleaseSignatureV6G19')
const { buildHumanAuthorityBoundary } = require('../services/papers/paperHumanAuthorityBoundaryV6G18')
const { reviewPortalPaperDocument } = require('../services/papers/portalDocumentBoundaryV6C')
const { buildDeliveryManifest } = require('../services/papers/paperDeliveryManifestV6E')
const { saveGuardedRevision, listGuardedRevisions, readGuardedRevision } = require('../services/papers/paperVaultRevisionV6D')

router.use(protect, requireRoles('super_admin','admin','principal','teacher'))

function schoolContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId) { res.status(403).json({ success:false, message:'School context is required.' }); return null }
  return schoolId
}

router.get('/canonical-readiness', async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const data=await buildCanonicalCutoverReadiness()
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data})
  } catch(err) {
    console.error('Paper Studio canonical readiness error:',err.message)
    return res.status(500).json({success:false,message:'Canonical storage readiness could not be verified.'})
  }
})

router.get('/canonical-readiness/human-authority-boundary', async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const data=await buildHumanAuthorityBoundary()
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{readOnly:true,persisted:false,envChanged:false,approvalChanged:false,canonicalWriteChanged:false}})
  } catch(err) {
    console.error('Paper Studio human authority boundary error:',err.message)
    return res.status(500).json({success:false,message:'Human authority boundary could not be verified.'})
  }
})










router.post('/publisher-review/edition-review-precheck', express.json({limit:'512kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=validatePublisherEditionReviewPreflight(req.body||{}, {forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,manifestMutated:false,persisted:false,academicQuestionReleased:false,approvalFlagChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher edition review precheck error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_EDITION_REVIEW_PRECHECK_FAILED',message:status>=500?'Publisher edition review precheck could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})


router.post('/publisher-review/academic-publication-precheck', express.json({limit:'768kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=buildAcademicPublicationPrecheck(req.body||{}, {forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,manifestMutated:false,questionBankChanged:false,academicApprovalChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio academic publication precheck error:',err.message)
    return res.status(status).json({success:false,code:err.code||'ACADEMIC_PUBLICATION_PRECHECK_FAILED',message:status>=500?'Academic publication precheck could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/release-envelope', express.json({limit:'1mb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=buildPublisherReleaseEnvelope(req.body||{}, {forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,signatureCreated:false,privateKeyAccepted:false,privateKeyAccessed:false,persisted:false,publisherApprovalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher release envelope error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_RELEASE_ENVELOPE_FAILED',message:status>=500?'Publisher release envelope could not be generated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/release-signature-verify', express.json({limit:'1mb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const body=req.body||{}
    const data=verifyPublisherReleaseDetachedSignature(body.releaseBundle||{},body.signatureRecord||{}, {forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{verificationOnly:true,signatureCreated:false,privateKeyAccepted:false,privateKeyAccessed:false,persisted:false,academicApprovalChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher release signature verification error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_RELEASE_SIGNATURE_VERIFY_FAILED',message:status>=500?'Publisher release signature could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/key-custody-precheck', express.json({limit:'256kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const body=req.body||{}
    const data=validatePublisherKeyCustodyPreflight(body.publicKeyPem,body.custody||{}, {forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,publicKeyPersisted:false,privateKeyAccepted:false,envChanged:false,approvalFlagChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher key custody precheck error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_KEY_CUSTODY_PRECHECK_FAILED',message:status>=500?'Publisher key custody precheck could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/approval-activation-precheck', express.json({limit:'512kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const body=req.body||{}
    const data=await buildPublisherApprovalActivationPreflight(body.reviewBundle||{},body.signature||{},body.approval||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id],forbidApproverIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,envChanged:false,approvalFlagChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher approval activation precheck error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_APPROVAL_ACTIVATION_PRECHECK_FAILED',message:status>=500?'Publisher approval activation precheck could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/approval-decision-validate', express.json({limit:'512kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const body=req.body||{}
    const data=validatePublisherApprovalDecision(body.reviewBundle||{},body.signature||{},body.approval||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id],forbidApproverIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,approvalFlagChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher approval decision error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_APPROVAL_DECISION_FAILED',message:status>=500?'Publisher approval decision could not be validated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/signature-verify', express.json({limit:'384kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const body=req.body||{}
    const data=verifyPublisherDetachedSignature(body.reviewBundle||{}, body.signature||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{verificationOnly:true,persisted:false,approvalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher signature verification error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_SIGNATURE_VERIFICATION_FAILED',message:status>=500?'Publisher signature could not be verified.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/promotion-envelope', express.json({limit:'256kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=buildPublisherPromotionEnvelope(req.body||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,approvalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher promotion envelope error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_PROMOTION_ENVELOPE_FAILED',message:status>=500?'Publisher promotion envelope could not be generated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.post('/publisher-review/promotion-precheck', express.json({limit:'256kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=buildPublisherPromotionPrecheck(req.body||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,approvalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio publisher promotion precheck error:',err.message)
    return res.status(status).json({success:false,code:err.code||'PUBLISHER_PROMOTION_PRECHECK_FAILED',message:status>=500?'Publisher promotion precheck could not be verified.':err.message})
  }
})

router.post('/publisher-review/validate', express.json({limit:'256kb'}), async (req,res) => {
  try {
    const role=normalizedRole(req)
    if(!['super_admin','admin','principal'].includes(role))return res.status(403).json({success:false,message:'Admin or Principal role is required.'})
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=validateReviewBundle(req.body||{}, {grade:9,subject:'Biology',forbidReviewerIds:[req.user?.id]})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{validationOnly:true,persisted:false,approvalChanged:false,canonicalWriteChanged:false,schoolId:String(schoolId)}})
  } catch(err) {
    console.error('Paper Studio publisher review validation error:',err.message)
    return res.status(500).json({success:false,message:'Publisher review bundle could not be validated.'})
  }
})

router.get('/canonical-canary/:id/preflight', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=await buildCanonicalCanaryPreflight({
      schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id,
    })
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio canonical canary preflight error:',err.message)
    return res.status(status).json({success:false,code:err.code||'CANARY_PREFLIGHT_FAILED',message:status>=500?'Canonical canary preflight could not be verified.':err.message})
  }
})

router.get('/canonical-canary/:id/plan', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=await buildCanonicalCanaryPlan({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{planOnly:true,persisted:false,canonicalWriteChanged:false}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio canonical canary plan error:',err.message)
    return res.status(status).json({success:false,code:err.code||'CANARY_PLAN_FAILED',message:status>=500?'Canonical canary plan could not be generated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.get('/canonical-canary/:id/rollback-plan', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=await buildCanonicalCanaryRollbackPlan({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{planOnly:true,deleteAttempted:false,persisted:false,canonicalWriteChanged:false}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio canonical canary rollback plan error:',err.message)
    return res.status(status).json({success:false,code:err.code||'CANARY_ROLLBACK_PLAN_FAILED',message:status>=500?'Canonical canary rollback plan could not be generated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.get('/canonical-canary/:id/review-packet', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=await buildCanonicalCanaryReviewPacket({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data,policy:{reviewOnly:true,writeAttempted:false,deleteAttempted:false,persisted:false,approvalChanged:false,canonicalWriteChanged:false,humanApprovalClaim:false}})
  } catch(err) {
    const status=Number(err.status)||500
    if(status>=500)console.error('Paper Studio canonical canary review packet error:',err.message)
    return res.status(status).json({success:false,code:err.code||'CANARY_REVIEW_PACKET_FAILED',message:status>=500?'Canonical canary review packet could not be generated.':err.message,issues:Array.isArray(err.issues)?err.issues:undefined})
  }
})

router.get('/context', async (req,res) => {
  try {
    const schoolId = schoolContext(req,res); if(!schoolId)return
    const role = normalizedRole(req)
    const scope = await teacherContext({ schoolId, userId:req.user?.id, role })
    res.set('Cache-Control','private, no-store')
    return res.json({ success:true, data:{ architectureVersion:'v6', actor:{ userId:String(req.user?.id), role, schoolId }, ...scope } })
  } catch (err) {
    console.error('Paper Studio context error:', err.message)
    return res.status(500).json({ success:false, message:'Paper Studio context could not be verified.' })
  }
})

router.get('/papers', async (req,res) => {
  try {
    const schoolId = schoolContext(req,res); if(!schoolId)return
    const role = normalizedRole(req)
    const papers = await listProjectedPapers({schoolId,userId:req.user?.id,role,limit:req.query.limit})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data:papers,scope:role==='teacher'?'own':'school'})
  } catch (err) {
    console.error('Paper Studio papers error:', err.message)
    return res.status(500).json({success:false,message:'Paper list could not be verified.'})
  }
})

// This read-only review has the same owner/school guard as the paper detail route.
// It does not change an existing paper or authorize canonical save, print or publication.
// V6-D strict compare-and-save. This is the same school paper_vault's
// current record with append-only revision snapshots; not a parallel Connect DB.
router.patch('/papers/:id', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res);if(!schoolId)return
    const result=await saveGuardedRevision({
      schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id,
      expectedRevision:Number(req.body?.expectedRevision),
      expectedSnapshotHash:req.body?.expectedSnapshotHash,
      workingDocument:req.body?.workingDocument,
    })
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data:result})
  }catch(err){
    const status=Number(err.status)||500
    if(status>=500)console.error('V6-D strict paper save failed:',err.message)
    return res.status(status).json({success:false,code:err.code||'REVISION_SAVE_FAILED',message:status>=500?'Revision could not be saved.':err.message})
  }
})
router.get('/papers/:id/revisions', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res);if(!schoolId)return
    const data=await listGuardedRevisions({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data})
  }catch(err){
    const status=Number(err.status)||500
    if(status>=500)console.error('V6-D history lookup failed:',err.message)
    return res.status(status).json({success:false,code:err.code||'HISTORY_FAILED',message:status>=500?'Revision history could not be verified.':err.message})
  }
})
router.get('/papers/:id/revisions/:revision', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res);if(!schoolId)return
    const data=await readGuardedRevision({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id,revision:req.params.revision})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data})
  }catch(err){
    const status=Number(err.status)||500
    if(status>=500)console.error('V6-D historical read failed:',err.message)
    return res.status(status).json({success:false,code:err.code||'REVISION_READ_FAILED',message:status>=500?'Revision could not be verified.':err.message})
  }
})

router.post('/papers/:id/delivery-manifest', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const manifest=await buildDeliveryManifest({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id,revision:Number(req.body?.revision),snapshotHash:req.body?.snapshotHash})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data:manifest})
  } catch(err) {
    const status=Number(err?.status)||500
    if(status>=500)console.error('Paper Studio delivery manifest error:',err.message)
    return res.status(status).json({success:false,code:err?.code||'DELIVERY_MANIFEST_FAILED',message:status>=500?'Delivery manifest could not be created.':err.message})
  }
})

router.get('/papers/:id/docx', async (req,res) => {
  const schoolId=schoolContext(req,res); if(!schoolId)return
  res.set('Cache-Control','private, no-store')
  return res.status(409).json({success:false,code:'REVISION_BOUND_DOCX_REQUIRED',message:'Canonical DOCX requires the current immutable revision and exact snapshot hash.'})
})

router.post('/papers/:id/canonical-docx', async (req,res) => {
  try {
    const schoolId=schoolContext(req,res); if(!schoolId)return
    const data=await buildRevisionBoundCanonicalDocx({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id,revision:Number(req.body?.revision),snapshotHash:req.body?.snapshotHash})
    const filename=String(data.filename||'paper.docx').replace(/[\r\n"]/g,'_')
    res.set('Cache-Control','private, no-store')
    res.set('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.set('Content-Length',String(data.buffer.length))
    res.set('X-ASSPS-Paper-Revision',String(data.source.revision))
    res.set('X-ASSPS-Snapshot-Hash',String(data.source.snapshotHash))
    res.set('X-ASSPS-DOCX-SHA256',String(data.docxSha256))
    return res.send(data.buffer)
  } catch(err) {
    const status=Number(err?.status)||500
    if(status>=500)console.error('Paper Studio canonical DOCX projection error:',err.message)
    return res.status(status).json({success:false,code:err?.code||'CANONICAL_DOCX_PROJECTION_FAILED',message:status>=500?'Canonical DOCX could not be generated.':err.message,issues:Array.isArray(err?.issues)?err.issues:undefined})
  }
})

router.get('/papers/:id/document-review', async (req,res) => {
  try {
    const schoolId = schoolContext(req,res); if(!schoolId)return
    if(!/^\d+$/.test(String(req.params.id||'')))return res.status(400).json({success:false,message:'Invalid paper id.'})
    const paper=await getProjectedPaper({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    if(!paper)return res.status(404).json({success:false,message:'Paper not found in your accessible library.'})
    const review=await reviewPortalPaperDocument(paper.document)
    const canonicalDocx=assessCanonicalDocxEligibility(review)
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,paperId:paper.id,revision:paper.revision,review,capabilities:{canonicalDocx}})
  } catch(err) {
    console.error('Paper Studio document review error:',err.message)
    return res.status(500).json({success:false,message:'Paper document review could not be completed.'})
  }
})

router.get('/papers/:id', async (req,res) => {
  try {
    const schoolId = schoolContext(req,res); if(!schoolId)return
    if(!/^\d+$/.test(String(req.params.id||'')))return res.status(400).json({success:false,message:'Invalid paper id.'})
    const paper = await getProjectedPaper({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    if(!paper)return res.status(404).json({success:false,message:'Paper not found in your accessible library.'})
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,data:paper})
  } catch (err) {
    console.error('Paper Studio paper error:', err.message)
    return res.status(500).json({success:false,message:'Paper could not be verified.'})
  }
})

module.exports = router
