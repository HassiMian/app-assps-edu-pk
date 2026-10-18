'use strict'
// Restricted personnel-document drafting contract. No public noticeboard
// registration, no automatic discipline, no publish/deliver operation.
const TEMPLATES=Object.freeze({
 punctuality_clarification:{
  title:'Request for Clarification — Reporting Time',
  opening:'Please review the attendance records referenced below and provide your explanation regarding the indicated reporting time.'
 },
 absence_clarification:{
  title:'Request for Clarification — Recorded Absence',
  opening:'Please review the indicated attendance record and provide any relevant explanation or supporting documentation.'
 },
 duty_review:{
  title:'Professional Duty Review',
  opening:'The school administration requests your written response regarding the professional matter described below.'
 },
 show_cause_draft:{
  title:'Confidential Show-Cause Draft',
  opening:'You are requested to provide a written explanation concerning the matter specified below. No conclusion has been reached by this draft.'
 },
 warning_draft:{
  title:'Confidential Warning Draft — Human Approval Required',
  opening:'This draft is prepared for management review. Any official warning requires verified evidence, applicable policy and authorized human approval.'
 },
 staff_appreciation:{
  title:'Staff Appreciation Draft',
  opening:'The school administration wishes to recognize the contribution described below.'
 }
})
const dateValid=s=>{
 if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s))return false
 const d=new Date(s+'T00:00:00Z')
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s
}
const text=(v,max)=>typeof v==='string'&&v.trim()&&v.trim().length<=max&&!/[<>\u0000-\u001f]/u.test(v)?v.trim():null
function createConfidentialStaffDraft(input){
 const errors=[]
 const template=TEMPLATES[input?.template_key]
 if(!template)errors.push('UNKNOWN_TEMPLATE')
 const employeeRef=text(input?.recipient_employee_reference,100)
 if(!employeeRef)errors.push('EMPLOYEE_REFERENCE_REQUIRED')
 const facts=text(input?.verified_facts_summary,2400)
 if(!facts)errors.push('FACTS_REQUIRED')
 const policy=text(input?.applicable_policy_reference,200)
 if(!policy)errors.push('POLICY_REFERENCE_REQUIRED')
 if(!dateValid(input?.incident_date))errors.push('INCIDENT_DATE_REQUIRED')
 if(input?.response_due_date!=null&&!dateValid(input.response_due_date))errors.push('INVALID_RESPONSE_DUE_DATE')
 if(dateValid(input?.incident_date)&&dateValid(input?.response_due_date)&&input.response_due_date<input.incident_date)errors.push('DUE_DATE_BEFORE_INCIDENT')
 const evidence=Array.isArray(input?.evidence_reference_ids)?input.evidence_reference_ids:[]
 if(evidence.length>10 || evidence.some(x=>!text(x,100)))errors.push('INVALID_EVIDENCE_REFERENCES')
 if(input?.approved===true||input?.published===true||input?.auto_penalty===true||input?.signed===true)errors.push('AUTOMATED_AUTHORIZATION_DENIED')
 if(errors.length)return {errors:[...new Set(errors)],draft:null}
 return {errors:[],draft:{
  template_key:input.template_key,
  document_kind:'confidential_staff_correspondence',
  status:'draft_pending_employee_verification',
  audience_kind:'individual_staff_private',
  recipient_employee_reference:employeeRef,
  recipient_account_verified:false,
  incident_date:input.incident_date,
  response_due_date:input.response_due_date||null,
  title:template.title,
  message:template.opening,
  facts_summary:facts,
  policy_reference:policy,
  evidence_reference_ids:evidence,
  human_review_required:true,
  publication_authorized:false,
  signed:false,
  employee_delivery_authorized:false,
  automatic_disciplinary_action:false,
  acknowledgment_is_agreement:false,
  response_preserved_separately:true
 }}
}
module.exports={TEMPLATES,createConfidentialStaffDraft}
