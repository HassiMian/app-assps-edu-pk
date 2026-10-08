const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const guardPath = path.join(root, 'al-siddique-backend/src/services/whatsapp/schoolChannelGuard.cjs')
const guard = require(guardPath)
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('school WhatsApp privileged roles come only from configured identities', () => {
  const previousOwner = process.env.WHATSAPP_OWNER_NUMBER
  const previousAdmin = process.env.WHATSAPP_ADMIN_NUMBER
  try {
    process.env.WHATSAPP_OWNER_NUMBER = '+15550001111'
    process.env.WHATSAPP_ADMIN_NUMBER = '+15550002222'
    assert.equal(guard.resolveUserRole('+15550001111'), guard.USER_ROLES.OWNER)
    assert.equal(guard.resolveUserRole('+15550002222'), guard.USER_ROLES.ADMIN)
    assert.equal(guard.resolveUserRole('+15550003333'), guard.USER_ROLES.PUBLIC)
  } finally {
    if (previousOwner === undefined) delete process.env.WHATSAPP_OWNER_NUMBER
    else process.env.WHATSAPP_OWNER_NUMBER = previousOwner
    if (previousAdmin === undefined) delete process.env.WHATSAPP_ADMIN_NUMBER
    else process.env.WHATSAPP_ADMIN_NUMBER = previousAdmin
  }
})

test('school WhatsApp runtime contains no ARGUS execution path or embedded provider credential', () => {
  const files = [
    'al-siddique-backend/src/routes/whatsappRoutes.js',
    'al-siddique-backend/src/services/whatsapp/whatsappRouter.js',
    'al-siddique-backend/src/services/whatsapp/whatsappRouter.cjs',
    'al-siddique-backend/src/services/whatsapp/jarvisCognitiveCore.js',
    'al-siddique-backend/src/services/whatsapp/jarvisCognitiveTools.js',
    'al-siddique-backend/src/services/whatsapp/responseComposer.js',
    'al-siddique-backend/src/services/whatsapp/responseComposer.cjs',
  ]
  for (const rel of files) {
    const source = read(rel)
    assert.doesNotMatch(source, /argus-market-engine|argus-channel-guard|argusContinuousScanner|argusMonitoringWorker|argusMarketEngine/)
    assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}/)
  }
})

test('cognitive DB tools fail closed around explicit school RLS and direct SQL escape hatch', () => {
  const tools = read('al-siddique-backend/src/services/whatsapp/jarvisCognitiveTools.js')
  const core = read('al-siddique-backend/src/services/whatsapp/jarvisCognitiveCore.js')
  assert.match(tools, /require\('\.\.\/\.\.\/config\/database'\)/)
  assert.match(tools, /require\('\.\/schoolChannelGuard\.cjs'\)/)
  assert.match(read('al-siddique-backend/src/services/whatsapp/schoolChannelGuard.cjs'), /WHATSAPP_SCHOOL_ID/)
  assert.match(tools, /set_config\('app\.is_super_admin', 'false', true\)/)
  assert.doesNotMatch(tools, /new\s+Pool\s*\(|DB_PASSWORD\s*\|\||app\.tenant_id\s*=\s*'1'/)
  assert.match(tools, /Direct SQL execution is disabled in the ASSPS school channel/)
  assert.doesNotMatch(core, /execute_saas_sql_query|inspect_database_schema|get_market_intelligence/)
  assert.doesNotMatch(tools, /VALUES\s*\(1,\s*\$|VALUES\s*\(\$1,\s*1,|school_id\s*=\s*1\b|tenant_id\s*=\s*['"]assps['"]/)
  assert.doesNotMatch(tools, /AND month = ['"]\$\{month\}|AND year = \$\{year\}/)
  assert.match(tools, /fee_challans[\s\S]{0,500}?school_id = current_setting\('app\.tenant_id'\)::int/)
})

test('tool dispatcher enforces caller role before touching sensitive school tools', async () => {
  const previousProbe = process.env.DB_STARTUP_PROBE
  process.env.DB_STARTUP_PROBE = 'false'
  try {
    const { JarvisCognitiveCore } = require(path.join(root, 'al-siddique-backend/src/services/whatsapp/jarvisCognitiveCore.js'))
    const core = new JarvisCognitiveCore()
    const denied = await core.executeTool('manage_student', { action: 'search' }, 'PUBLIC')
    assert.equal(denied.success, false)
    assert.match(denied.error, /not authorized/i)
    const fallback = await core.executeDeterministicFallback('+15550003333', 'PUBLIC', 'attendance report')
    assert.match(fallback, /cannot access private student, fee, attendance/i)
  } finally {
    if (previousProbe === undefined) delete process.env.DB_STARTUP_PROBE
    else process.env.DB_STARTUP_PROBE = previousProbe
  }
})

test('school data tools fail closed when explicit WhatsApp school context is missing', async () => {
  const previousProbe = process.env.DB_STARTUP_PROBE
  const previousSchoolId = process.env.WHATSAPP_SCHOOL_ID
  process.env.DB_STARTUP_PROBE = 'false'
  delete process.env.WHATSAPP_SCHOOL_ID
  try {
    const tools = require(path.join(root, 'al-siddique-backend/src/services/whatsapp/jarvisCognitiveTools.js'))
    const result = await tools.getExamDatesheet({ date: 'today' })
    assert.equal(result.success, false)
    assert.match(result.error, /WHATSAPP_SCHOOL_ID must be explicitly configured/)
  } finally {
    if (previousProbe === undefined) delete process.env.DB_STARTUP_PROBE
    else process.env.DB_STARTUP_PROBE = previousProbe
    if (previousSchoolId === undefined) delete process.env.WHATSAPP_SCHOOL_ID
    else process.env.WHATSAPP_SCHOOL_ID = previousSchoolId
  }
})

test('webhook route has no spoof/test bypass and never exposes direct chat or event history', () => {
  const route = read('al-siddique-backend/src/routes/whatsappRoutes.js')
  assert.doesNotMatch(route, /jarvis_assps_meta_webhook_verify_2026|x-internal-test/)
  assert.match(route, /Webhook verification is not configured\./)
  assert.match(route, /Direct WhatsApp chat API is disabled\./)
  assert.match(route, /WhatsApp event history is not exposed over HTTP\./)
  assert.match(route, /\(school_id, event_id, event_type, sender_id, recipient_id, payload, signature_valid, status\)/)
  assert.match(route, /Inbound event persistence unavailable\./)
  assert.doesNotMatch(route, /DIRECT_DATABASE_AUTHORITATIVE|Deterministic SQL Fallback/)
})

test('WhatsApp event migration adds nullable school scope without guessing legacy rows', () => {
  const migration = read('al-siddique-backend/migrations/021_whatsapp_event_school_scope.js')
  assert.match(migration, /ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools\(id\)/)
  assert.match(migration, /idx_whatsapp_inbound_events_school_created/)
  assert.match(migration, /ALTER TABLE whatsapp_inbound_events ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /CREATE POLICY tenant_isolation_policy ON whatsapp_inbound_events/)
  assert.doesNotMatch(migration, /UPDATE\s+whatsapp_inbound_events\s+SET\s+school_id/i)
  assert.doesNotMatch(migration, /school_id\s+INTEGER\s+NOT NULL/i)
})
