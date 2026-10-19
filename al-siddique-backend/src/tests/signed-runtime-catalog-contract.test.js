'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../config/database.js'), 'utf8')
const { EXPECTED, signedCatalogComplete, additionalPolicySql, documentPolicySql } = require('../config/signedRlsCatalogGuard')

function signedRuntimeGate() {
  const start = source.indexOf('if (signedTenantGate) {', source.indexOf('async function connectForContext'))
  const prepare = source.indexOf('const prepared = await prepareRuntimeClient(client)', start)
  assert.ok(start > 0 && prepare > start, 'signed check precedes tenant setup')
  return source.slice(start, prepare)
}

const verified = Object.freeze({
  forced: 85, enabled: 85, signed: 77, signed_school: 73, signed_tenant: 4,
})

test('production signed runtime must verify all 85 FORCE+ENABLE tables before preparing tenant session', () => {
  const gate = signedRuntimeGate()
  for (const marker of [
    'c.relforcerowsecurity', 'c.relrowsecurity',
    "p.policyname='core_signed_tenant_guard'", "p.permissive='RESTRICTIVE'",
    '$1::name=ANY(p.roles)', "c.relname <> 'student_class_movement_audit'",
    'AS signed_school', 'AS signed_tenant', 'p.qual=p.with_check',
    'DB_SIGNED_RLS_CATALOG_INCOMPLETE',
    'signedCatalogComplete(state, additional.rows[0], documents.rows[0])',
  ]) assert.ok(gate.includes(marker), `required signed RLS gate: ${marker}`)
  assert.match(gate, /const additional = await client\.query\(additionalPolicySql\)/)
  assert.match(gate, /`\s*, \[configuredRuntimeRole\(\)\]\)/)
  assert.match(source.slice(source.indexOf('async function connectForContext')), /await client\.release\(error\)/)
})

test('fail-closed signed helper expects precisely 85 FORCE, original 77 guard bindings, and five academic policies', () => {
  assert.deepEqual({ ...EXPECTED }, { ...verified, approved_additional: 5, verified_documents: 3 })
  assert.equal(signedCatalogComplete(verified, { approved_additional: 5 }, { verified_documents: 3 }), true)
  for (const [field, count] of Object.entries(verified)) {
    for (const wrong of [count - 1, count + 1, String(count), false, null, undefined]) {
      assert.equal(signedCatalogComplete({ ...verified, [field]: wrong }, { approved_additional: 5 }, { verified_documents: 3 }), false,
        `must reject wrong ${field}=${String(wrong)}`)
    }
  }
  for (const bad of [4, 6, '5', false, null, undefined]) {
    assert.equal(signedCatalogComplete(verified, { approved_additional: bad }, { verified_documents: 3 }), false)
  }
  assert.equal(signedCatalogComplete(null, { approved_additional: 5 }, { verified_documents: 3 }), false)
  assert.equal(signedCatalogComplete(verified, null, { verified_documents: 3 }), false)
})

test('five separately FORCE-protected academic policies require exact predicates and no extra policy', () => {
  for (const table of [
    'grade910_human_signoff_evidence', 'grade910_personal_signature_assets',
    'grade910_supporting_evidence_objects', 'grade910_verified_paper_publications',
    'school_academic_approval_events',
  ]) assert.ok(additionalPolicySql.includes(`'${table}'`), `missing protected table ${table}`)
  for (const marker of [
    "AND c.relrowsecurity AND c.relforcerowsecurity",
    "p.permissive='PERMISSIVE'", "p.roles=ARRAY['public']::name[]",
    'p.qual=expected.predicate', 'p.with_check IS NOT DISTINCT FROM expected.insert_guard',
    'SELECT count(*) FROM pg_policies other',
    'assps_academic_reviewer_authorized(school_id, actor_user_id)',
    "core_security.signed_school_allowed(school_id)",
  ]) assert.ok(additionalPolicySql.includes(marker), `required academic policy guard: ${marker}`)
})

test('signed-school and signed-tenant policy predicates remain independently exact-match guarded', () => {
  const gate = signedRuntimeGate()
  for (const marker of [
    'core_security.signed_school_allowed(id)',
    'core_security.signed_school_allowed(school_id)',
    'core_security.signed_tenant_key_allowed((tenant_id)::text)',
    'AS signed_school', 'AS signed_tenant',
  ]) assert.ok(gate.includes(marker), `signed-policy scope drift: ${marker}`)
})

test('document restrictive policy gate is non-optional and binds 85 catalog',()=>{
 assert.equal(EXPECTED.forced,85)
 assert.equal(EXPECTED.signed,77)
 assert.equal(EXPECTED.verified_documents,3)
 for(const table of ['school_documents','school_document_events','school_document_revisions'])
  assert.ok(documentPolicySql.includes(table))
 assert.equal(signedCatalogComplete(verified,{approved_additional:5},{verified_documents:2}),false)
})
