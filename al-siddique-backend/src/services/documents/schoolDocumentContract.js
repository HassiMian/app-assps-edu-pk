'use strict'
const KINDS = Object.freeze([
 'notice','circular','office_order','memo','general_datesheet',
 'academic_timetable','bell_schedule','consent','staff_acknowledgement','custom'
])
const LANGUAGES = Object.freeze(['english','urdu','bilingual'])
const AUDIENCES = Object.freeze(['school','parents','students','staff','selected_classes'])
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
 const errors=[]
 if(!KINDS.includes(kind)) errors.push('Unsupported document kind')
 if(!title || title.length<4) errors.push('Title must be at least 4 characters')
 if(!LANGUAGES.includes(language)) errors.push('Unsupported language')
 if(!AUDIENCES.includes(audience)) errors.push('Unsupported audience')
 if(!LAYOUTS.includes(layout)) errors.push('Unsupported layout')
 if(!message && !['general_datesheet','academic_timetable','bell_schedule'].includes(kind)) errors.push('Notice body is required')
 if(!Array.isArray(body.audience_classes||[])) errors.push('Class selection must be an array')
 const classes=Array.isArray(body.audience_classes) ? [...new Set(body.audience_classes.map(v=>tidy(v,80)).filter(Boolean))].slice(0,50) : []
 const dayRows=Array.isArray(content.schedule_rows) ? content.schedule_rows.slice(0,100).map(x=>({
  label:tidy(x?.label,100),start:tidy(x?.start,12),end:tidy(x?.end,12),
  subject:tidy(x?.subject,160),date:tidy(x?.date,12),class:tidy(x?.class,80)
 })) : []
 // Only plain text and enumerated schedule rows, no arbitrary HTML/attachments.
 return {errors,value:{
  document_kind:kind,title,language,audience_kind:audience,audience_classes:classes,
  layout_key:layout,source_type:tidy(body.source_type,50)||null,
  source_ref:tidy(body.source_ref,120)||null,
  source_revision:tidy(body.source_revision,120)||null,
  content:{message,action_required:action,note,signer_label:signedBy,issue_date:issueDate,schedule_rows:dayRows}
 }}
}
module.exports={KINDS,LANGUAGES,AUDIENCES,LAYOUTS,cleanNotice}
