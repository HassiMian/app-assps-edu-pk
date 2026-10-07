/**
 * JARVIS Production 3.0 — Unified Storage Adapter & Dual-Engine Persistence
 *
 * Provides production-grade PostgreSQL persistence for the VPS control plane
 * and high-speed SQLite persistence for local/test/offline environments.
 *
 * In production mode, strictly FAILS CLOSED if PostgreSQL is unavailable.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'runtime');
if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function safeJson(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function safeStringify(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

// ============================================================================
// 1. POSTGRESQL MISSION STORE (PRODUCTION CANONICAL)
// ============================================================================

export class PostgreSQLMissionStore {
  constructor(config = {}) {
    this.name = 'PostgreSQLMissionStore';
    this.pool = null;
    this.config = {
      connectionString: config.connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL,
      host: config.host || process.env.POSTGRES_HOST || process.env.PGHOST || '127.0.0.1',
      port: Number(config.port || process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
      database: config.database || process.env.POSTGRES_DB || process.env.PGDATABASE || 'apexos',
      user: config.user || process.env.POSTGRES_USER || process.env.PGUSER || 'apexos_user',
      password: config.password || process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
      ...config
    };
  }

  async init() {
    try {
      this.pool = new pg.Pool(this.config.connectionString ? { connectionString: this.config.connectionString } : this.config);
      await this.pool.query('SELECT 1');
      await this.runMigrations();
      return true;
    } catch (err) {
      if (isProductionEnvironment()) {
        console.error('FATAL_STORAGE_ERROR: Canonical PostgreSQL Mission Store failed in production mode.');
        throw new Error(`FATAL_POSTGRES_INIT_FAILED: ${err.message}`);
      }
      throw err;
    }
  }

  async runMigrations() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Table 1: missions
      await client.query(`
        CREATE TABLE IF NOT EXISTS missions (
          mission_id VARCHAR(128) PRIMARY KEY,
          correlation_id VARCHAR(128),
          session_id VARCHAR(128),
          user_id VARCHAR(128),
          channel VARCHAR(64),
          raw_input TEXT,
          normalized_input TEXT,
          intent VARCHAR(128),
          entities_json JSONB,
          constraints_json JSONB,
          requested_outcome TEXT,
          risk_level VARCHAR(64),
          capabilities_json JSONB,
          execution_plan_json JSONB,
          status VARCHAR(64) NOT NULL,
          state_history_json JSONB,
          steps_json JSONB,
          evidence_json JSONB,
          result_json JSONB,
          response TEXT,
          error_json JSONB,
          task_report_json JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_pg_missions_session ON missions(session_id);
        CREATE INDEX IF NOT EXISTS idx_pg_missions_user ON missions(user_id);
        CREATE INDEX IF NOT EXISTS idx_pg_missions_status ON missions(status);
        CREATE INDEX IF NOT EXISTS idx_pg_missions_created ON missions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_pg_missions_intent ON missions(intent);
      `);

      // Table 2: mission_steps
      await client.query(`
        CREATE TABLE IF NOT EXISTS mission_steps (
          step_id VARCHAR(128) NOT NULL,
          mission_id VARCHAR(128) NOT NULL REFERENCES missions(mission_id) ON DELETE CASCADE,
          capability VARCHAR(128),
          provider VARCHAR(128),
          input_json JSONB,
          status VARCHAR(64) NOT NULL,
          verification VARCHAR(128),
          evidence_ref VARCHAR(128),
          latency_ms INT DEFAULT 0,
          result_json JSONB,
          error_json JSONB,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          PRIMARY KEY (mission_id, step_id)
        );
        CREATE INDEX IF NOT EXISTS idx_pg_steps_mission ON mission_steps(mission_id);
        CREATE INDEX IF NOT EXISTS idx_pg_steps_cap ON mission_steps(capability);
      `);

      // Table 3: mission_events
      await client.query(`
        CREATE TABLE IF NOT EXISTS mission_events (
          event_id VARCHAR(128) PRIMARY KEY,
          mission_id VARCHAR(128) NOT NULL REFERENCES missions(mission_id) ON DELETE CASCADE,
          state VARCHAR(64) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          note TEXT,
          payload_json JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_pg_events_mission ON mission_events(mission_id);
        CREATE INDEX IF NOT EXISTS idx_pg_events_time ON mission_events(timestamp DESC);
      `);

      // Table 4: execution_evidence
      await client.query(`
        CREATE TABLE IF NOT EXISTS execution_evidence (
          evidence_id VARCHAR(128) PRIMARY KEY,
          mission_id VARCHAR(128) NOT NULL REFERENCES missions(mission_id) ON DELETE CASCADE,
          source VARCHAR(128) NOT NULL,
          data_json JSONB,
          created_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pg_evidence_mission ON execution_evidence(mission_id);
      `);

      // Table 5: approvals
      await client.query(`
        CREATE TABLE IF NOT EXISTS approvals (
          approval_id VARCHAR(128) PRIMARY KEY,
          mission_id VARCHAR(128),
          division VARCHAR(64),
          action VARCHAR(128) NOT NULL,
          risk_level INT DEFAULT 1,
          payload_json JSONB,
          status VARCHAR(64) NOT NULL,
          requested_by VARCHAR(128),
          decided_by VARCHAR(128),
          decision_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          decided_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_pg_approvals_status ON approvals(status);
        CREATE INDEX IF NOT EXISTS idx_pg_approvals_mission ON approvals(mission_id);
      `);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveMission(m) {
    const raw = typeof m.toJSON === 'function' ? m.toJSON() : m;
    const query = `
      INSERT INTO missions (
        mission_id, correlation_id, session_id, user_id, channel,
        raw_input, normalized_input, intent, entities_json, constraints_json,
        requested_outcome, risk_level, capabilities_json, execution_plan_json,
        status, state_history_json, steps_json, evidence_json, result_json,
        response, error_json, task_report_json, created_at, started_at, completed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      ON CONFLICT (mission_id) DO UPDATE SET
        status = EXCLUDED.status,
        state_history_json = EXCLUDED.state_history_json,
        steps_json = EXCLUDED.steps_json,
        evidence_json = EXCLUDED.evidence_json,
        result_json = EXCLUDED.result_json,
        response = EXCLUDED.response,
        error_json = EXCLUDED.error_json,
        task_report_json = EXCLUDED.task_report_json,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at;
    `;
    const values = [
      raw.mission_id,
      raw.correlation_id || null,
      raw.session_id || 'default',
      raw.user_id || 'operator',
      raw.channel || 'web',
      raw.raw_input || '',
      raw.normalized_input || raw.raw_input || '',
      raw.intent || null,
      safeStringify(raw.entities || {}),
      safeStringify(raw.constraints || {}),
      raw.requested_outcome || '',
      raw.risk_level || 'READ_ONLY',
      safeStringify(raw.required_capabilities || []),
      safeStringify(raw.execution_plan || []),
      raw.status || 'RECEIVED',
      safeStringify(raw.state_history || []),
      safeStringify(raw.steps || []),
      safeStringify(raw.evidence || []),
      safeStringify(raw.result || null),
      raw.response || null,
      safeStringify(raw.error || null),
      safeStringify(raw.task_report || null),
      raw.created_at || new Date().toISOString(),
      raw.started_at || null,
      raw.completed_at || null
    ];
    await this.pool.query(query, values);
  }

  async getMission(missionId) {
    const res = await this.pool.query('SELECT * FROM missions WHERE mission_id = $1', [missionId]);
    if (res.rows.length === 0) return null;
    return this.mapMissionRow(res.rows[0]);
  }

  async listMissions(filters = {}, limit = 50) {
    let q = 'SELECT * FROM missions';
    const params = [];
    const where = [];

    if (filters.sessionId) {
      params.push(filters.sessionId);
      where.push(`session_id = $${params.length}`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }

    if (where.length > 0) {
      q += ' WHERE ' + where.join(' AND ');
    }
    q += ' ORDER BY created_at DESC LIMIT ' + Math.min(limit, 200);

    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapMissionRow(r));
  }

  async reconcileIncompleteMissions() {
    const nonTerminal = ['RECEIVED', 'UNDERSTANDING', 'CLARIFICATION_REQUIRED', 'PLANNED', 'AUTHORIZATION_REQUIRED', 'READY', 'EXECUTING', 'VERIFYING'];
    const placeholders = nonTerminal.map((_, i) => `$${i + 1}`).join(',');
    const findQ = `SELECT mission_id, state_history_json FROM missions WHERE status IN (${placeholders})`;
    const res = await this.pool.query(findQ, nonTerminal);

    let reconciledCount = 0;
    const now = new Date().toISOString();

    for (const row of res.rows) {
      const history = safeJson(row.state_history_json, []);
      history.push({
        state: 'FAILED',
        timestamp: now,
        note: 'Reconciled to FAILED upon process restart (Interrupted in-flight)'
      });

      const updateQ = `
        UPDATE missions SET
          status = 'FAILED',
          state_history_json = $1,
          error_json = $2,
          response = 'Mission interrupted by system restart. Safely marked as FAILED.',
          completed_at = $3
        WHERE mission_id = $4
      `;
      const errObj = {
        error_class: 'EXECUTION_FAILURE',
        code: 'RECONCILED_ON_RESTART',
        message: 'Mission was in-flight when process restarted. Cleanly reconciled to FAILED.'
      };
      await this.pool.query(updateQ, [safeStringify(history), safeStringify(errObj), now, row.mission_id]);
      reconciledCount++;
    }
    return reconciledCount;
  }

  mapMissionRow(row) {
    return {
      mission_id: row.mission_id,
      correlation_id: row.correlation_id,
      session_id: row.session_id,
      user_id: row.user_id,
      channel: row.channel,
      raw_input: row.raw_input,
      normalized_input: row.normalized_input,
      intent: row.intent,
      entities: safeJson(row.entities_json, {}),
      constraints: safeJson(row.constraints_json, {}),
      requested_outcome: row.requested_outcome,
      risk_level: row.risk_level,
      required_capabilities: safeJson(row.capabilities_json, []),
      execution_plan: safeJson(row.execution_plan_json, []),
      status: row.status,
      state_history: safeJson(row.state_history_json, []),
      steps: safeJson(row.steps_json, []),
      evidence: safeJson(row.evidence_json, []),
      result: safeJson(row.result_json, null),
      response: row.response,
      error: safeJson(row.error_json, null),
      task_report: safeJson(row.task_report_json, null),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
      completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// ============================================================================
// 2. SQLITE MISSION STORE (LOCAL / TEST / OFFLINE)
// ============================================================================

export class SQLiteMissionStore {
  constructor(dbPath = null) {
    this.name = 'SQLiteMissionStore';
    this.dbPath = dbPath || path.join(RUNTIME_DIR, 'missions.db');
    this.db = null;
  }

  init() {
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS missions (
        mission_id TEXT PRIMARY KEY,
        correlation_id TEXT,
        session_id TEXT,
        user_id TEXT,
        channel TEXT,
        raw_input TEXT,
        normalized_input TEXT,
        intent TEXT,
        entities_json TEXT,
        constraints_json TEXT,
        requested_outcome TEXT,
        risk_level TEXT,
        capabilities_json TEXT,
        execution_plan_json TEXT,
        status TEXT,
        state_history_json TEXT,
        steps_json TEXT,
        evidence_json TEXT,
        result_json TEXT,
        response TEXT,
        error_json TEXT,
        task_report_json TEXT,
        created_at TEXT,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_missions_session ON missions(session_id);
      CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
      CREATE INDEX IF NOT EXISTS idx_missions_created ON missions(created_at);

      CREATE TABLE IF NOT EXISTS mission_steps (
        step_id TEXT NOT NULL,
        mission_id TEXT NOT NULL,
        capability TEXT,
        provider TEXT,
        input_json TEXT,
        status TEXT NOT NULL,
        verification TEXT,
        evidence_ref TEXT,
        latency_ms INTEGER DEFAULT 0,
        result_json TEXT,
        error_json TEXT,
        started_at TEXT,
        completed_at TEXT,
        PRIMARY KEY (mission_id, step_id)
      );

      CREATE TABLE IF NOT EXISTS approvals (
        approval_id TEXT PRIMARY KEY,
        mission_id TEXT,
        division TEXT,
        action TEXT NOT NULL,
        risk_level INTEGER DEFAULT 1,
        payload_json TEXT,
        status TEXT NOT NULL,
        requested_by TEXT,
        decided_by TEXT,
        decision_reason TEXT,
        created_at TEXT,
        decided_at TEXT
      );
    `);
    return true;
  }

  saveMission(m) {
    if (!this.db) this.init();
    const raw = typeof m.toJSON === 'function' ? m.toJSON() : m;
    const stmt = this.db.prepare(`
      INSERT INTO missions (
        mission_id, correlation_id, session_id, user_id, channel,
        raw_input, normalized_input, intent, entities_json, constraints_json,
        requested_outcome, risk_level, capabilities_json, execution_plan_json,
        status, state_history_json, steps_json, evidence_json, result_json,
        response, error_json, task_report_json, created_at, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mission_id) DO UPDATE SET
        status = excluded.status,
        state_history_json = excluded.state_history_json,
        steps_json = excluded.steps_json,
        evidence_json = excluded.evidence_json,
        result_json = excluded.result_json,
        response = excluded.response,
        error_json = excluded.error_json,
        task_report_json = excluded.task_report_json,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at
    `);

    stmt.run(
      raw.mission_id,
      raw.correlation_id || null,
      raw.session_id || 'default',
      raw.user_id || 'operator',
      raw.channel || 'web',
      raw.raw_input || '',
      raw.normalized_input || raw.raw_input || '',
      raw.intent || null,
      safeStringify(raw.entities || {}),
      safeStringify(raw.constraints || {}),
      raw.requested_outcome || '',
      raw.risk_level || 'READ_ONLY',
      safeStringify(raw.required_capabilities || []),
      safeStringify(raw.execution_plan || []),
      raw.status || 'RECEIVED',
      safeStringify(raw.state_history || []),
      safeStringify(raw.steps || []),
      safeStringify(raw.evidence || []),
      safeStringify(raw.result || null),
      raw.response || null,
      safeStringify(raw.error || null),
      safeStringify(raw.task_report || null),
      raw.created_at || new Date().toISOString(),
      raw.started_at || null,
      raw.completed_at || null
    );
  }

  getMission(missionId) {
    if (!missionId) return null;
    if (!this.db) this.init();
    const row = this.db.prepare('SELECT * FROM missions WHERE mission_id = ?').get(missionId);
    if (!row) return null;
    return this.mapMissionRow(row);
  }

  listMissions(filters = {}, limit = 50) {
    if (!this.db) this.init();
    let q = 'SELECT * FROM missions';
    const params = [];
    const where = [];

    if (filters.sessionId) {
      params.push(filters.sessionId);
      where.push('session_id = ?');
    }
    if (filters.userId) {
      params.push(filters.userId);
      where.push('user_id = ?');
    }
    if (filters.status) {
      params.push(filters.status);
      where.push('status = ?');
    }

    if (where.length > 0) {
      q += ' WHERE ' + where.join(' AND ');
    }
    q += ' ORDER BY created_at DESC LIMIT ' + Math.min(limit, 200);

    const rows = this.db.prepare(q).all(...params);
    return rows.map(r => this.mapMissionRow(r));
  }

  reconcileIncompleteMissions() {
    if (!this.db) this.init();
    const nonTerminal = ['RECEIVED', 'UNDERSTANDING', 'CLARIFICATION_REQUIRED', 'PLANNED', 'AUTHORIZATION_REQUIRED', 'READY', 'EXECUTING', 'VERIFYING'];
    const placeholders = nonTerminal.map(() => '?').join(',');
    const rows = this.db.prepare(`SELECT mission_id, state_history_json FROM missions WHERE status IN (${placeholders})`).all(...nonTerminal);

    let reconciledCount = 0;
    const now = new Date().toISOString();

    for (const row of rows) {
      const history = safeJson(row.state_history_json, []);
      history.push({
        state: 'FAILED',
        timestamp: now,
        note: 'Reconciled to FAILED upon process restart (Interrupted in-flight)'
      });

      const updateStmt = this.db.prepare(`
        UPDATE missions SET
          status = 'FAILED',
          state_history_json = ?,
          error_json = ?,
          response = 'Mission interrupted by system restart. Safely marked as FAILED.',
          completed_at = ?
        WHERE mission_id = ?
      `);
      const errObj = {
        error_class: 'EXECUTION_FAILURE',
        code: 'RECONCILED_ON_RESTART',
        message: 'Mission was in-flight when process restarted. Cleanly reconciled to FAILED.'
      };
      updateStmt.run(safeStringify(history), safeStringify(errObj), now, row.mission_id);
      reconciledCount++;
    }
    return reconciledCount;
  }

  mapMissionRow(row) {
    return {
      mission_id: row.mission_id,
      correlation_id: row.correlation_id,
      session_id: row.session_id,
      user_id: row.user_id,
      channel: row.channel,
      raw_input: row.raw_input,
      normalized_input: row.normalized_input,
      intent: row.intent,
      entities: safeJson(row.entities_json, {}),
      constraints: safeJson(row.constraints_json, {}),
      requested_outcome: row.requested_outcome,
      risk_level: row.risk_level,
      required_capabilities: safeJson(row.capabilities_json, []),
      execution_plan: safeJson(row.execution_plan_json, []),
      status: row.status,
      state_history: safeJson(row.state_history_json, []),
      steps: safeJson(row.steps_json, []),
      evidence: safeJson(row.evidence_json, []),
      result: safeJson(row.result_json, null),
      response: row.response,
      error: safeJson(row.error_json, null),
      task_report: safeJson(row.task_report_json, null),
      created_at: row.created_at,
      started_at: row.started_at,
      completed_at: row.completed_at
    };
  }

  close() {
    if (this.db) {
      try { this.db.close(); } catch {}
      this.db = null;
    }
  }
}

// ============================================================================
// 3. POSTGRESQL CONTEXT STORE (PRODUCTION CANONICAL)
// ============================================================================

export class PostgreSQLContextStore {
  constructor(pool) {
    this.name = 'PostgreSQLContextStore';
    this.pool = pool;
  }

  async init() {
    if (!this.pool) {
      throw new Error('PostgreSQLContextStore requires an active PostgreSQL pool');
    }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_contexts (
        context_key VARCHAR(256) PRIMARY KEY,
        session_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        channel VARCHAR(64) NOT NULL,
        user_role VARCHAR(64) DEFAULT 'admin',
        current_student VARCHAR(128),
        current_class VARCHAR(128),
        current_person VARCHAR(128),
        current_topic VARCHAR(128),
        active_mission_id VARCHAR(128),
        last_intent VARCHAR(128),
        history_json JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        last_updated TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pg_ctx_session ON conversation_contexts(session_id);
      CREATE INDEX IF NOT EXISTS idx_pg_ctx_user ON conversation_contexts(user_id);
      CREATE INDEX IF NOT EXISTS idx_pg_ctx_expires ON conversation_contexts(expires_at);
    `);
    return true;
  }

  async saveContext(session, ttlMs = 14400000) {
    const lastUpdated = session.lastUpdated ? new Date(session.lastUpdated) : new Date();
    const expiresAt = new Date(lastUpdated.getTime() + ttlMs);
    const query = `
      INSERT INTO conversation_contexts (
        context_key, session_id, user_id, channel, user_role,
        current_student, current_class, current_person, current_topic,
        active_mission_id, last_intent, history_json, created_at, last_updated, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (context_key) DO UPDATE SET
        user_role = EXCLUDED.user_role,
        current_student = EXCLUDED.current_student,
        current_class = EXCLUDED.current_class,
        current_person = EXCLUDED.current_person,
        current_topic = EXCLUDED.current_topic,
        active_mission_id = EXCLUDED.active_mission_id,
        last_intent = EXCLUDED.last_intent,
        history_json = EXCLUDED.history_json,
        last_updated = EXCLUDED.last_updated,
        expires_at = EXCLUDED.expires_at;
    `;
    const values = [
      session.contextKey,
      session.sessionId || 'default',
      session.userId || 'operator',
      session.channel || 'web',
      session.userRole || 'admin',
      session.currentStudent || null,
      session.currentClass || null,
      session.currentPerson || null,
      session.currentTopic || null,
      session.activeMissionId || null,
      session.lastIntent || null,
      safeStringify(session.history || []),
      new Date(session.createdAt || Date.now()).toISOString(),
      lastUpdated.toISOString(),
      expiresAt.toISOString()
    ];
    await this.pool.query(query, values);
  }

  async getContext(contextKey) {
    const res = await this.pool.query('SELECT * FROM conversation_contexts WHERE context_key = $1 AND expires_at > NOW()', [contextKey]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      contextKey: r.context_key,
      sessionId: r.session_id,
      userId: r.user_id,
      channel: r.channel,
      userRole: r.user_role,
      currentStudent: r.current_student,
      currentClass: r.current_class,
      currentPerson: r.current_person,
      currentBrowserSubject: null,
      currentTopic: r.current_topic,
      activeMissionId: r.active_mission_id,
      lastIntent: r.last_intent,
      history: safeJson(r.history_json, []),
      createdAt: new Date(r.created_at).getTime(),
      lastUpdated: new Date(r.last_updated).getTime()
    };
  }

  async deleteContext(contextKey) {
    await this.pool.query('DELETE FROM conversation_contexts WHERE context_key = $1', [contextKey]);
  }
}

// ============================================================================
// 4. SQLITE CONTEXT STORE (LOCAL / TEST / OFFLINE)
// ============================================================================

export class SQLiteContextStore {
  constructor(dbPath = null) {
    this.name = 'SQLiteContextStore';
    this.dbPath = dbPath || path.join(RUNTIME_DIR, 'contexts.db');
    this.db = null;
  }

  init() {
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_contexts (
        context_key TEXT PRIMARY KEY,
        user_id TEXT,
        channel TEXT,
        session_id TEXT,
        user_role TEXT,
        current_student TEXT,
        current_class TEXT,
        current_person TEXT,
        current_topic TEXT,
        active_mission_id TEXT,
        last_intent TEXT,
        history_json TEXT,
        created_at INTEGER,
        last_updated INTEGER,
        expires_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_ctx_session ON conversation_contexts(session_id);
    `);
    return true;
  }

  saveContext(session, ttlMs = 14400000) {
    if (!this.db) this.init();
    const lastUpdated = session.lastUpdated || Date.now();
    const expiresAt = lastUpdated + ttlMs;
    const stmt = this.db.prepare(`
      INSERT INTO conversation_contexts (
        context_key, user_id, channel, session_id, user_role,
        current_student, current_class, current_person, current_topic,
        active_mission_id, last_intent, history_json, created_at, last_updated, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(context_key) DO UPDATE SET
        user_role = excluded.user_role,
        current_student = excluded.current_student,
        current_class = excluded.current_class,
        current_person = excluded.current_person,
        current_topic = excluded.current_topic,
        active_mission_id = excluded.active_mission_id,
        last_intent = excluded.last_intent,
        history_json = excluded.history_json,
        last_updated = excluded.last_updated,
        expires_at = excluded.expires_at
    `);

    stmt.run(
      session.contextKey,
      session.userId || 'operator',
      session.channel || 'web',
      session.sessionId || 'default',
      session.userRole || 'admin',
      session.currentStudent || null,
      session.currentClass || null,
      session.currentPerson || null,
      session.currentTopic || null,
      session.activeMissionId || null,
      session.lastIntent || null,
      safeStringify(session.history || []),
      session.createdAt || lastUpdated,
      lastUpdated,
      expiresAt
    );
  }

  getContext(contextKey) {
    if (!this.db) this.init();
    const now = Date.now();
    const r = this.db.prepare('SELECT * FROM conversation_contexts WHERE context_key = ? AND expires_at > ?').get(contextKey, now);
    if (!r) return null;
    return {
      contextKey: r.context_key,
      sessionId: r.session_id,
      userId: r.user_id,
      channel: r.channel,
      userRole: r.user_role,
      currentStudent: r.current_student,
      currentClass: r.current_class,
      currentPerson: r.current_person,
      currentBrowserSubject: null,
      currentTopic: r.current_topic,
      activeMissionId: r.active_mission_id,
      lastIntent: r.last_intent,
      history: safeJson(r.history_json, []),
      createdAt: r.created_at,
      lastUpdated: r.last_updated
    };
  }

  deleteContext(contextKey) {
    if (!this.db) this.init();
    this.db.prepare('DELETE FROM conversation_contexts WHERE context_key = ?').run(contextKey);
  }
}

// ============================================================================
// 5. FACTORY & FAIL-CLOSED ENVIRONMENT DISPATCHER
// ============================================================================

export function isProductionEnvironment() {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const jarvisEnv = (process.env.JARVIS_ENV || '').toLowerCase();
  const storageBackend = (process.env.STORAGE_BACKEND || '').toLowerCase();
  return nodeEnv === 'production' || jarvisEnv === 'production' || storageBackend === 'postgres' || storageBackend === 'postgresql';
}

export class StorageFactory {
  static createMissionStore(options = {}) {
    const isProd = isProductionEnvironment();
    const forceBackend = (options.backend || process.env.STORAGE_BACKEND || '').toLowerCase();

    if (isProd || forceBackend === 'postgres' || forceBackend === 'postgresql') {
      return new PostgreSQLMissionStore(options);
    }
    return new SQLiteMissionStore(options.dbPath);
  }

  static createContextStore(missionStore, options = {}) {
    if (missionStore instanceof PostgreSQLMissionStore) {
      return new PostgreSQLContextStore(missionStore.pool);
    }
    return new SQLiteContextStore(options.dbPath);
  }
}
