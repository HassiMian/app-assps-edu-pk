'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {TEMPLATES,createConfidentialStaffDraft}=require('../domain/confidentialStaffNoticeDraft')
const input=(key='punctuality_clarification')=>({
 template_key:key,
 recipient_employee_reference:'EMP-EXAMPLE-ONLY',
 incident_date:'2026-10-16',
 response_due_date:'2026-10-20',
 verified_facts_summary:'This is an example factual record awaiting management review.',
 applicable_policy_reference:'ASSPS STAFF POLICY - example reference',
 evidence_reference_ids:['example-attendance-ref']
})
test('six private templates cover notices, warnings and appreciation',()=>{
 assert.equal(Object.keys(TEMPLATES).length,6)
 for(const kind of Object.keys(TEMPLATES)){
  const r=createConfidentialStaffDraft(input(kind))
  assert.deepEqual(r.errors,[])
  assert.equal(r.draft.status,'draft_pending_employee_verification')
  assert.equal(r.draft.audience_kind,'individual_staff_private')
  assert.equal(r.draft.publication_authorized,false)
  assert.equal(r.draft.signed,false)
  assert.equal(r.draft.employee_delivery_authorized,false)
  assert.equal(r.draft.automatic_disciplinary_action,false)
 }
})
test('a warning draft does not assert misconduct or authorization',()=>{
 const v=createConfidentialStaffDraft(input('warning_draft')).draft
 assert.ok(v.message.includes('requires verified evidence'))
 assert.equal(v.recipient_account_verified,false)
 assert.equal(v.acknowledgment_is_agreement,false)
})
test('reject client attempts to force approval, signature, publication or penalty',()=>{
 for(const field of ['approved','published','signed','auto_penalty']){
  const data=input();data[field]=true
  assert.ok(createConfidentialStaffDraft(data).errors.includes('AUTOMATED_AUTHORIZATION_DENIED'))
 }
})
test('reject missing employee, facts, policy reference, date',()=>{
 const r=input();delete r.recipient_employee_reference
 assert.ok(createConfidentialStaffDraft(r).errors.includes('EMPLOYEE_REFERENCE_REQUIRED'))
 const f=input();delete f.verified_facts_summary
 assert.ok(createConfidentialStaffDraft(f).errors.includes('FACTS_REQUIRED'))
 const p=input();p.applicable_policy_reference=''
 assert.ok(createConfidentialStaffDraft(p).errors.includes('POLICY_REFERENCE_REQUIRED'))
 const d=input();d.incident_date='tomorrow'
 assert.ok(createConfidentialStaffDraft(d).errors.includes('INCIDENT_DATE_REQUIRED'))
})
test('reject HTML-like content in factual or policy fields',()=>{
 const a=input();a.verified_facts_summary='<img src=x onerror=alert(1)>'
 assert.ok(createConfidentialStaffDraft(a).errors.includes('FACTS_REQUIRED'))
})
test('reject malformed evidence reference collections and unsafe dates',()=>{
 const a=input();a.evidence_reference_ids=Array(11).fill('x')
 assert.ok(createConfidentialStaffDraft(a).errors.includes('INVALID_EVIDENCE_REFERENCES'))
 const impossible=input();impossible.incident_date='2026-02-30'
 assert.ok(createConfidentialStaffDraft(impossible).errors.includes('INCIDENT_DATE_REQUIRED'))
 const before=input();before.response_due_date='2026-10-15'
 assert.ok(createConfidentialStaffDraft(before).errors.includes('DUE_DATE_BEFORE_INCIDENT'))
 const b=input();b.response_due_date='Not a date'
 assert.ok(createConfidentialStaffDraft(b).errors.includes('INVALID_RESPONSE_DUE_DATE'))
})
test('private staff document is structurally separate from public notices',()=>{
 const v=createConfidentialStaffDraft(input('show_cause_draft')).draft
 assert.notEqual(v.document_kind,'notice')
 assert.notEqual(v.audience_kind,'school')
 assert.equal(v.human_review_required,true)
 assert.equal(v.response_preserved_separately,true)
})
