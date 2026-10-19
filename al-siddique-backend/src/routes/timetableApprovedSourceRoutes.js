'use strict'
// Principal-facing read-only approved print source. No timetable DB writes.
// Employee IDs and unknown class sections must not be inferred here.
const express = require('express')
const router = express.Router()
const {protect,requireRoles,requireScopeForServiceOnly} = require('../middleware/auth')
const {currentSchoolId} = require('../middleware/tenant')
const approved = require('../domain/ASSPS_APPROVED_TIMETABLE_SOURCE_20261016.json')
const leader = requireRoles('principal','admin','school_admin','super_admin')

router.get('/approved-source',protect,requireScopeForServiceOnly('school.timetable.read'),leader,(req,res)=>{
  res.set('Cache-Control','private, no-store')
  const schoolId = Number(currentSchoolId(req))
  if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
    return res.status(403).json({success:false,code:'TIMETABLE_SCHOOL_CONTEXT_REQUIRED'})
  }
  if (schoolId !== approved.school_id) {
    return res.status(404).json({success:false,code:'TIMETABLE_APPROVED_SOURCE_NOT_FOUND'})
  }
  return res.json({
    success:true,
    reference_only:true,
    publication_authorized:false,
    teacher_ids_verified:false,
    section_mapping_verified:false,
    source_hash:approved.source_pdf_sha256,
    data:approved,
  })
})
module.exports=router
