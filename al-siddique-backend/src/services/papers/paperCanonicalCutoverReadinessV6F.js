// V6-F — production-safe readiness probe only. It never creates/migrates tables.
const { query } = require('../../config/database')
const { verifyCanonicalRendererEvidence } = require('./paperRendererEvidenceV6F4')
const REQUIRED_TABLES=['paper_documents','paper_revisions']
const envTrue=name=>String(process.env[name]||'').trim().toLowerCase()==='true'
async function tableExists(name){const r=await query("select exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1 and c.relkind in ('r','p')) ok",[name]);return Boolean(r.rows[0]?.ok)}
const SAFE_COUNT_TABLES=new Set(['paper_vault','paper_vault_revision_history','saved_papers','paper_documents','paper_revisions'])
async function tableCount(name){
 if(!SAFE_COUNT_TABLES.has(name))throw Error('unsupported readiness count table')
 if(!await tableExists(name))return {value:null,accuracy:'ABSENT'}
 const priv=await query('select has_table_privilege(current_user,$1,\'SELECT\') ok',[`public.${name}`])
 if(priv.rows[0]?.ok){const r=await query(`select count(*)::int n from ${name}`);return {value:Number(r.rows[0]?.n||0),accuracy:'EXACT'}}
 const r=await query("select coalesce(s.n_live_tup,0)::bigint n from pg_stat_all_tables s where s.schemaname='public' and s.relname=$1",[name]);return {value:Number(r.rows[0]?.n||0),accuracy:'PG_STAT_ESTIMATE'}
}
async function rlsState(name){if(!await tableExists(name))return null;const r=await query("select c.relrowsecurity as enabled,c.relforcerowsecurity as forced,pg_get_userbyid(c.relowner) owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1",[name]);return r.rows[0]||null}
async function roleState(name){const r=await query('select rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin from pg_roles where rolname=$1',[name]);return r.rows[0]||null}
async function payloadContractState(){
 if(!await tableExists('paper_documents')||!await tableExists('paper_revisions'))return []
 const names=['paper_documents_payload_discriminator_v6f2_ck','paper_revisions_payload_discriminator_v6f2_ck']
 const r=await query(`select c.conname,c.convalidated,cl.relname as table_name,pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_class cl on cl.oid=c.conrelid where c.conname=any($1::text[]) order by c.conname`,[names])
 return r.rows
}
async function runtimeMembership(){const r=await query(`select m.inherit_option,m.set_option,m.admin_option from pg_auth_members m join pg_roles role on role.oid=m.roleid join pg_roles member on member.oid=m.member where role.rolname='apex_paper_runtime' and member.rolname='apexos_user'`);return r.rows[0]||null}
async function privilegeState(){
 if(!await tableExists('paper_documents')||!await tableExists('paper_revisions'))return null
 const r=await query(`select
  has_table_privilege('apex_paper_runtime','paper_documents','SELECT') runtime_docs_select,
  has_table_privilege('apex_paper_runtime','paper_documents','INSERT') runtime_docs_insert,
  has_table_privilege('apex_paper_runtime','paper_documents','UPDATE') runtime_docs_update,
  has_table_privilege('apex_paper_runtime','paper_documents','DELETE') runtime_docs_delete,
  has_table_privilege('apex_paper_runtime','paper_revisions','SELECT') runtime_revs_select,
  has_table_privilege('apex_paper_runtime','paper_revisions','INSERT') runtime_revs_insert,
  has_table_privilege('apex_paper_runtime','paper_revisions','UPDATE') runtime_revs_update,
  has_table_privilege('apex_paper_runtime','paper_revisions','DELETE') runtime_revs_delete,
  has_table_privilege('apexos_user','paper_documents','SELECT') app_docs_direct_select,
  has_table_privilege('apexos_user','paper_revisions','SELECT') app_revs_direct_select`)
 return r.rows[0]||null
}
async function policyState(){
 if(!await tableExists('paper_documents')||!await tableExists('paper_revisions'))return []
 const r=await query(`select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname`,[REQUIRED_TABLES])
 return r.rows
}
async function triggerState(){
 if(!await tableExists('paper_documents')||!await tableExists('paper_revisions'))return []
 const r=await query(`select c.relname table_name,t.tgname trigger_name from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal and t.tgname=any($1::text[]) order by c.relname,t.tgname`,[[
  'trg_paper_documents_write_guard_v6f1','trg_paper_revisions_write_guard_v6f1','trg_paper_revisions_immutable_v6f1','trg_paper_documents_no_delete_v6f1'
 ]])
 return r.rows
}
async function buildCanonicalCutoverReadiness(){
 const tableMap={};for(const t of REQUIRED_TABLES)tableMap[t]=await tableExists(t)
 const registryPresent=REQUIRED_TABLES.every(t=>tableMap[t])
 const countMeta={paperVault:await tableCount('paper_vault'),revisionJournal:await tableCount('paper_vault_revision_history'),legacySavedPapers:await tableCount('saved_papers'),canonicalDocuments:await tableCount('paper_documents'),canonicalRevisions:await tableCount('paper_revisions')}
 const counts=Object.fromEntries(Object.entries(countMeta).map(([k,v])=>[k,v.value]));const countAccuracy=Object.fromEntries(Object.entries(countMeta).map(([k,v])=>[k,v.accuracy]))
 const rls={};for(const t of REQUIRED_TABLES)rls[t]=await rlsState(t)
 const roles={owner:await roleState('apex_paper_owner'),runtime:await roleState('apex_paper_runtime'),app:await roleState('apexos_user'),membership:await runtimeMembership()}
 const privileges=await privilegeState(),policies=await policyState(),triggers=await triggerState()
 const runtimeRoleApproved=Boolean(registryPresent&&roles.owner&&!roles.owner.rolsuper&&!roles.owner.rolbypassrls&&!roles.owner.rolcanlogin&&roles.runtime&&!roles.runtime.rolsuper&&!roles.runtime.rolbypassrls&&!roles.runtime.rolcanlogin&&roles.membership?.inherit_option===false&&roles.membership?.set_option===true&&REQUIRED_TABLES.every(t=>rls[t]?.owner==='apex_paper_owner')&&privileges?.runtime_docs_select===true&&privileges?.runtime_docs_insert===true&&privileges?.runtime_docs_update===true&&privileges?.runtime_docs_delete===false&&privileges?.runtime_revs_select===true&&privileges?.runtime_revs_insert===true&&privileges?.runtime_revs_update===false&&privileges?.runtime_revs_delete===false&&privileges?.app_docs_direct_select===false&&privileges?.app_revs_direct_select===false)
 const tenantRlsApproved=Boolean(registryPresent&&REQUIRED_TABLES.every(t=>rls[t]?.enabled===true&&rls[t]?.forced===true)&&policies.length===2&&policies.every(p=>p.policyname==='canonical_tenant_isolation'&&String(p.roles||'').includes('apex_paper_runtime')&&String(p.qual||'').includes('app.tenant_id')&&String(p.qual||'').includes('school_id')))
 const writeDefenseApproved=Boolean(registryPresent&&triggers.length===4)
 const payloadContracts=await payloadContractState()
 const payloadContractApproved=Boolean(registryPresent&&payloadContracts.length===2&&payloadContracts.every(c=>c.convalidated===true&&String(c.definition||'').includes(`payload ->> 'format'`)&&String(c.definition||'').includes('document_format')&&String(c.definition||'').includes('schema_version')))
 const rendererApprovalFlag=envTrue('PAPER_CANONICAL_RENDERER_PARITY_APPROVED')
 const rendererEvidence=await verifyCanonicalRendererEvidence()
 const gates={
  canonicalRegistryPresent:registryPresent,
  canonicalRuntimeRoleApproved:runtimeRoleApproved,
  canonicalWriteDefenseApproved:writeDefenseApproved,
  canonicalPayloadContractApproved:payloadContractApproved,
  curriculumPublisherProductionApproved:envTrue('PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED'),
  canonicalRendererParityApproved:Boolean(rendererApprovalFlag&&rendererEvidence.valid),
  canonicalRendererApprovalFlagSet:rendererApprovalFlag,
  canonicalRendererEvidenceVerified:rendererEvidence.valid,
  canonicalRegistryWriteEnabled:envTrue('PAPER_CANONICAL_REGISTRY_WRITE_ENABLED'),
  backupRestoreDrillApproved:envTrue('PAPER_CANONICAL_BACKUP_RESTORE_APPROVED'),
  tenantRlsApproved,
 }
 const blockers=[]
 if(!gates.canonicalRegistryPresent)blockers.push('CANONICAL_REGISTRY_ABSENT')
 if(gates.canonicalRegistryPresent&&!gates.canonicalRuntimeRoleApproved)blockers.push('CANONICAL_RUNTIME_ROLE_NOT_APPROVED')
 if(gates.canonicalRegistryPresent&&!gates.tenantRlsApproved)blockers.push('CANONICAL_REGISTRY_RLS_NOT_APPROVED')
 if(gates.canonicalRegistryPresent&&!gates.canonicalWriteDefenseApproved)blockers.push('CANONICAL_WRITE_DEFENSE_NOT_APPROVED')
 if(gates.canonicalRegistryPresent&&!gates.canonicalPayloadContractApproved)blockers.push('CANONICAL_PAYLOAD_CONTRACT_NOT_APPROVED')
 if(!gates.curriculumPublisherProductionApproved)blockers.push('CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED')
 if(gates.canonicalRendererApprovalFlagSet&&!gates.canonicalRendererEvidenceVerified)blockers.push('CANONICAL_RENDERER_EVIDENCE_INVALID')
 if(!gates.canonicalRendererParityApproved)blockers.push('CANONICAL_RENDERER_PARITY_NOT_APPROVED')
 if(!gates.backupRestoreDrillApproved)blockers.push('BACKUP_RESTORE_DRILL_NOT_APPROVED')
 if(!gates.canonicalRegistryWriteEnabled)blockers.push('CANONICAL_REGISTRY_WRITE_DISABLED')
 const ready=blockers.length===0
 return {architectureVersion:'v6-f-readiness-4',mode:'READ_ONLY_CUTOVER_READINESS',ready,gates,blockers,rendererEvidence:{valid:rendererEvidence.valid,issues:rendererEvidence.issues,manifestSha:rendererEvidence.manifestSha,sourceCommit:rendererEvidence.sourceCommit,buildId:rendererEvidence.buildId,variantCount:rendererEvidence.variantCount,liveVerified:rendererEvidence.liveVerified},storage:{activePortalRepository:'paper_vault',activeRevisionRepository:'paper_vault_revision_history',canonicalTarget:REQUIRED_TABLES,tablePresence:tableMap,counts,countAccuracy,rls,roles:{owner:roles.owner,runtime:roles.runtime,appBypassRls:Boolean(roles.app?.rolbypassrls),membership:roles.membership},privileges,payloadContracts,policies:policies.map(p=>({table:p.tablename,policy:p.policyname,roles:p.roles,cmd:p.cmd})),triggers},policy:{dualWriteAllowed:false,destructiveMigrationAllowed:false,automaticSourceIdentityFabricationAllowed:false,teacherFacingStorageDetails:false,directBypassRoleCanonicalAccessAllowed:false,canonicalRoleEscalationRequiresExplicitSetRole:true},checkedAt:new Date().toISOString()}
}
module.exports={buildCanonicalCutoverReadiness}
