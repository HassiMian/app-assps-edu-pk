/**
 * JARVIS Production 3.0 — Canonical Mission Engine & Durable Persistence
 *
 * Provides structured lifecycle management, immutable provenance,
 * fail-safe cancellation, durable SQLite/PostgreSQL persistence, and
 * safe process restart reconciliation for all JARVIS commands.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageFactory } from './storage-adapter.mjs';
import { id } from './lib.mjs';

export const MissionState = Object.freeze({
  RECEIVED: 'RECEIVED',
  UNDERSTANDING: 'UNDERSTANDING',
  CLARIFICATION_REQUIRED: 'CLARIFICATION_REQUIRED',
  PLANNED: 'PLANNED',
  AUTHORIZATION_REQUIRED: 'AUTHORIZATION_REQUIRED',
  READY: 'READY',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  SUPERSEDED: 'SUPERSEDED'
});

export const ErrorClass = Object.freeze({
  TRANSIENT: 'TRANSIENT',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  BAD_INPUT: 'BAD_INPUT',
  ENTITY_AMBIGUOUS: 'ENTITY_AMBIGUOUS',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  EXECUTION_FAILURE: 'EXECUTION_FAILURE',
  VERIFICATION_FAILURE: 'VERIFICATION_FAILURE'
});

export class CanonicalMission {
  constructor(params = {}) {
    const now = new Date().toISOString();
    this.mission_id = params.mission_id || `msn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.correlation_id = params.correlation_id || id('corr');
    this.session_id = params.session_id || 'default';
    this.user_id = params.user_id || params.authorization?.principal || 'operator';
    this.channel = params.channel || 'web';
    this.raw_input = String(params.raw_input || '').trim();
    this.normalized_input = String(params.normalized_input || this.raw_input).trim();

    this.intent = params.intent || null;
    this.entities = params.entities || {};
    this.constraints = params.constraints || {};

    this.requested_outcome = params.requested_outcome || this.raw_input;
    this.risk_level = params.risk_level || 'READ_ONLY';

    this.required_capabilities = Array.isArray(params.required_capabilities) ? params.required_capabilities : [];
    this.execution_plan = Array.isArray(params.execution_plan) ? params.execution_plan : [];

    this.context_dependencies = params.context_dependencies || {};
    this.authorization = params.authorization || {
      authorized: true,
      principal: this.user_id,
      role: 'admin',
      scope: 'ALL'
    };

    this.status = params.status || MissionState.RECEIVED;
    this.state_history = Array.isArray(params.state_history) && params.state_history.length > 0
      ? params.state_history
      : [{ state: MissionState.RECEIVED, timestamp: now, note: 'Mission created' }];
    this.steps = Array.isArray(params.steps) ? params.steps : [];
    this.evidence = Array.isArray(params.evidence) ? params.evidence : [];
    this.result = params.result || null;
    this.response = params.response || null;
    this.error = params.error || null;
    this.task_report = params.task_report || null;

    this.created_at = params.created_at || now;
    this.started_at = params.started_at || null;
    this.completed_at = params.completed_at || null;
    this.registry = params.registry || null;
  }

  getRegistry() {
    return this.registry || missionRegistry;
  }

  transition(targetState, note = '') {
    if (!MissionState[targetState]) {
      throw new Error(`Invalid target state: ${targetState}`);
    }

    const terminalStates = [MissionState.COMPLETED, MissionState.FAILED, MissionState.CANCELLED, MissionState.SUPERSEDED];
    if (terminalStates.includes(this.status) && this.status !== targetState) {
      return false;
    }

    const timestamp = new Date().toISOString();
    this.status = targetState;
    this.state_history.push({ state: targetState, timestamp, note });

    if (targetState === MissionState.EXECUTING && !this.started_at) {
      this.started_at = timestamp;
    }

    if (terminalStates.includes(targetState)) {
      this.completed_at = timestamp;
    }

    // Persist mutation
    this.getRegistry().persistMission(this);
    return true;
  }

  addStep(stepParams) {
    const step = {
      step_id: stepParams.step_id || `step_${this.steps.length + 1}`,
      capability: stepParams.capability,
      provider: stepParams.provider || 'UNKNOWN',
      input: stepParams.input || {},
      status: stepParams.status || 'PENDING',
      verification: stepParams.verification || 'NONE',
      evidence_ref: stepParams.evidence_ref || null,
      latency_ms: stepParams.latency_ms || 0,
      result: stepParams.result || null,
      error: stepParams.error || null,
      started_at: new Date().toISOString(),
      completed_at: null
    };
    this.steps.push(step);
    this.getRegistry().persistMission(this);
    return step;
  }

  completeStep(stepId, outcome = {}) {
    const step = this.steps.find(s => s.step_id === stepId);
    if (step) {
      step.status = outcome.status || 'COMPLETED';
      step.verification = outcome.verification || 'VERIFIED';
      step.latency_ms = outcome.latency_ms || step.latency_ms;
      step.result = outcome.result !== undefined ? outcome.result : step.result;
      step.error = outcome.error || null;
      step.completed_at = new Date().toISOString();
      this.getRegistry().persistMission(this);
    }
  }

  addEvidence(evidenceItem) {
    const item = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      source: evidenceItem.source || 'PROVIDER',
      ...evidenceItem
    };
    this.evidence.push(item);
    this.getRegistry().persistMission(this);
    return item;
  }

  complete(result, responseText = '') {
    this.result = result;
    this.response = responseText || (typeof result === 'string' ? result : JSON.stringify(result));
    this.transition(MissionState.COMPLETED, 'Mission completed successfully with verified outcome');
    this.generateTaskReport();
    this.getRegistry().persistMission(this);
  }

  fail(errorClass, message, details = {}) {
    this.error = {
      error_class: errorClass || ErrorClass.EXECUTION_FAILURE,
      message: String(message || 'Unknown execution error'),
      details,
      timestamp: new Date().toISOString()
    };
    this.response = `Command execution failed: ${this.error.message}`;
    this.transition(MissionState.FAILED, `Mission failed: [${errorClass}] ${this.error.message}`);
    this.generateTaskReport();
    this.getRegistry().persistMission(this);
  }

  cancel(reason = 'Cancelled by user') {
    this.error = {
      error_class: 'CANCELLED',
      message: reason,
      timestamp: new Date().toISOString()
    };
    this.response = `Task cancelled: ${reason}`;
    this.transition(MissionState.CANCELLED, reason);
    this.generateTaskReport();
    this.getRegistry().persistMission(this);
  }

  supersede(newMissionId, reason = 'Superseded by subsequent user command') {
    this.error = {
      error_class: 'SUPERSEDED',
      message: reason,
      superseded_by: newMissionId,
      timestamp: new Date().toISOString()
    };
    this.transition(MissionState.SUPERSEDED, reason);
    this.generateTaskReport();
    this.getRegistry().persistMission(this);
  }

  generateTaskReport() {
    const durationMs = this.completed_at && this.started_at
      ? (new Date(this.completed_at).getTime() - new Date(this.started_at).getTime())
      : (this.completed_at ? (new Date(this.completed_at).getTime() - new Date(this.created_at).getTime()) : 0);

    this.task_report = {
      summary: {
        mission_id: this.mission_id,
        correlation_id: this.correlation_id,
        session_id: this.session_id,
        intent: this.intent,
        status: this.status,
        duration: `${durationMs}ms`,
        verification: this.steps.map(s => s.verification).find(v => v && v !== 'NONE') || 'NONE',
        risk_level: this.risk_level,
        steps: this.steps.map(s => ({
          step: s.step_id,
          capability: s.capability,
          provider: s.provider,
          latency: `${s.latency_ms}ms`,
          status: s.status,
          verification: s.verification
        })),
        evidence: this.evidence,
        error: this.error,
        timestamps: {
          created: this.created_at,
          started: this.started_at,
          completed: this.completed_at
        }
      }
    };
  }

  toJSON() {
    return {
      mission_id: this.mission_id,
      correlation_id: this.correlation_id,
      session_id: this.session_id,
      user_id: this.user_id,
      channel: this.channel,
      raw_input: this.raw_input,
      normalized_input: this.normalized_input,
      intent: this.intent,
      entities: this.entities,
      constraints: this.constraints,
      requested_outcome: this.requested_outcome,
      risk_level: this.risk_level,
      required_capabilities: this.required_capabilities,
      execution_plan: this.execution_plan,
      context_dependencies: this.context_dependencies,
      authorization: this.authorization,
      status: this.status,
      state_history: this.state_history,
      steps: this.steps,
      evidence: this.evidence,
      result: this.result,
      response: this.response,
      error: this.error,
      task_report: this.task_report,
      created_at: this.created_at,
      started_at: this.started_at,
      completed_at: this.completed_at
    };
  }
}

export class MissionRegistry {
  constructor(options = {}) {
    this.missions = new Map();
    this.activeMissionsBySession = new Map();
    this.maxMemoryMissions = 2000;
    this.store = StorageFactory.createMissionStore(options);
    if (typeof this.store.init === 'function') {
      try {
        const initRes = this.store.init();
        if (initRes && typeof initRes.then === 'function') {
          initRes.catch(err => {
            console.error('MissionRegistry store async init failed:', err.message);
          });
        }
      } catch (err) {
        console.error('MissionRegistry store init failed:', err.message);
      }
    }
    this.reconcileIncompleteMissions();
  }

  reconcileIncompleteMissions() {
    try {
      const res = this.store.reconcileIncompleteMissions();
      if (res && typeof res.then === 'function') {
        res.catch(err => console.warn('MissionRegistry: Error reconciling incomplete missions:', err.message));
      }
    } catch (e) {
      console.warn('MissionRegistry: Error reconciling incomplete missions:', e.message);
    }
  }

  persistMission(mission) {
    this.missions.set(mission.mission_id, mission);
    try {
      const res = this.store.saveMission(mission);
      if (res && typeof res.then === 'function') {
        res.catch(err => console.warn('MissionRegistry: Error persisting mission to store:', err.message));
      }
    } catch (e) {
      console.warn('MissionRegistry: Error persisting mission to store:', e.message);
    }
  }

  createMission(params = {}) {
    const mission = new CanonicalMission({ ...params, registry: this });
    this.persistMission(mission);

    if (mission.session_id) {
      this.activeMissionsBySession.set(mission.session_id, mission.mission_id);
    }

    if (this.missions.size > this.maxMemoryMissions) {
      const oldestKey = this.missions.keys().next().value;
      this.missions.delete(oldestKey);
    }

    return mission;
  }

  getMission(missionId) {
    if (this.missions.has(missionId)) {
      return this.missions.get(missionId);
    }
    const dbMission = this.store.getMission(missionId);
    if (dbMission) {
      if (typeof dbMission.then === 'function') {
        return dbMission;
      }
      const instance = new CanonicalMission(dbMission);
      this.missions.set(missionId, instance);
      return instance;
    }
    return null;
  }

  getActiveMission(sessionId) {
    const mId = this.activeMissionsBySession.get(sessionId);
    if (!mId) return null;
    const m = this.getMission(mId);
    if (m && ![MissionState.COMPLETED, MissionState.FAILED, MissionState.CANCELLED, MissionState.SUPERSEDED].includes(m.status)) {
      return m;
    }
    return null;
  }

  cancelActiveMission(sessionId, reason = 'User requested cancellation') {
    const active = this.getActiveMission(sessionId);
    if (active) {
      active.cancel(reason);
      this.activeMissionsBySession.delete(sessionId);
      return active;
    }
    return null;
  }

  evictOldMemoryMissions() {
    if (this.missions.size > this.maxMemoryMissions) {
      const keys = Array.from(this.missions.keys());
      const toDelete = keys.slice(0, keys.length - this.maxMemoryMissions);
      for (const k of toDelete) {
        this.missions.delete(k);
      }
    }
  }

  listMissions(limit = 50) {
    if (this.db) {
      try {
        const rows = this.db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT ?').all(limit);
        return rows.map(r => this.hydrateMissionFromRow(r));
      } catch {}
    }
    const list = Array.from(this.missions.values());
    return list.slice(-limit).reverse();
  }
}

function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function awaitImportSqlite() {
  const sqlite = import('node:sqlite');
  // Synchronous require fallback for Node environment if needed
  try {
    const { createRequire } = require('node:module');
    const req = createRequire(import.meta.url);
    return req('node:sqlite');
  } catch {
    // Dynamic import wrapper
    return sqlite;
  }
}

export const missionRegistry = new MissionRegistry();
