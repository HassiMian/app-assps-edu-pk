/**
 * JARVIS Production 3.0 — Scoped Context Engine & Self-Repair Policy
 * 
 * Manages durable conversational continuity, multi-user isolation,
 * pronoun and entity tracking, Roman Urdu correction interpretation,
 * and strict clarification gating without caching operational facts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageFactory } from './storage-adapter.mjs';
import { missionRegistry } from './mission-engine.mjs';
import { EntityExtractor, CLASS_CATALOG } from './entity-extractor.mjs';

function safeJsonParse(val, fallback = null) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export class ConversationContextEngine {
  constructor() {
    this.memorySessions = new Map();
    this.ttlMs = 4 * 60 * 60 * 1000; // 4 hours
    this.store = StorageFactory.createContextStore(missionRegistry.store);
    if (typeof this.store.init === 'function') {
      try {
        const res = this.store.init();
        if (res && typeof res.then === 'function') {
          res.catch(err => console.warn('ConversationContextEngine: store async init failed:', err.message));
        }
      } catch (err) {
        console.warn('ConversationContextEngine: store init failed:', err.message);
      }
    }
  }

  buildContextKey(userId = 'operator', channel = 'web', sessionId = 'default') {
    const u = String(userId || 'operator').trim();
    const c = String(channel || 'web').trim();
    const s = String(sessionId || 'default').trim();
    return `${u}:${c}:${s}`;
  }

  getSession(sessionId = 'default', options = {}) {
    const userId = options.userId || options.user_id || 'operator';
    const channel = options.channel || 'web';
    const contextKey = this.buildContextKey(userId, channel, sessionId);
    const now = Date.now();

    // Check memory cache
    let session = this.memorySessions.get(contextKey);
    if (session && (now - session.lastUpdated <= this.ttlMs)) {
      session.lastUpdated = now;
      return session;
    }

    // Check DB
    if (this.store) {
      try {
        const stored = this.store.getContext(contextKey);
        if (stored && typeof stored.then === 'function') {
          // async returned in postgres
        } else if (stored && (now - stored.lastUpdated <= this.ttlMs)) {
          this.memorySessions.set(contextKey, stored);
          return stored;
        }
      } catch {}
    }

    // Fresh session creation
    session = {
      contextKey,
      sessionId: String(sessionId || 'default'),
      userId,
      channel,
      userRole: options.userRole || 'admin',
      currentStudent: null,
      currentClass: null,
      currentPerson: null,
      currentBrowserSubject: null,
      currentTopic: null,
      activeMissionId: null,
      lastIntent: null,
      history: [],
      createdAt: now,
      lastUpdated: now
    };
    this.memorySessions.set(contextKey, session);
    this.persistContext(session);
    return session;
  }

  updateSession(sessionId, updates = {}, options = {}) {
    const session = this.getSession(sessionId, options);
    if (updates.currentStudent !== undefined) session.currentStudent = updates.currentStudent;
    if (updates.currentClass !== undefined) session.currentClass = updates.currentClass;
    if (updates.currentPerson !== undefined) session.currentPerson = updates.currentPerson;
    if (updates.currentBrowserSubject !== undefined) session.currentBrowserSubject = updates.currentBrowserSubject;
    if (updates.currentTopic !== undefined) session.currentTopic = updates.currentTopic;
    if (updates.activeMissionId !== undefined) session.activeMissionId = updates.activeMissionId;
    if (updates.lastIntent !== undefined) session.lastIntent = updates.lastIntent;

    if (updates.historyEntry) {
      session.history.push({
        ...updates.historyEntry,
        timestamp: Date.now()
      });
      if (session.history.length > 30) {
        session.history = session.history.slice(-30);
      }
    }

    session.lastUpdated = Date.now();
    this.persistContext(session);
    return session;
  }

  persistContext(session) {
    if (!this.store) return;
    try {
      const res = this.store.saveContext(session, this.ttlMs);
      if (res && typeof res.then === 'function') {
        res.catch(err => console.warn('ConversationContextEngine: Error persisting context:', err.message));
      }
    } catch (e) {
      console.warn('ConversationContextEngine: Error persisting context:', e.message);
    }
  }
  clearSession(sessionId, options = {}) {
    const userId = options.userId || options.user_id || 'operator';
    const channel = options.channel || 'web';
    const contextKey = this.buildContextKey(userId, channel, sessionId);
    this.memorySessions.delete(contextKey);
    if (this.store && typeof this.store.deleteContext === 'function') {
      try {
        const res = this.store.deleteContext(contextKey);
        if (res && typeof res.then === 'function') res.catch(() => {});
      } catch {}
    }
  }

  /**
   * Phase 5: Correction & Self-Repair Parser
   * Understands corrections in Roman Urdu and English.
   */
  parseCorrection(rawInput, sessionContext = {}) {
    const s = String(rawInput || '').trim().toLowerCase();

    // 1. Cancellation / Stop keywords
    if (/^(?:stop|cancel|cancel\s*task|stop\s*task|cancel\s*current\s*task|stop\s*current\s*execution|cancel\s*execution|stop\s*execution|band\s*karo|ruko|ruk\s*jao|leave\s*it|choro|chodo|cancel\s*that|pehla\s*task\s*band\s*karo)$/i.test(s)) {
      return {
        isCorrection: true,
        type: 'CANCEL_TASK',
        action: 'CANCEL',
        reason: 'User explicitly commanded stop/cancel'
      };
    }

    // 2. Intent correction ("mera matlab fee nahi attendance thi", "fee nahi hazri", "attendance nahi result", "nahi iski fee btao")
    if (/(?:mera\s*matlab\s+)?(fee|attendance|result|marks|hazri|fess?)\s+(?:nahi|not)\s+(fee|attendance|result|marks|hazri|fess?)/i.test(s)) {
      const intentSwitch = s.match(/(fee|attendance|result|marks|hazri)\s+(?:nahi|not)\s+(fee|attendance|result|marks|hazri)/i);
      if (intentSwitch) {
        const targetWord = intentSwitch[2];
        let newIntent = 'school.get_student_attendance';
        if (/fee|fess/i.test(targetWord)) newIntent = 'school.get_student_fee';
        if (/result|marks/i.test(targetWord)) newIntent = 'school.get_student_marks';

        return {
          isCorrection: true,
          type: 'INTENT_CORRECTION',
          field: 'intent',
          newValue: newIntent,
          description: `Intent corrected to ${newIntent}`
        };
      }
    }

    if (/^(?:nahi|no|na)\s+(?:iski|uska|iska|iske|unki|unke|unka)?\s*(fee|attendance|result|marks|hazri|fess?|profile|timetable)\s*(?:batao|btao|dikhao|do|check|dein)?$/i.test(s)) {
      const match = s.match(/\b(fee|attendance|result|marks|hazri|fess?|profile|timetable)\b/i);
      if (match) {
        const targetWord = match[1];
        let newIntent = 'school.get_student_attendance';
        if (/fee|fess/i.test(targetWord)) newIntent = 'school.get_student_fee';
        if (/result|marks/i.test(targetWord)) newIntent = 'school.get_student_marks';
        if (/profile/i.test(targetWord)) newIntent = 'school.get_student_profile';
        if (/timetable/i.test(targetWord)) newIntent = 'school.get_timetable';

        return {
          isCorrection: true,
          type: 'INTENT_CORRECTION',
          field: 'intent',
          newValue: newIntent,
          description: `Intent corrected to ${newIntent}`
        };
      }
    }

    // 3. Entity Switch ("nahi Awais wali", "Awais ki nahi Arsal ki", "7th nahi 8th")
    if (/(?:nahi|not)\s+([a-z0-9\s]+?)\s+(?:wali|ki|ka)/i.test(s) || /([a-z0-9\s]+?)\s+nahi\s+([a-z0-9\s]+)/i.test(s)) {
      const entityMatch = s.match(/(?:nahi|not)\s+([a-z0-9\s]+?)(?:\s+(?:wali|ki|ka|$))/i) || s.match(/([a-z0-9\s]+?)\s+nahi\s+([a-z0-9\s]+)/i);
      if (entityMatch) {
        const candidate = (entityMatch[2] || entityMatch[1]).trim();
        
        // Class check
        if (CLASS_CATALOG.some(c => candidate.toLowerCase().includes(c.toLowerCase()) || candidate.includes('8') || candidate.includes('7'))) {
          return {
            isCorrection: true,
            type: 'ENTITY_CORRECTION',
            field: 'className',
            newValue: candidate,
            description: `Class corrected to ${candidate}`
          };
        }

        // Student name check
        if (candidate.length >= 3 && !['hai', 'karo', 'dikhao', 'batao'].includes(candidate)) {
          return {
            isCorrection: true,
            type: 'ENTITY_CORRECTION',
            field: 'studentName',
            newValue: candidate,
            description: `Student corrected to ${candidate}`
          };
        }
      }
    }

    return { isCorrection: false };
  }

  /**
   * Phase 5: Resolve Context for a Query
   * Detects pronouns ("iski fee", "uska record", "in bachon ki attendance")
   * and maps them strictly to active session entities without hallucinating.
   */
  resolveQueryContext(rawInput, sessionId = 'default', options = {}) {
    const session = this.getSession(sessionId, options);
    const s = String(rawInput || '').trim();
    const correction = this.parseCorrection(s, session);

    const hasPronoun = /\b(iski|iska|unka|unki|is\s*ki|is\s*ka|us\s*ki|us\s*ka|iss\s*ka|iss\s*ki|this|that|he|she|his|her|their|bhi|in ki|in ka)\b/i.test(s);
    const hasClassRef = /\b(is\s*class|iss\s*class|us\s*class|uss\s*class|same\s*class|class\s*ki)\b/i.test(s);
    const isStudentFollowUp = hasPronoun || /\b(kis\s*class|konsi\s*class|which\s*class|class\s*konsi|konsi\s*hai|kahan\s*parhta|kahan\s*hai)\b/i.test(s);

    let resolvedStudent = null;
    let resolvedClass = null;

    if (isStudentFollowUp && session.currentStudent) {
      resolvedStudent = session.currentStudent;
    }

    if ((hasClassRef || hasPronoun) && session.currentClass) {
      resolvedClass = session.currentClass;
    }

    return {
      rawInput: s,
      hasPronoun,
      hasClassRef,
      correction,
      resolvedStudent,
      resolvedClass,
      session
    };
  }

  /**
   * Phase 6: Clarification Policy Evaluator
   * Decides whether to execute immediately, ask for clarification,
   * or proceed with highest-confidence match.
   */
  evaluateClarification(intentObj, preliminarySearchResult = null, session = {}) {
    const { tool, params, riskLevel } = intentObj || {};

    // 1. If searching for student and multiple candidates found with identical match confidence
    if (tool === 'school.search_student' && preliminarySearchResult) {
      const results = preliminarySearchResult.data?.results || preliminarySearchResult.results || preliminarySearchResult.candidates || [];
      const exactMatch = preliminarySearchResult.data?.exact_match ?? preliminarySearchResult.exact_match;
      if (!exactMatch && results.length > 1) {
        const count = results.length;
        const candidates = results.slice(0, 3).map(c => `${c.name} (Class: ${c.class})`).join(', ');
        return {
          needsClarification: true,
          clarificationReason: 'MULTIPLE_MATCHING_STUDENT_RECORDS',
          suggestedPrompt: `Aap kis student ka record dekhna chahte hain? Humare paas ${count} students mile hain: ${candidates}. Barah-e-karam Class ya Full Name wazeh karein.`,
          requiredMissingFields: ['studentId', 'exactClassName']
        };
      }
    }

    // 2. Communications without recipient
    if (tool === 'communications.send_message' && (!params?.recipient || params.recipient === '')) {
      return {
        needsClarification: true,
        clarificationReason: 'MISSING_COMMUNICATION_RECIPIENT',
        suggestedPrompt: 'Message kis recipient (parent, teacher, ya number) ko bhejna hai?',
        requiredMissingFields: ['recipient']
      };
    }

    // 3. Missing target parameter for high-specificity tools
    if (tool === 'school.get_student_fee' && !params?.studentName && !session?.currentStudent) {
      return {
        needsClarification: true,
        clarificationReason: 'MISSING_STUDENT_TARGET',
        suggestedPrompt: 'Aap kis student ki fee check karna chahte hain? Barah-e-karam student ka naam ya roll number bataiye.',
        requiredMissingFields: ['studentName']
      };
    }

    if (tool === 'school.get_class_strength' && !params?.className && !session?.currentClass) {
      const rawQ = params?.raw_query || params?.query || '';
      const isClassWise = params?.isClassWise || /(classes?\s*wise|class\s*wise|section\s*wise|har\s*class|tamam\s*classes|sab\s*classes|all\s*classes|classes\s+ki\s+strength)/i.test(rawQ);
      if (!isClassWise) {
        return {
          needsClarification: true,
          clarificationReason: 'MISSING_CLASS_TARGET',
          suggestedPrompt: 'Aap kis class ki strength ya list dekhna chahte hain? (Maslan: Class 8, Class 5, Pre Nine, Hifaz)',
          requiredMissingFields: ['className']
        };
      }
    }

    return {
      needsClarification: false,
      clarificationReason: null,
      suggestedPrompt: null
    };
  }
}

export const contextEngine = new ConversationContextEngine();
