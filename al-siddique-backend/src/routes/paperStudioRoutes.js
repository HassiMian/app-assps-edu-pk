const express = require('express')
const router = express.Router()
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { normalizedRole, teacherContext, listProjectedPapers, getProjectedPaper } = require('../services/paperStudioProjectionService')
const { buildCanonicalCutoverReadiness } = require('../services/papers/paperCanonicalCutoverReadinessV6F')
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

router.get('/papers/:id/document-review', async (req,res) => {
  try {
    const schoolId = schoolContext(req,res); if(!schoolId)return
    if(!/^\d+$/.test(String(req.params.id||'')))return res.status(400).json({success:false,message:'Invalid paper id.'})
    const paper=await getProjectedPaper({schoolId,userId:req.user?.id,role:normalizedRole(req),paperId:req.params.id})
    if(!paper)return res.status(404).json({success:false,message:'Paper not found in your accessible library.'})
    const review=await reviewPortalPaperDocument(paper.document)
    res.set('Cache-Control','private, no-store')
    return res.json({success:true,paperId:paper.id,revision:paper.revision,review})
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
