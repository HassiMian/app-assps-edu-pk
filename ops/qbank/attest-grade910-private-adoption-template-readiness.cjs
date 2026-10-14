#!/usr/bin/env node
'use strict'
const forms=require('./prepare-grade910-private-school-adoption-forms.cjs')
const fail=x=>{throw Error('ASSPS_GRADE910_REAL_PRIVATE_ADOPTION_READINESS_'+x)}
function check(env=process.env){
 const base=env.ASSPS_QBANK_PRIVATE_ADOPTION_BASE,
  runId=env.ASSPS_QBANK_PRIVATE_ADOPTION_RUN
 if(!base&&!runId)return{privateRealAdoptionTemplateArchiveConfigured:false,
  verifiedUnsignedAdoptionTemplates:0,
  actualAuthenticatedSchoolAdoptionCertificates:0,publication:'HOLD'}
 if(!base||!runId)fail('PARTIAL_PRIVATE_ADOPTION_ARCHIVE_CONFIGURATION')
 const v=forms.verify({base,runId})
 if(v.verifiedUnsignedForms!==56||v.originalResearchQuestionRefs!==2581||
  v.authenticatedSchoolAdoptionCertificates!==0)fail('ACTUAL_PRIVATE_ADOPTION_TEMPLATE_DRIFT')
 return{privateRealAdoptionTemplateArchiveConfigured:true,
  verifiedUnsignedAdoptionTemplates:v.verifiedUnsignedForms,
  actualAuthenticatedSchoolAdoptionCertificates:0,
  publication:'HOLD'}
}
if(require.main===module)try{console.log(JSON.stringify(check()))}
catch(e){console.error(e.message);process.exitCode=2}
module.exports={check}
