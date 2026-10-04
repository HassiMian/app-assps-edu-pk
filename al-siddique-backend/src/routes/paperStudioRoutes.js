const express = require('express')
const router = express.Router()
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { normalizedRole, teacherContext, listProjectedPapers, getProjectedPaper } = require('../services/paperStudioProjectionService')

router.use(protect, requireRoles('super_admin','admin','principal','teacher'))

function schoolContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId) { res.status(403).json({ success:false, message:'School context is required.' }); return null }
  return schoolId
}

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
