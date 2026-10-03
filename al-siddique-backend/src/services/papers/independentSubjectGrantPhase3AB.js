// Phase 3AB — DORMANT server-owned independent staff → subject grant resolver.
// No HTTP route, production import, generic DB credential, writes or implicit admin bypass.
const GATE_LABEL='PHASE3AB_INDEPENDENT_SCHOOL_SUBJECT_GRANT_STAGING_ONLY'
const roles=new Set(['teacher','principal','admin'])
const fields=['authority','grade','subjectId','textbookId','edition','syllabusVersion']
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const str=x=>typeof x==='string'&&x.trim().length>0
const pos=x=>Number.isSafeInteger(x)&&x>0
const clone=x=>JSON.parse(JSON.stringify(x))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const refuse=x=>{throw Error('Phase3AB refused: '+x)}
const exact=(x,y,keys)=>keys.every(k=>x?.[k]===y?.[k])
const identityGood=x=>obj(x)&&fields.every(k=>k==='grade'?pos(x.grade):str(x[k]))
function checkRequest(r){
 if(!obj(r)||!pos(r.schoolId)||!str(r.tenantId)||r.tenantId.length>128||
    !pos(r.actorId)||!roles.has(r.role)||!identityGood(r.curriculumIdentity)||
    !obj(r.selection)||!['full','alp'].includes(r.selection.syllabusMode)||
    (r.selection.syllabusMode==='full'&&r.selection.examYear!==null)||
    (r.selection.syllabusMode==='alp'&&!pos(r.selection.examYear)))
  refuse('server-resolved actor, academic identity and verified Full/ALP scope required')
 return {schoolId:r.schoolId,tenantId:r.tenantId,actorId:r.actorId,role:r.role,
  curriculumIdentity:clone(r.curriculumIdentity),selection:clone(r.selection)}
}
function checkSchool(s,r){
 if(s?.source!=='INDEPENDENT_SCHOOL_REGISTRY'||s?.id!==r.schoolId||
    s?.tenant_id!==r.tenantId||s?.status!=='active'||
    s?.paperAuthoringStagingApproved!==true||s?.isDemo===true)
  refuse('active independently enabled school and tenant mapping required')
}
function checkStaff(u,r){
 if(u?.source!=='INDEPENDENT_SCHOOL_STAFF_ROSTER'||
    u?.id!==r.actorId||u?.school_id!==r.schoolId||u?.tenant_id!==r.tenantId||
    u?.role!==r.role||u?.status!=='active'||u?.account_type!=='human'||
    u?.paperAuthoringEligible!==true||!roles.has(u?.role))
  refuse('active, human, same-school independently enrolled staff required')
}
function checkAssignment(a,r,now){
 if(a?.source!=='SCHOOL_APPROVED_STAFF_ASSIGNMENT'||a?.status!=='ACTIVE'||
    !str(a?.assignmentId)||a.schoolId!==r.schoolId||a.tenantId!==r.tenantId||
    a.actorId!==r.actorId||a.role!==r.role||a.grade!==r.curriculumIdentity.grade||
    a.subjectId!==r.curriculumIdentity.subjectId||!str(a.subjectRef)||
    !str(a.classId)||!str(a.syllabusId)||!pos(a.validFromMs)||
    !pos(a.validUntilMs)||now<a.validFromMs||now>=a.validUntilMs||
    !pos(a.review?.approvedByStaffId)||a.review.approvedByStaffId===r.actorId||
    !str(a.review?.evidenceId)||!pos(a.review?.approvedAtMs)||
    a.review.approvedAtMs>now)
  refuse('current independent staff/class/subject assignment and nonself review required')
}
function checkBinding(b,a,r){
 if(b?.source!=='INDEPENDENT_CURRICULUM_BINDING'||b?.status!=='ACTIVE'||
    b.assignmentId!==a.assignmentId||b.schoolId!==r.schoolId||
    b.tenantId!==r.tenantId||b.subjectRef!==a.subjectRef||
    b.classId!==a.classId||b.syllabusId!==a.syllabusId||
    !exact(b.curriculumIdentity,r.curriculumIdentity,fields)||
    !str(b.approvalEvidenceId)||!pos(b.approvedByStaffId)||
    b.approvedByStaffId===r.actorId)
  refuse('independently reviewed exact textbook edition and classroom binding required')
 if(r.selection.syllabusMode==='full'&&b.fullTextbookApproved!==true)
  refuse('unrestricted Full textbook binding is not independently approved')
 if(r.selection.syllabusMode==='alp'&&(!Array.isArray(b.alpApprovals)||
    !b.alpApprovals.some(v=>v?.examYear===r.selection.examYear&&
     v.status==='INDEPENDENTLY_VERIFIED'&&str(v.evidenceId))))
  refuse('ALP requires separately verified exam-year evidence')
}
function createPhase3ABSubjectGrantResolver({gate,readSchool,readStaff,
 readAssignment,readCurriculumBinding,clock=Date.now}={}){
 if(process.env.NODE_ENV==='production'||gate?.label!==GATE_LABEL||
    gate.confirmedNotProduction!==true||gate.independentRosterReviewPassed!==true||
    gate.subjectAssignmentRegistryReviewed!==true||
    gate.curriculumBindingRegistryReviewed!==true||
    gate.noImplicitPrincipalAdminBypass!==true||
    ![readSchool,readStaff,readAssignment,readCurriculumBinding,clock]
      .every(x=>typeof x==='function'))
  refuse('reviewed, strictly read-only, nonproduction grant registry ports required')
 return async function resolveSubjectGrant(input){
  if(process.env.NODE_ENV==='production')refuse('production grant resolver disabled')
  const r=checkRequest(input),now=clock()
  if(!pos(now))refuse('trusted time invalid')
  const school=await readSchool({schoolId:r.schoolId})
  checkSchool(school,r)
  const staff=await readStaff({schoolId:r.schoolId,tenantId:r.tenantId,actorId:r.actorId})
  checkStaff(staff,r)
  // Assignment comes from a separate school-authorized registry, not request role/claims.
  const req={schoolId:r.schoolId,tenantId:r.tenantId,actorId:r.actorId,
   role:r.role,grade:r.curriculumIdentity.grade,subjectId:r.curriculumIdentity.subjectId}
  const assigned=await readAssignment(clone(req))
  checkAssignment(assigned,r,now)
  const bound=await readCurriculumBinding({schoolId:r.schoolId,tenantId:r.tenantId,
   assignmentId:assigned.assignmentId,curriculumIdentity:clone(r.curriculumIdentity),
   selection:clone(r.selection)})
  checkBinding(bound,assigned,r)
  // Recheck the authoritative roster at the final boundary; independent gateway repeats
  // its own auth/current-publication checks after this advisory grant is issued.
  const [schoolAgain,staffAgain,assignmentAgain,bindingAgain]=await Promise.all([
   readSchool({schoolId:r.schoolId}),
   readStaff({schoolId:r.schoolId,tenantId:r.tenantId,actorId:r.actorId}),
   readAssignment(clone(req)),
   readCurriculumBinding({schoolId:r.schoolId,tenantId:r.tenantId,
    assignmentId:assigned.assignmentId,curriculumIdentity:clone(r.curriculumIdentity),
    selection:clone(r.selection)})
  ])
  checkSchool(schoolAgain,r);checkStaff(staffAgain,r)
  checkAssignment(assignmentAgain,r,now);checkBinding(bindingAgain,assignmentAgain,r)
  if(!same(school,schoolAgain)||!same(staff,staffAgain)||
     !same(assigned,assignmentAgain)||!same(bound,bindingAgain))
   refuse('school, staff, assignment or textbook binding changed during grant read')
  return {status:'AUTHORIZED',schoolId:r.schoolId,tenantId:r.tenantId,
   actorId:r.actorId,role:r.role,subject:{id:assigned.subjectRef,
    classId:assigned.classId,syllabusId:assigned.syllabusId,
    curriculumBinding:clone(r.curriculumIdentity)}}
 }
}
module.exports={GATE_LABEL,createPhase3ABSubjectGrantResolver}
