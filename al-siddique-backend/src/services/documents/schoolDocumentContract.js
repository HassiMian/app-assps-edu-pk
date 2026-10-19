'use strict'
const KINDS = Object.freeze([
 'notice','circular','office_order','memo','general_datesheet',
 'academic_timetable','bell_schedule','consent','staff_acknowledgement','custom',
 'staff_punctuality','staff_absence','duty_concern','staff_warning','show_cause','improvement_plan','staff_appreciation'
])
const LANGUAGES = Object.freeze(['english','urdu','bilingual'])
const AUDIENCES = Object.freeze(['school','parents','students','staff','selected_classes','staff_private'])
const LAYOUTS = Object.freeze(['prism','authority','academic','minimal'])
const tidy = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : ''

function cleanNotice(body) {
 if(!body || typeof body !== 'object' || Array.isArray(body)) return {errors:['Document payload required']}
 const kind=tidy(body.document_kind,60)
 const title=tidy(body.title,220)
 const language=tidy(body.language||'english',16)
 const audience=tidy(body.audience_kind||'school',40)
 const layout=tidy(body.layout_key||'prism',40)
 const content=body.content && typeof body.content==='object' && !Array.isArray(body.content) ? body.content : {}
 const message=tidy(content.message,7000)
 const action=tidy(content.action_required,1200)
 const note=tidy(content.note,1600)
 const signedBy=tidy(content.signer_label,140)
 const issueDate=tidy(content.issue_date,10)
 const targetEmpId=body.target_employee_id ? parseInt(body.target_employee_id, 10) : (content.target_employee_id ? parseInt(content.target_employee_id, 10) : null)
 const empName=tidy(body.employee_name || content.employee_name, 150)

 const incidentDate=tidy(content.incident_date, 12)
 const policyRef=tidy(content.policy_reference, 250)
 const incidentDesc=tidy(content.incident_description, 5000)
 const requestedAction=tidy(content.requested_action, 2000)
 const responseDeadline=tidy(content.response_deadline, 12)
 const employeeResponse=tidy(content.employee_response, 5000)
 const managementOutcome=tidy(content.management_outcome, 2000)

 const errors=[]
 if(!KINDS.includes(kind)) errors.push('Unsupported document kind')
 if(!title || title.length<4) errors.push('Title must be at least 4 characters')
 if(!LANGUAGES.includes(language)) errors.push('Unsupported language')
 if(!AUDIENCES.includes(audience)) errors.push('Unsupported audience')
 if(!LAYOUTS.includes(layout)) errors.push('Unsupported layout')
 if(!message && !['general_datesheet','academic_timetable','bell_schedule'].includes(kind) && !incidentDesc) errors.push('Notice body or incident description is required')
 if(!Array.isArray(body.audience_classes||[])) errors.push('Class selection must be an array')

 if(audience === 'staff_private' && !targetEmpId) {
   errors.push('Target employee selection is required for confidential staff correspondence')
 }

 const classes=Array.isArray(body.audience_classes) ? [...new Set(body.audience_classes.map(v=>tidy(v,80)).filter(Boolean))].slice(0,50) : []
 const dayRows=Array.isArray(content.schedule_rows) ? content.schedule_rows.slice(0,100).map(x=>({
  label:tidy(x?.label,100),start:tidy(x?.start,12),end:tidy(x?.end,12),
  subject:tidy(x?.subject,160),date:tidy(x?.date,12),class:tidy(x?.class,80)
 })) : []

 return {errors,value:{
  document_kind:kind,title,language,audience_kind:audience,audience_classes:classes,
  layout_key:layout,source_type:tidy(body.source_type,50)||null,
  source_ref:tidy(body.source_ref,120)||null,
  source_revision:tidy(body.source_revision,120)||null,
  target_employee_id:targetEmpId,
  employee_name:empName,
  content:{
    message,
    action_required:action,
    note,
    signer_label:signedBy,
    issue_date:issueDate,
    schedule_rows:dayRows,
    target_employee_id:targetEmpId,
    employee_name:empName,
    incident_date:incidentDate,
    policy_reference:policyRef,
    incident_description:incidentDesc,
    requested_action:requestedAction,
    response_deadline:responseDeadline,
    employee_response:employeeResponse,
    management_outcome:managementOutcome,
    acknowledged_at:content.acknowledged_at||null,
    acknowledged_by_employee:content.acknowledged_by_employee||null
  }
 }}
}

const PRESET_FIELD_NAMES=Object.freeze([
 'academic session','date','date/day','destination','due date','end time',
 'event name','month','period/date','reason','reopening date','start time',
 'term','time','time/venue','venue/time','weather/safety situation'
])
const PRESET_FIELD_SET=new Set(PRESET_FIELD_NAMES)

function unresolvedPresetFields(content) {
 if(typeof content==='string') {
  try { content=JSON.parse(content) } catch { return ['invalid_document_content'] }
 }
 if(!content || typeof content!=='object' || Array.isArray(content)) {
  return ['invalid_document_content']
 }
 const outstanding=new Set()
 for(const key of ['message','action_required','note','incident_description','requested_action']) {
  if(typeof content[key]!=='string')continue
  for(const match of content[key].matchAll(/\[([^\]\r\n]{1,60})\]/g)) {
   const name=match[1].toLowerCase().replace(/\s+/g,' ').trim()
   if(PRESET_FIELD_SET.has(name))outstanding.add(name)
  }
 }
 return [...outstanding].sort()
}

module.exports={KINDS,LANGUAGES,AUDIENCES,LAYOUTS,cleanNotice,PRESET_FIELD_NAMES,unresolvedPresetFields}
