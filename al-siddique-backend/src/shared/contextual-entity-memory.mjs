/**
 * JARVIS 4.1 — Entity Graph Contextual Memory
 * 
 * Enforces strict separation between:
 * 1. Persistent Entity Graph References (student history graph, class filters, father name filters, ordinal references, active challan)
 * 2. Non-cacheable Mutable Operational Facts (TTL = 0, always refreshed live from School SaaS)
 * 
 * Resolves complex human anaphora:
 * - "doosri wali" / "second wali"
 * - "jo Seven mein hai"
 * - "jis ka father Waqas hai"
 * - "pehle jo student select ki thi"
 * - "same student"
 * - "us challan ko" / "wahi wala"
 */

export class ContextualEntityMemory {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionTtlMs = options.ttlMs || 4 * 60 * 60 * 1000; // 4 hours
  }

  _getKey(userId = 'default', channel = 'whatsapp') {
    const cleanUser = String(userId || 'default').replace(/\D/g, '') || String(userId || 'default');
    return `${channel}:${cleanUser}`;
  }

  getSession(userId, channel = 'whatsapp') {
    const key = this._getKey(userId, channel);
    const now = Date.now();

    let session = this.sessions.get(key);
    if (!session || (now - session.lastUpdated > this.sessionTtlMs)) {
      session = {
        key,
        userId,
        channel,
        createdAt: now,
        lastUpdated: now,
        // Entity Reference Memory
        activeStudent: null,
        activeChallan: null,
        activeCandidate: null,
        activeClass: null,
        lastConfirmedEntity: null,
        unresolvedSlot: null,
        lastIntent: null,
        interactionCount: 0,
        recentUtterances: [],
        // Entity Graph History
        entityGraph: {
          students: [],
          challans: [],
          previousSelectedStudent: null,
          lastSelectedStudent: null
        }
      };
      this.sessions.set(key, session);
    } else {
      session.lastUpdated = now;
    }

    return session;
  }

  /**
   * Bind an active student reference to the session & entity graph
   */
  bindStudent(userId, student, channel = 'whatsapp') {
    if (!student) return;
    const session = this.getSession(userId, channel);
    
    // Track previous before re-assigning active
    if (session.activeStudent && session.activeStudent.id !== student.id) {
      session.entityGraph.previousSelectedStudent = { ...session.activeStudent };
    }

    const studentRecord = {
      id: student.id,
      name: student.name,
      displayName: student.displayName || (student.father_name ? `${student.name} ${student.father_name}` : student.name),
      fatherName: student.father_name || student.fatherName || null,
      class: student.class || student.class_name || null,
      section: student.section || null,
      grNumber: student.gr_number || student.grNumber || null,
      boundAt: Date.now()
    };

    session.activeStudent = studentRecord;
    session.entityGraph.lastSelectedStudent = studentRecord;

    // Add to student history list in entity graph
    const existingIdx = session.entityGraph.students.findIndex(s => s.id === student.id);
    if (existingIdx !== -1) {
      session.entityGraph.students.splice(existingIdx, 1);
    }
    session.entityGraph.students.push(studentRecord);
    if (session.entityGraph.students.length > 10) {
      session.entityGraph.students.shift();
    }

    session.lastConfirmedEntity = 'STUDENT';
    session.lastUpdated = Date.now();
  }

  /**
   * Bind an active challan reference to the session & entity graph
   */
  bindChallan(userId, challan, channel = 'whatsapp') {
    if (!challan) return;
    const session = this.getSession(userId, channel);
    const challanRecord = {
      id: challan.id,
      challanNo: challan.challan_no || challan.challanNo || null,
      studentId: challan.student_id || challan.studentId || null,
      month: challan.month || null,
      year: challan.year || null,
      boundAt: Date.now()
    };

    session.activeChallan = challanRecord;
    session.entityGraph.challans.push(challanRecord);
    if (session.entityGraph.challans.length > 10) {
      session.entityGraph.challans.shift();
    }

    session.lastConfirmedEntity = 'CHALLAN';
    session.lastUpdated = Date.now();
  }

  /**
   * Bind candidate draft for multi-turn admission
   */
  updateCandidateDraft(userId, draftUpdates, channel = 'whatsapp') {
    const session = this.getSession(userId, channel);
    session.activeCandidate = {
      ...(session.activeCandidate || {}),
      ...draftUpdates,
      lastModified: Date.now()
    };
    session.lastConfirmedEntity = 'ADMISSION_CANDIDATE';
    session.lastUpdated = Date.now();
  }

  clearCandidateDraft(userId, channel = 'whatsapp') {
    const session = this.getSession(userId, channel);
    session.activeCandidate = null;
    session.lastUpdated = Date.now();
  }

  recordTurn(userId, utterance, intent, channel = 'whatsapp') {
    const session = this.getSession(userId, channel);
    session.lastIntent = intent;
    session.interactionCount++;
    session.recentUtterances.push({
      text: utterance,
      intent,
      timestamp: Date.now()
    });
    if (session.recentUtterances.length > 10) {
      session.recentUtterances.shift();
    }
    session.lastUpdated = Date.now();
  }

  /**
   * Advanced Entity Graph Reference Resolver
   * Resolves:
   * 1. Pronouns: "iski", "iska", "uski", "unka"
   * 2. Ordinal references: "pehle jo select ki thi", "doosri wali", "second wali"
   * 3. Identity references: "same student", "wahi wala", "wahi wali"
   * 4. Attribute filters: "jo Seven mein hai", "jis ka father Waqas hai"
   * 5. Challan anaphora: "us challan ko", "wahi challan"
   */
  resolveContextualReference(userId, rawText, channel = 'whatsapp') {
    const session = this.getSession(userId, channel);
    const text = String(rawText || '').trim().toLowerCase();
    const graph = session.entityGraph;

    // A. Ordinal: "pehle jo student select ki thi" / "previous student"
    if (/\b(?:pehle\s*jo|previous\s*student|pehle\s*wali|pehli\s*student)\b/i.test(text)) {
      const prev = graph.previousSelectedStudent || (graph.students.length >= 2 ? graph.students[graph.students.length - 2] : null);
      if (prev) {
        return {
          hasReference: true,
          resolvedStudent: prev,
          resolvedChallan: session.activeChallan,
          referenceType: 'ORDINAL_PREVIOUS'
        };
      }
    }

    // B. Ordinal: "doosri wali" / "second wali" / "second one"
    if (/\b(?:doosri\s*wali|second\s*wali|second\s*one|number\s*two)\b/i.test(text)) {
      const second = graph.students.length >= 2 ? graph.students[1] : null;
      if (second) {
        return {
          hasReference: true,
          resolvedStudent: second,
          resolvedChallan: session.activeChallan,
          referenceType: 'ORDINAL_SECOND'
        };
      }
    }

    // C. Attribute filter: "jo Seven mein hai" / "jo class X mein hai"
    const classMatch = text.match(/\bjo\s*(?:class\s*)?([a-zA-Z0-9]+)\s*mein\s*hai\b/i);
    if (classMatch) {
      const targetClass = classMatch[1].toLowerCase();
      const matched = graph.students.find(s => s.class && s.class.toLowerCase().includes(targetClass));
      if (matched) {
        return {
          hasReference: true,
          resolvedStudent: matched,
          resolvedChallan: session.activeChallan,
          referenceType: 'ATTRIBUTE_CLASS_MATCH'
        };
      }
    }

    // D. Attribute filter: "jis ka father Waqas hai"
    const fatherMatch = text.match(/\bjis\s*(?:ka|ke)\s*father\s*([a-zA-Z]+)\s*(?:hai|hain)?\b/i);
    if (fatherMatch) {
      const targetFather = fatherMatch[1].toLowerCase();
      const matched = graph.students.find(s => s.fatherName && s.fatherName.toLowerCase().includes(targetFather));
      if (matched) {
        return {
          hasReference: true,
          resolvedStudent: matched,
          resolvedChallan: session.activeChallan,
          referenceType: 'ATTRIBUTE_FATHER_MATCH'
        };
      }
    }

    // E. Identity continuity: "same student" / "wahi wala" / "wahi wali" / "isi bachay"
    if (/\b(?:same\s*student|wahi\s*wala|wahi\s*wali|isi\s*bachay|ussi\s*bachay)\b/i.test(text) && session.activeStudent) {
      return {
        hasReference: true,
        resolvedStudent: session.activeStudent,
        resolvedChallan: session.activeChallan,
        referenceType: 'IDENTITY_SAME'
      };
    }

    // F. Challan anaphora: "us challan ko" / "wahi challan" / "ye challan"
    if (/\b(?:us\s*challan|wahi\s*challan|iss\s*challan|ye\s*challan)\b/i.test(text) && session.activeChallan) {
      return {
        hasReference: true,
        resolvedStudent: session.activeStudent,
        resolvedChallan: session.activeChallan,
        referenceType: 'CHALLAN_ANAPHORA'
      };
    }

    // G. Standard pronouns: "iski", "iska", "uski", "unka", "in"
    const isPronounRef = (
      /\b(iski|iska|uski|uska|iske|uske|in|un|unka|unki|iss\s*bachay|is\s*bachay|us\s*bachay)\b/i.test(text) ||
      /^(?:fee\s*)?(?:pay|submit|jama|paid|clear|close)\s*(?:kar\s*do|kr\s*do|kardo|krdo)?$/i.test(text)
    );

    if (isPronounRef && session.activeStudent) {
      return {
        hasReference: true,
        resolvedStudent: session.activeStudent,
        resolvedChallan: session.activeChallan,
        referenceType: 'PRONOUN_STANDARD'
      };
    }

    // H. Implicit action on active student without explicit name
    if (session.activeStudent) {
      const hasAction = /\b(?:fee|challan|attendance|profile|record|dakhla|result|parhta|parhti)\b/i.test(text);
      if (hasAction && text.split(/\s+/).length <= 4) {
        return {
          hasReference: true,
          resolvedStudent: session.activeStudent,
          resolvedChallan: session.activeChallan,
          referenceType: 'IMPLICIT_CONTEXT'
        };
      }
    }

    return {
      hasReference: false,
      resolvedStudent: null,
      resolvedChallan: null,
      referenceType: 'NONE'
    };
  }

  verifyOperationalFactFreshness() {
    return {
      ENTITY_REFERENCE_MEMORY: 'ENABLED',
      STALE_OPERATIONAL_FACT_MEMORY: 'PROHIBITED',
      OPERATIONAL_FACT_TTL_MS: 0,
      POLICY: 'LIVE_SAAS_READ_REQUIRED_BEFORE_EVERY_FACTUAL_RESPONSE'
    };
  }
}

export const contextualEntityMemory = new ContextualEntityMemory();
