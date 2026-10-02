// Phase 3F: READ-ONLY metadata analysis, no pool/DB import, DDL, route or automatic approval.
// Input must be an independently verified PostgreSQL catalog report from the isolated target.
const REQUIRED=['paper_documents','paper_revisions']
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const norm=s=>String(s??'').toLowerCase().replace(/["\s()]/gu,'')
const relationName=r=>String(r?.table_name??r?.tablename??'')
function auditPaperStagingRls({relations,policies,constraints,columns,roleFlags}={}){
 const findings=[]
 const fail=(code,table,detail)=>findings.push({severity:'BLOCK',code,table,detail})
 if(!Array.isArray(relations)||!Array.isArray(policies)||!Array.isArray(constraints)||
  !Array.isArray(columns)||!object(roleFlags))
  return {status:'BLOCKED_MISSING_VERIFIED_CATALOG',findings:[{
   severity:'BLOCK',code:'INVENTORY_MISSING',table:null,
   detail:'Independent read-only PostgreSQL catalog inventory is required.'}],
   schemaEligibleForManualReview:false,approved:false,authorizesSqlExecution:false}
 if(roleFlags.rolsuper!==false||roleFlags.rolbypassrls!==false)
  fail('RLS_BYPASS_ROLE','current_user','Database test/app role must not be superuser or BYPASSRLS.')
 if(roleFlags.revisionsCanUpdate!==false||roleFlags.revisionsCanDelete!==false)
  fail('AUDIT_WRITE_GRANTS','paper_revisions','Append-only revision role must have NO UPDATE/DELETE grants.')
 for(const table of REQUIRED){
  const names=relations.filter(r=>relationName(r)===table&&
   (r.schema_name??r.schemaname)==='public')
  if(names.length!==1){fail('MISSING_OR_AMBIGUOUS_RELATION',table,'Exactly one public base relation required.');continue}
  const rel=names[0]
  if(rel.rls_enabled!==true||rel.force_rls!==true||rel.relation_kind!=='r')
   fail('RLS_NOT_FORCED',table,'Both ENABLE and FORCE ROW LEVEL SECURITY are mandatory on base tables.')
  const available=columns.filter(c=>c.table_name===table&&c.table_schema==='public')
  const required=table==='paper_documents'
   ?['school_id','id','revision','status','source_protected','native_json_text','native_sha256']
   :['school_id','document_id','revision','native_json_text','native_sha256','previous_native_sha256']
  for(const name of required){
   const match=available.filter(c=>c.column_name===name)
   if(match.length!==1||match[0].is_nullable!=='NO'&&name!=='previous_native_sha256')
    fail('COLUMN_CONTRACT',table,'Required non-null native column '+name+' absent or mismatched.')
  }
  const text=available.find(c=>c.column_name==='native_json_text')
  if(text&&text.udt_name!=='text')
   fail('LOSSLESS_NATIVE_TEXT',table,'Must store EXACT native JSON TEXT, not JSONB reserialization.')
  const school=available.find(c=>c.column_name==='school_id')
  if(school&&!['int4','int8'].includes(school.udt_name))
   fail('SCHOOL_ID_TYPE',table,'school_id must match the verified schools PK integer type.')
  const applicable=policies.filter(p=>p.tablename===table&&p.schemaname==='public')
  if(applicable.length!==1){fail('POLICY_CARDINALITY',table,'Require exactly one restrictive, audited tenant policy; extra permissive policies can OR-bypass it.');continue}
  const policy=applicable[0]
  if(policy.cmd!=='ALL')
   fail('POLICY_COMMAND',table,'Policy must enforce BOTH reads and writes (FOR ALL).')
  if(policy.permissive!=='PERMISSIVE')
   fail('POLICY_REVIEW',table,'Policy permissive/restrictive interplay requires additional manual audit.')
  for(const [field,statement] of [['qual',policy.qual],['with_check',policy.with_check]]){
   const n=norm(statement)
   if(!n.includes('school_id')||!n.includes('app.paper_school_id')||
    !n.includes('current_setting')||n.includes('or')||n.includes('app.rls_enabled')||
    n.includes('app.is_super_admin')||n.includes('true=true')||n.includes('coalesce')||
    !n.includes("''"))
    fail('FAIL_OPEN_POLICY',table,field+' is missing or admits a school-scope bypass; strict fail-closed equality to app.paper_school_id required.')
  }
 }
 const own=constraints.find(c=>String(c.table_name).endsWith('paper_documents')&&
  c.constraint_type==='p'&&norm(c.definition).includes('primarykeyschool_id,id'))
 const rev=constraints.find(c=>String(c.table_name).endsWith('paper_revisions')&&
  c.constraint_type==='p'&&norm(c.definition).includes('primarykeyschool_id,document_id,revision'))
 const fk=constraints.find(c=>String(c.table_name).endsWith('paper_revisions')&&
  c.constraint_type==='f'&&norm(c.definition).includes('foreignkeyschool_id,document_id')&&
  norm(c.definition).includes('referencespaper_documentsschool_id,id'))
 if(!own)fail('DOCUMENT_COMPOSITE_PK','paper_documents','Required composite (school_id,id) primary key missing.')
 if(!rev)fail('REVISION_COMPOSITE_PK','paper_revisions','Required composite (school_id,document_id,revision) primary key missing.')
 if(!fk)fail('REVISION_COMPOSITE_FK','paper_revisions','Composite same-school document reference missing.')
 return {status:findings.length?'BLOCKED_SCHEMA_RLS_FINDINGS':'STRUCTURE_CANDIDATE_REQUIRES_INDEPENDENT_SIGNOFF',
  findings,schemaEligibleForManualReview:findings.length===0,
  approved:false,authorizesSqlExecution:false,
  remainingMandatoryGates:['verified non-production target','real PostgreSQL integration with non-bypass role',
   'encrypted backup plus separate restore exercise','independently reviewed original DATA+PNG+PDF+manifest',
   'human-reviewed grants/trigger/search_path', 'two-school RLS integration and approved-paper immutability']}
}
// Legacy migration's permissive RLS fallback is a known risk; never reuse it on new paper tables.
function diagnoseLegacyFailOpenRls(policySource){
 const src=String(policySource??'')
 return {legacyRlsEnabledFlagBypass:/current_setting\(['"]app\.rls_enabled['"][\s\S]{0,65}is\s+distinct\s+from\s+['"]true['"]/iu.test(src),
  legacySuperAdminBranch:/app\.is_super_admin/iu.test(src),
  safeToCopyIntoPaperTables:false}
}
module.exports={auditPaperStagingRls,diagnoseLegacyFailOpenRls}
