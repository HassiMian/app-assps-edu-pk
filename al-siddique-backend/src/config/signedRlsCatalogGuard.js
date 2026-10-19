'use strict'
// Strict, non-mutating catalog check. A new academic FORCE RLS table must never
// cause us to remove the original 77 core signed-policy requirements.
const EXPECTED = Object.freeze({
  forced: 85, enabled: 85, signed: 77, signed_school: 73,
  signed_tenant: 4, approved_additional: 5, verified_documents: 3,
})
function signedCatalogComplete(core, academic, docs) {
  if (!core || !academic || !docs) return false
  return Object.entries(EXPECTED).every(([name, expected]) => {
    const actual = name === 'approved_additional' ? academic[name] : name === 'verified_documents' ? docs[name] : core[name]
    return typeof actual === 'number' && Number.isInteger(actual) && actual === expected
  })
}
const additionalPolicySql = [
 "SELECT count(*)::int AS approved_additional",
 "FROM (VALUES",
 " ('grade910_human_signoff_evidence','grade910_signoff_signed_school','ALL','core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(school_id)'),",
 " ('grade910_personal_signature_assets','grade910_personal_signature_signed_school','ALL','core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(school_id)'),",
 " ('grade910_supporting_evidence_objects','grade910_evidence_signed_school','ALL','core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(school_id)'),",
 " ('grade910_verified_paper_publications','grade910_verified_picker_signed_school','SELECT','core_security.signed_school_allowed(school_id)',NULL),",
 " ('school_academic_approval_events','school_academic_approval_signed_allow','ALL','core_security.signed_school_allowed(school_id)','(core_security.signed_school_allowed(school_id) AND assps_academic_reviewer_authorized(school_id, actor_user_id))')",
 ") expected(table_name,policy_name,operation,predicate,insert_guard)",
 "JOIN pg_class c ON c.relname=expected.table_name AND c.relnamespace='public'::regnamespace AND c.relkind='r'",
 " AND c.relrowsecurity AND c.relforcerowsecurity",
 "JOIN pg_policies p ON p.schemaname='public' AND p.tablename=expected.table_name",
 " AND p.policyname=expected.policy_name AND p.cmd=expected.operation",
 " AND p.permissive='PERMISSIVE' AND p.roles=ARRAY['public']::name[]",
 " AND p.qual=expected.predicate AND p.with_check IS NOT DISTINCT FROM expected.insert_guard",
 "WHERE (SELECT count(*) FROM pg_policies other WHERE other.schemaname='public' AND other.tablename=expected.table_name)=1",
].join('\n')
// Exactly three reviewed 19-Oct document relations, with their restrictive
// tenant guards. No change to the 77 signed core bindings or academic quorum.
const documentPolicySql = [
 "SELECT count(*)::int AS verified_documents",
 "FROM (VALUES",
 " ('school_documents','school_documents_app_runtime_guard','apex_app_runtime',2,false),",
 " ('school_document_events','school_document_events_failclosed_20261019','public',3,true),",
 " ('school_document_revisions','school_document_revisions_failclosed_20261019','public',3,true)",
 ") expected(table_name,policy_name,guard_role,policy_count,flagged)",
 "JOIN pg_class c ON c.relname=expected.table_name",
 "JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'",
 "JOIN pg_policies p ON p.schemaname='public' AND p.tablename=expected.table_name",
 " AND p.policyname=expected.policy_name AND p.permissive='RESTRICTIVE'",
 " AND p.cmd='ALL' AND p.roles=ARRAY[expected.guard_role]::name[]",
 "WHERE c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity",
 " AND (SELECT count(*) FROM pg_policies x WHERE x.schemaname='public'",
 " AND x.tablename=expected.table_name)=expected.policy_count",
 " AND p.qual=p.with_check AND p.qual LIKE '%app.tenant_id%'",
 " AND p.qual LIKE '%app.is_super_admin%'",
 " AND (NOT expected.flagged OR p.qual LIKE '%app.rls_enabled%')",
].join('\n')
module.exports = { signedCatalogComplete, additionalPolicySql, documentPolicySql, EXPECTED }
