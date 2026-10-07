// V6-H1 — read-only verifier for idempotent canonical canary source binding.
const { query } = require('../../config/database')
const REQUIRED_COLUMNS = ['source_repository','source_paper_id','source_revision','source_snapshot_hash','canary_imported_at']
const REQUIRED_INDEX = 'uq_paper_documents_source_binding_v6h1'

async function verifyCanonicalCanaryBinding() {
  const cols = await query(`select a.attname column_name from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='paper_documents' and a.attnum>0 and not a.attisdropped and a.attname = any($1::text[])`, [REQUIRED_COLUMNS])
  const seen = new Set(cols.rows.map(r=>r.column_name))
  const missingColumns = REQUIRED_COLUMNS.filter(c=>!seen.has(c))
  const idx = await query(`select exists(select 1 from pg_indexes where schemaname='public' and tablename='paper_documents' and indexname=$1) ok`, [REQUIRED_INDEX])
  const indexPresent = Boolean(idx.rows[0]?.ok)
  const issues = []
  if (missingColumns.length) issues.push(`Missing source-binding columns: ${missingColumns.join(', ')}`)
  if (!indexPresent) issues.push(`Missing unique source-binding index: ${REQUIRED_INDEX}`)
  return {
    architectureVersion:'v6-h1-source-binding-1',
    valid: issues.length===0,
    issues,
    requiredColumns:REQUIRED_COLUMNS,
    missingColumns,
    uniqueIndex:{name:REQUIRED_INDEX,present:indexPresent},
  }
}
module.exports = { verifyCanonicalCanaryBinding, REQUIRED_COLUMNS, REQUIRED_INDEX }
