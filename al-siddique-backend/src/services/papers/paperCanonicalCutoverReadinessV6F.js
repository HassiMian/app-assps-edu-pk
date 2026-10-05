// V6-F — production-safe readiness probe only. It never creates/migrates tables.
const { query } = require('../../config/database')
const REQUIRED_TABLES=['paper_documents','paper_revisions']
const envTrue=name=>String(process.env[name]||'').trim().toLowerCase()==='true'
async function tableExists(name){const r=await query("select exists(select 1 from information_schema.tables where table_schema='public' and table_name=$1) ok",[name]);return Boolean(r.rows[0]?.ok)}
async function tableCount(name){if(!await tableExists(name))return null;const r=await query(`select count(*)::int n from ${name}`);return Number(r.rows[0]?.n||0)}
async function rlsState(name){if(!await tableExists(name))return null;const r=await query('select relrowsecurity as enabled, relforcerowsecurity as forced from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=\'public\' and c.relname=$1',[name]);return r.rows[0]||null}
async function buildCanonicalCutoverReadiness(){
 const tableMap={};for(const t of REQUIRED_TABLES)tableMap[t]=await tableExists(t)
 const counts={paperVault:await tableCount('paper_vault'),revisionJournal:await tableCount('paper_vault_revision_history'),legacySavedPapers:await tableCount('saved_papers'),canonicalDocuments:await tableCount('paper_documents'),canonicalRevisions:await tableCount('paper_revisions')}
 const rls={};for(const t of REQUIRED_TABLES)rls[t]=await rlsState(t)
 const gates={
  canonicalRegistryPresent:REQUIRED_TABLES.every(t=>tableMap[t]),
  curriculumPublisherProductionApproved:envTrue('PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED'),
  canonicalRendererParityApproved:envTrue('PAPER_CANONICAL_RENDERER_PARITY_APPROVED'),
  canonicalRegistryWriteEnabled:envTrue('PAPER_CANONICAL_REGISTRY_WRITE_ENABLED'),
  backupRestoreDrillApproved:envTrue('PAPER_CANONICAL_BACKUP_RESTORE_APPROVED'),
  tenantRlsApproved:REQUIRED_TABLES.every(t=>rls[t]?.enabled===true&&rls[t]?.forced===true),
 }
 const blockers=[]
 if(!gates.canonicalRegistryPresent)blockers.push('CANONICAL_REGISTRY_ABSENT')
 if(!gates.curriculumPublisherProductionApproved)blockers.push('CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED')
 if(!gates.canonicalRendererParityApproved)blockers.push('CANONICAL_RENDERER_PARITY_NOT_APPROVED')
 if(!gates.backupRestoreDrillApproved)blockers.push('BACKUP_RESTORE_DRILL_NOT_APPROVED')
 if(gates.canonicalRegistryPresent&&!gates.tenantRlsApproved)blockers.push('CANONICAL_REGISTRY_RLS_NOT_APPROVED')
 if(!gates.canonicalRegistryWriteEnabled)blockers.push('CANONICAL_REGISTRY_WRITE_DISABLED')
 const ready=blockers.length===0
 return {architectureVersion:'v6-f-readiness-1',mode:'READ_ONLY_CUTOVER_READINESS',ready,gates,blockers,storage:{activePortalRepository:'paper_vault',activeRevisionRepository:'paper_vault_revision_history',canonicalTarget:REQUIRED_TABLES,tablePresence:tableMap,counts,rls},policy:{dualWriteAllowed:false,destructiveMigrationAllowed:false,automaticSourceIdentityFabricationAllowed:false,teacherFacingStorageDetails:false},checkedAt:new Date().toISOString()}
}
module.exports={buildCanonicalCutoverReadiness}
