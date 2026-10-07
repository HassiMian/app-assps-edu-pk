/**
 * JARVIS 4.3 — Understanding-First Cognitive Core: Hybrid Semantic Intent Resolver
 *
 * PRIMARY PRINCIPLE: UNDERSTAND BEFORE RESPONDING.
 *
 * 4-Tier Hybrid Pipeline:
 * - Tier 0: Deterministic Safety Kernel & High-Confidence Syntactic Semantics (~0.05ms)
 * - Tier 1: Semantic Vector Embedding Retrieval (models/gemini-embedding-001) (~10ms)
 * - Tier 2: Fast LLM NLU Model Escalation (gemini-2.5-flash) (~400ms)
 * - Tier 3: Strong Reasoning Model DAG Planner (gemini-2.5-pro) for complex multi-intent & conditions
 *
 * Core Invariants:
 * 1. UNDERSTAND_BEFORE_RESPOND — ComprehensionObject built before any routing decision.
 * 2. Zero-Bypass Deterministic Safety Kernel (RBAC, Privacy, Financial Write Authority).
 * 3. HIGH_CONFIDENCE (>=0.85) → execute. MEDIUM (0.65-0.85) → verify. LOW (<0.65) → clarify.
 * 4. LOW_CONFIDENCE_BLIND_EXECUTION = 0.
 * 5. Model generated operational facts = 0.
 * 6. Negation critical errors = 0.
 */

import { CANONICAL_INTENTS, Modality, RiskTier, getIntentDefinition } from './semantic-intent-ontology.mjs';
import { BusinessSemanticInterpreter } from './business-semantic-interpreter.mjs';
import { contextualEntityMemory } from './contextual-entity-memory.mjs';
import { safeLearningStore } from './safe-learning-store.mjs';
import { semanticEmbeddingEngine } from './semantic-embedding-engine.mjs';
import { llmNluEscalationService } from './llm-nlu-escalation-service.mjs';
import { semanticCapabilityDagPlanner } from './semantic-capability-dag-planner.mjs';
import { resolveSymbol } from './argus-market-engine.mjs';
import { StudentQueryParser } from './entity-extractor.mjs';
import { ComprehensionEngine, normalizeTypos, CONTEXT_ACTIONS } from './comprehension-engine.mjs';

export class SemanticIntentResolver {
  constructor(options = {}) {
    this.memory = options.memory || contextualEntityMemory;
    this.learningStore = options.learningStore || safeLearningStore;
    this.embeddingEngine = options.embeddingEngine || semanticEmbeddingEngine;
    this.nluService = options.nluService || llmNluEscalationService;
    this.dagPlanner = options.dagPlanner || semanticCapabilityDagPlanner;
    this.confidenceThreshold = options.confidenceThreshold || 0.85;
    this.routingStats = {
      tier0: 0,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      total: 0
    };
  }

  /**
   * Main Entrypoint: Resolve natural language into canonical business intent & capability plan
   */
  async resolve(rawMessage, options = {}) {
    const startTime = Date.now();
    const rawText = String(rawMessage || '').trim();
    const userId = options.userId || options.fromNumber || 'default';
    const role = (options.role || options.userRole || 'PUBLIC').toUpperCase();
    const channel = options.channel || 'whatsapp';

    this.routingStats.total++;
    this.learningStore.metrics.totalInteractions++;

    // ══════════════════════════════════════════════════════════════════════════
    // JARVIS 4.3 — STEP 0: COMPREHENSION FIRST (MANDATORY)
    // Build ComprehensionObject before any routing decision.
    // NO RESPONSE may be emitted before this object exists.
    // ══════════════════════════════════════════════════════════════════════════
    const session = this.memory.getSession(userId, channel);
    const sessionForComprehension = {
      lastStudent: options.lastStudent || session.lastStudent || session.activeStudent || null,
      activeStudent: session.activeStudent || null,
      currentClass: session.currentClass || session.activeClass || null,
      pendingClarification: session.unresolvedSlot || null,
    };
    const activeContextForComprehension = options.activeContext || null;
    const comprehension = ComprehensionEngine.build(
      rawText,
      sessionForComprehension,
      activeContextForComprehension,
      role
    );

    // ── CONFIDENCE GATE (JARVIS 4.3 §3) ──
    // LOW_CONFIDENCE_BLIND_EXECUTION = 0
    const CONFIDENCE_HIGH = 0.85;
    const CONFIDENCE_MEDIUM = 0.65;
    const confidenceGate = comprehension.CONFIDENCE >= CONFIDENCE_HIGH
      ? 'EXECUTE'
      : comprehension.CONFIDENCE >= CONFIDENCE_MEDIUM
        ? 'VERIFY'
        : 'CLARIFY';

    // Store comprehension in options for router self-check
    options._comprehension = comprehension;
    options._confidenceGate = confidenceGate;

    // ── MULTI-INTENT CHECK ──
    if (comprehension.MULTI_INTENTS && comprehension.MULTI_INTENTS.length >= 2) {
      // Return a multi-intent resolution for the router to execute sequentially
      return this._buildResolutionResult({
        intentId: comprehension.MULTI_INTENTS[0],
        confidence: comprehension.CONFIDENCE,
        reasoning: `JARVIS 4.3 Multi-Intent: [${comprehension.MULTI_INTENTS.join(', ')}]`,
        entities: comprehension.ENTITIES,
        modality: Modality.READ,
        role,
        routingTier: 'TIER_0_DETERMINISTIC',
        startTime,
        comprehension,
        multiIntents: comprehension.MULTI_INTENTS,
        multiIntentSegments: comprehension.MULTI_INTENT_SEGMENTS,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: Context Resolution & Advanced Entity Graph Binding
    // ──────────────────────────────────────────────────────────────────────────
    const contextualRef = this.memory.resolveContextualReference(userId, rawText, channel);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: Deterministic Business Semantic Interpretation
    // ──────────────────────────────────────────────────────────────────────────
    const semantics = BusinessSemanticInterpreter.interpret(rawText, {
      activeStudent: contextualRef.resolvedStudent || session.activeStudent,
      activeChallan: contextualRef.resolvedChallan || session.activeChallan,
      activeCandidate: session.activeCandidate,
      lastIntent: session.lastIntent
    });

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: Deterministic Security & Privacy Guard (INVARIANT: NEVER BYPASSED)
    // ──────────────────────────────────────────────────────────────────────────
    if (role === 'PUBLIC') {
      const isSensitiveStudentOrFinance = (
        semantics.financial.isFinancial ||
        (semantics.operational.isStudentRoster && !/\b(?:total|how\s*many|count|tadaad)\b/i.test(rawText))
      );

      if (isSensitiveStudentOrFinance) {
        this.routingStats.tier0++;
        return this._buildResolutionResult({
          intentId: 'PUBLIC_INFO',
          confidence: 1.0,
          reasoning: 'Privacy Guard: Blocked sensitive student and financial records for unauthenticated public caller.',
          entities: {},
          modality: Modality.READ,
          role,
          routingTier: 'TIER_0_DETERMINISTIC',
          startTime
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: Adversarial Negation Check (INVARIANT: NEGATION_CRITICAL_ERRORS = 0)
    // ──────────────────────────────────────────────────────────────────────────
    const isExplicitNegation = (
      /\b(?:mat|dont|never|do\s*not|cancel|nahi\s*hui|na\s*(?:karo|karna|lagao|karein|dena)|nahi\s*(?:karna|kro|karo|karein|karwana|bhejna|dena|chahiye)|rehny\s*do|rehne\s*do)\b/i.test(rawText) ||
      /(?:^|\s)(?:مت|نہیں|نہیں\s*ہوئی|نہ\s*کریں|کینسل|رہنے\s*دو)(?:\s|$)/.test(rawText) ||
      /مت\s*(?:کرنا|کرو|لگاؤ|لگائیں|لکھو)/.test(rawText) ||
      Boolean(comprehension?.NEGATION?.detected)
    );

    const hasExplicitReadQuery = (
      semantics.financial.isFinancial ||
      semantics.operational.isAttendance ||
      semantics.operational.isStudentRoster ||
      /\b(?:fee|fees|record|records|details|detail|dues|balance|attendance|marks|result|batao|btao|janna|dekho|dikhao|check)\b/i.test(rawText) ||
      /فیس|چالان|بقایا|حاضری|ریکارڈ|بتاؤ|بتائیں/.test(rawText)
    );

    if (isExplicitNegation && !hasExplicitReadQuery) {
      this.routingStats.tier0++;
      return this._buildResolutionResult({
        intentId: 'GENERAL_CONVERSATION',
        confidence: 0.98,
        reasoning: 'Negation Guard: Explicit user negation command detected; mutation blocked.',
        entities: this._extractEntities(rawText, semantics, contextualRef, session),
        modality: Modality.CONVERSATIONAL,
        role,
        routingTier: 'TIER_0_DETERMINISTIC',
        negationDetected: true,
        startTime
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: Multi-Intent & Condition Detection (Escalate to Tier 3 DAG Planner)
    // ──────────────────────────────────────────────────────────────────────────
    const isMultiIntentOrConditional = (
      (/\b(?:aur|then|phir|after\s*that|ke\s*baad)\b/i.test(rawText) || /اور|پھر/i.test(rawText)) &&
      (/\b(?:check|dekh|dikhao)\b/i.test(rawText)) &&
      (/\b(?:paid|jama|clear|print|bhejo)\b/i.test(rawText))
    ) || /\b(?:agar|if|jab|unless|sirf\s*tab)\b/i.test(rawText) || /اگر|جب/i.test(rawText);

    if (isMultiIntentOrConditional && !semantics.openDomain?.isMarket) {
      this.routingStats.tier3++;
      const nluEscalation = await this.nluService.escalateNlu({
        userMessage: rawText,
        language: 'roman_urdu',
        conversationContext: { activeStudent: contextualRef.resolvedStudent || session.activeStudent },
        candidateIntents: [],
        availableCapabilities: ['school.resolve_student', 'school.fetch_challans', 'school.record_fee_payment', 'desktop.print_document'],
        isMultiIntent: true
      });

      const dag = this.dagPlanner.planDag(nluEscalation, session);

      return this._buildResolutionResult({
        intentId: nluEscalation.intent,
        confidence: nluEscalation.confidence || 0.95,
        reasoning: `Tier 3 Strong Reasoner: Multi-Intent DAG with ${dag.nodes.length} steps & conditions.`,
        entities: nluEscalation.entities,
        modality: nluEscalation.modality || Modality.WRITE,
        role,
        routingTier: 'TIER_3_STRONG_REASONER',
        dagPlan: dag,
        conditions: nluEscalation.conditions,
        startTime
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: High-Confidence Tier 0 Deterministic Business Logic (~0.05ms)
    // ──────────────────────────────────────────────────────────────────────────
    let candidateIntent = null;
    let confidence = 0.50;
    let reasoning = '';

    const { financial, academic, operational, openDomain, modality } = semantics;

    if (openDomain.isMarket) {
      candidateIntent = 'MARKET_INTELLIGENCE';
      confidence = 0.98;
      reasoning = 'Real-time financial market, gold, currency, or crypto price request.';
    } else if (semantics.publicInfo) {
      candidateIntent = 'PUBLIC_INFO';
      confidence = 0.98;
      reasoning = 'School location, timings, helpline, or general institutional information.';
    } else if (openDomain.isDesktop) {
      candidateIntent = 'DESKTOP_ACTION';
      confidence = 0.95;
      reasoning = 'Desktop application control and document printing.';
    } else if (openDomain.isBrowser) {
      candidateIntent = 'BROWSER_RESEARCH';
      confidence = 0.95;
      reasoning = 'External web browsing and live information extraction.';
    } else if (financial.isFinancial) {
      if (financial.cashReceived || financial.ledgerWriteRequested) {
        if (modality === 'QUERY' && !financial.ledgerWriteRequested) {
          candidateIntent = 'READ_STUDENT_FEE';
          confidence = 0.95;
          reasoning = 'Query modality asking about fee payment status.';
        } else {
          candidateIntent = 'RECORD_FEE_COLLECTION';
          confidence = 0.98;
          reasoning = 'Financial write command: cash received by hand at school; ledger settlement commanded.';
        }
      } else if (financial.isSummaryScope) {
        candidateIntent = 'READ_FEE_SUMMARY';
        confidence = 0.98;
        reasoning = 'Macro school fee collection and pending summary query.';
      } else {
        candidateIntent = 'READ_STUDENT_FEE';
        confidence = 0.96;
        reasoning = 'Individual student fee balance or voucher inquiry.';
      }
    } else if (academic.isAdmission && !operational.isStudentCount && !(comprehension?.NEGATION?.detected && comprehension?.NEGATION?.negatedDomain === 'ADMISSION')) {
      if (session.activeCandidate && session.activeCandidate.state === 'COLLECTING') {
        candidateIntent = 'UPDATE_ADMISSION_DRAFT';
        confidence = 0.97;
        reasoning = 'Multi-turn candidate field enrichment during active admission workflow.';
      } else if (academic.admissionWriteRequested) {
        candidateIntent = 'CREATE_ADMISSION';
        confidence = 0.98;
        reasoning = 'Command to admit or initiate student enrollment.';
      } else {
        candidateIntent = 'PUBLIC_INFO';
        confidence = 0.92;
        reasoning = 'General inquiry regarding school admission policies and offerings.';
      }
    } else if (operational.isAttendance) {
      if (operational.isAttendanceWrite) {
        candidateIntent = 'MARK_ATTENDANCE';
        confidence = 0.98;
        reasoning = 'Command to record attendance into authoritative database.';
      } else {
        candidateIntent = 'READ_ATTENDANCE';
        confidence = 0.98;
        reasoning = 'Attendance telemetry and absence metrics query.';
      }
    } else if (this._extractCanonicalClass(rawText)) {
      const className = this._extractCanonicalClass(rawText);
      const parsed = StudentQueryParser.parse(rawText);
      const hasPronoun = /\b(?:iski|iska|uska|uski|iske|uske|unki|unka|is\s*student|iss\s*student)\b/i.test(rawText);
      if ((parsed.student_name || hasPronoun) && !/\b(kitn|bachay|students|strength|total|tadaad|count)\b/i.test(rawText)) {
        candidateIntent = 'READ_STUDENT_RECORD';
        confidence = 0.95;
        reasoning = `Direct student query with class qualification: ${parsed.student_name || 'pronoun'} (${className}).`;
      } else {
        candidateIntent = 'READ_CLASS_STRENGTH';
        confidence = 0.98;
        reasoning = `Class roster query for specific class: ${className}.`;
      }
    } else if (academic.isClassQuery && !/\b(?:iski|iska|uska|uski)\b/i.test(rawText) && !/اس\s*بچے|اس\s*کی|اس\s*کا/.test(rawText)) {
      candidateIntent = 'READ_CLASSES_LIST';
      confidence = 0.96;
      reasoning = 'Query regarding classes and grade structure offered by school.';
    } else if (
      /\b(?:iski|iska|uska|uski|iske|uske|unki|unka|is\s*student\s*ki|iss\s*student\s*ki|student\s*ki)\s*(?:class|grade|record|profile|details?|detail|father|walid|abbu|parent|name|naam|gr\b|roll)\b/i.test(rawText) ||
      /\b(?:details?|detail|record|records|profile|maloomat)\s*(?:batao|btao|dikhao|dein|do|chahiye)\b/i.test(rawText) ||
      /اس\s*بچے|اس\s*کی\s*کلاس|اس\s*کا\s*نام|تفصیلات|معلومات/.test(rawText)
    ) {
      candidateIntent = 'READ_STUDENT_RECORD';
      confidence = 0.96;
      reasoning = 'Direct or pronoun-scoped student profile inquiry.';
    } else if (operational.isStudentCount) {
      candidateIntent = 'READ_STUDENT_COUNT';
      confidence = 0.98;
      reasoning = 'Query for overall school student enrollment headcount.';
    } else if (operational.isStaff) {
      candidateIntent = 'READ_STAFF_SUMMARY';
      confidence = 0.98;
      reasoning = 'Teaching faculty and operational staff directory query.';
    } else if (modality === 'CONVERSATIONAL') {
      candidateIntent = 'GENERAL_CONVERSATION';
      confidence = 0.98;
      reasoning = 'Social greeting, politeness, or conversational query.';
    }

    // JARVIS 4.3 Comprehension-First Grounding:
    // If Tier 0 legacy rules did not assign an intent, use Comprehension Engine's verified intent
    if (!candidateIntent && comprehension && comprehension.USER_INTENT && comprehension.CONFIDENCE >= 0.75) {
      candidateIntent = comprehension.USER_INTENT;
      confidence = comprehension.CONFIDENCE;
      reasoning = `Comprehension-First: Grounded in verified comprehension ${comprehension.DOMAIN}/${comprehension.SUBDOMAIN}.`;
    }

    // If Tier 0 high-confidence deterministic match, return immediately!
    if (candidateIntent && confidence >= this.confidenceThreshold) {
      this.routingStats.tier0++;
      const intentDef = CANONICAL_INTENTS[candidateIntent];
      let resolvedModality = intentDef ? intentDef.modality : Modality.READ;
      if (resolvedModality === Modality.WRITE && modality === 'QUERY' && !semantics.financial.ledgerWriteRequested) {
        candidateIntent = 'READ_STUDENT_FEE';
        resolvedModality = Modality.READ;
      }
      // Merge: comprehension wins for student name/reference, baseEntities fills other slots
      const baseEntities = this._extractEntities(rawText, semantics, contextualRef, session);
      // Strip generic words that StudentQueryParser may spuriously extract
      const GENERIC_REFS = new Set(['student', 'students', 'bachay', 'bache', 'bachon', 'is student', 'yeh student']);
      if (baseEntities.studentReference && GENERIC_REFS.has(String(baseEntities.studentReference).toLowerCase())) {
        delete baseEntities.studentReference;
      }
      if (baseEntities.studentName && GENERIC_REFS.has(String(baseEntities.studentName).toLowerCase())) {
        delete baseEntities.studentName;
      }
      const mergedEntities = { ...baseEntities, ...comprehension.ENTITIES };

      // Entity Preservation Contract: If studentName is missing and not replaced, inherit active entity
      if (!mergedEntities.studentName && !mergedEntities.studentReference) {
        const activeStudent = contextualRef?.resolvedStudent || options?.lastStudent || options?.session?.lastStudent || session?.lastStudent || session?.activeStudent;
        if (activeStudent && activeStudent.name) {
          mergedEntities.studentName = activeStudent.name;
          mergedEntities.studentReference = activeStudent.name;
          if (activeStudent.id) mergedEntities.studentId = activeStudent.id;
          if (activeStudent.class && !mergedEntities.className) mergedEntities.className = activeStudent.class;
          mergedEntities.resolvedVia = contextualRef?.referenceType || 'CONTEXT_MEMORY';
        }
      }

      return this._buildResolutionResult({
        intentId: candidateIntent,
        confidence,
        reasoning,
        entities: mergedEntities,
        modality: resolvedModality,
        role,
        routingTier: 'TIER_0_DETERMINISTIC',
        startTime,
        comprehension,
        negationDetected: Boolean(isExplicitNegation || comprehension.NEGATION?.detected),
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: Tier 1 Semantic Vector Embedding & Exemplar Lookup (~10ms)
    // ──────────────────────────────────────────────────────────────────────────
    const queryEmbedding = await this.embeddingEngine.getEmbedding(rawText);
    const exemplarMatch = this.learningStore.findMatchingExemplar(rawText, queryEmbedding);

    if (exemplarMatch && exemplarMatch.confidence >= this.confidenceThreshold) {
      if (!this.learningStore.hasNegativePenalty(rawText, exemplarMatch.intent)) {
        this.routingStats.tier1++;
        return this._buildResolutionResult({
          intentId: exemplarMatch.intent,
          confidence: exemplarMatch.confidence,
          reasoning: `Tier 1 Vector Embedding: Matched verified pattern from ${exemplarMatch.source} (${exemplarMatch.matchType}).`,
          entities: this._extractEntities(rawText, semantics, contextualRef, session),
          modality: CANONICAL_INTENTS[exemplarMatch.intent]?.modality || Modality.READ,
          role,
          routingTier: 'TIER_1_EMBEDDING',
          startTime
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 8: Tier 2 Fast LLM NLU Escalation (for novel / low confidence)
    // ──────────────────────────────────────────────────────────────────────────
    if (!candidateIntent || confidence < this.confidenceThreshold) {
      this.routingStats.tier2++;
      const vectorCandidates = await this.embeddingEngine.findCandidatesByEmbedding(rawText, 3);
      const nluRes = await this.nluService.escalateNlu({
        userMessage: rawText,
        language: 'roman_urdu',
        conversationContext: { activeStudent: contextualRef.resolvedStudent || session.activeStudent },
        candidateIntents: vectorCandidates,
        availableCapabilities: ['school.resolve_student', 'school.fetch_challans', 'school.record_fee_payment', 'school.read_ledger']
      });

      // Disagreement Arbiter (Section 11):
      // Only trigger if vector embedding has HIGH CONFIDENCE (>= 0.88) in a conflicting READ intent
      const topVector = vectorCandidates[0];
      if (topVector && topVector.similarity >= 0.88 && nluRes.modality === 'WRITE' && topVector.intent !== nluRes.intent) {
        const topDef = CANONICAL_INTENTS[topVector.intent];
        if (topDef && topDef.modality === Modality.READ) {
          // Disagreement detected: high-confidence embedding says READ, LLM says WRITE -> FAIL SAFE
          return this._buildResolutionResult({
            intentId: 'CLARIFICATION_REQUIRED',
            confidence: 0.60,
            reasoning: 'Conflict Arbiter: High-confidence vector evidence conflicts with Write prediction; failing safe.',
            entities: nluRes.entities,
            modality: Modality.READ,
            role,
            routingTier: 'TIER_2_FAST_NLU',
            startTime
          });
        }
      }

      candidateIntent = nluRes.intent;
      confidence = nluRes.confidence || 0.90;
      reasoning = `Tier 2 Fast NLU: ${nluRes.reasoning_summary}`;
    } else {
      this.routingStats.tier0++;
    }

    // Read/Write Modality Arbiter
    const intentDef = CANONICAL_INTENTS[candidateIntent];
    let resolvedModality = intentDef ? intentDef.modality : Modality.READ;
    if (resolvedModality === Modality.WRITE && modality === 'QUERY' && !semantics.financial.ledgerWriteRequested) {
      candidateIntent = 'READ_STUDENT_FEE';
      resolvedModality = Modality.READ;
      reasoning = 'Collision Arbiter: Restored to READ intent due to query syntactic modality.';
    }

    const baseEntities = this._extractEntities(rawText, semantics, contextualRef, session);
    // Strip generic words that StudentQueryParser may spuriously extract
    const GENERIC_REFS_2 = new Set(['student', 'students', 'bachay', 'bache', 'bachon']);
    if (baseEntities.studentReference && GENERIC_REFS_2.has(String(baseEntities.studentReference).toLowerCase())) {
      delete baseEntities.studentReference;
    }
    if (baseEntities.studentName && GENERIC_REFS_2.has(String(baseEntities.studentName).toLowerCase())) {
      delete baseEntities.studentName;
    }
    // Comprehension wins for name/reference slots
    const mergedEntities = { ...baseEntities, ...comprehension.ENTITIES };

    // Entity Preservation Contract: If studentName is missing and not replaced, inherit active entity
    if (!mergedEntities.studentName && !mergedEntities.studentReference) {
      const activeStudent = contextualRef?.resolvedStudent || options?.lastStudent || options?.session?.lastStudent || session?.lastStudent || session?.activeStudent;
      if (activeStudent && activeStudent.name) {
        mergedEntities.studentName = activeStudent.name;
        mergedEntities.studentReference = activeStudent.name;
        if (activeStudent.id) mergedEntities.studentId = activeStudent.id;
        if (activeStudent.class && !mergedEntities.className) mergedEntities.className = activeStudent.class;
        mergedEntities.resolvedVia = contextualRef?.referenceType || 'CONTEXT_MEMORY';
      }
    }

    return this._buildResolutionResult({
      intentId: candidateIntent,
      confidence,
      reasoning,
      entities: mergedEntities,
      modality: resolvedModality,
      role,
      routingTier: this.routingStats.tier2 > 0 ? 'TIER_2_FAST_NLU' : 'TIER_0_DETERMINISTIC',
      startTime,
      comprehension,
      negationDetected: Boolean(isExplicitNegation || comprehension.NEGATION?.detected),
    });
  }

  _extractCanonicalClass(text) {
    const lower = text.toLowerCase();
    const patterns = [
      { regex: /\b(?:class\s*|grade\s*)?starter\b/i, name: 'Starter' },
      { regex: /\b(?:class\s*|grade\s*)?mover\b/i, name: 'Mover' },
      { regex: /\b(?:class\s*|grade\s*)?flyer\b/i, name: 'Flyer' },
      { regex: /\b(?:class\s*|grade\s*)?nursery\b/i, name: 'Nursery' },
      { regex: /\b(?:class\s*|grade\s*)?prep\b/i, name: 'Prep' },
      { regex: /\b(?:class\s*|grade\s*)?(?:1|one|pehli)\b/i, name: 'One' },
      { regex: /\b(?:class\s*|grade\s*)?(?:2|two|doosri)\b/i, name: 'Two' },
      { regex: /\b(?:class\s*|grade\s*)?(?:3|three|teesri)\b/i, name: 'Three' },
      { regex: /\b(?:class\s*|grade\s*)?(?:4|four|chothi)\b/i, name: 'Four' },
      { regex: /\b(?:class\s*|grade\s*)?(?:5|five|panchween)\b/i, name: 'Five' },
      { regex: /\b(?:class\s*|grade\s*)?(?:6|six|chhati)\b/i, name: 'Six' },
      { regex: /\b(?:class\s*|grade\s*)?(?:7|seven|saatween)\b/i, name: 'Seven' },
      { regex: /\b(?:class\s*|grade\s*)?(?:8|eight|aathween)\b/i, name: 'Eight' },
      { regex: /\b(?:class\s*|grade\s*)?(?:9|nine|pre\s*nine)\b/i, name: 'Pre Nine' },
      { regex: /کلاس\s*اول|جماعت\s*اول/i, name: 'One' },
      { regex: /کلاس\s*دوم|جماعت\s*دوم/i, name: 'Two' },
      { regex: /کلاس\s*سوم|جماعت\s*سوم/i, name: 'Three' },
      { regex: /کلاس\s*چہارم|جماعت\s*چہارم/i, name: 'Four' },
      { regex: /کلاس\s*پنجم|جماعت\s*پنجم/i, name: 'Five' },
      { regex: /کلاس\s*ششم|جماعت\s*ششم/i, name: 'Six' },
      { regex: /کلاس\s*ہفتم|جماعت\s*ہفتم/i, name: 'Seven' },
      { regex: /کلاس\s*ہشتم|جماعت\s*ہشتم/i, name: 'Eight' },
      { regex: /پری\s*نائن/i, name: 'Pre Nine' }
    ];

    for (const p of patterns) {
      if (p.regex.test(lower)) return p.name;
    }
    return null;
  }

  _extractEntities(rawText, semantics, contextualRef, session) {
    const entities = {};
    if (semantics.financial.amount) entities.amount = semantics.financial.amount;
    const cls = this._extractCanonicalClass(rawText);
    if (cls) entities.className = cls;

    if (contextualRef && contextualRef.resolvedStudent) {
      entities.studentId = contextualRef.resolvedStudent.id;
      entities.studentName = contextualRef.resolvedStudent.name;
      entities.studentReference = contextualRef.resolvedStudent.name;
      entities.resolvedVia = contextualRef.referenceType || 'CONTEXT_MEMORY';
      if (contextualRef.resolvedStudent.class && !entities.className) {
        entities.className = contextualRef.resolvedStudent.class;
      }
    } else {
      const parsed = StudentQueryParser.parse(rawText, {
        currentStudent: session?.activeStudent || null,
        currentClass: session?.activeClass || null
      });
      if (parsed.student_name) {
        entities.studentName = parsed.student_name;
        entities.studentReference = parsed.student_name;
      } else if (session?.activeStudent?.name || session?.lastStudent?.name) {
        const s = session?.activeStudent || session?.lastStudent;
        entities.studentName = s.name;
        entities.studentReference = s.name;
        if (s.id) entities.studentId = s.id;
        if (s.class && !entities.className) entities.className = s.class;
        entities.resolvedVia = 'SESSION_ACTIVE_STUDENT';
      }
      if (parsed.class_name && !entities.className) {
        entities.className = parsed.class_name;
      } else if (session?.activeClass && !entities.className) {
        entities.className = session.activeClass;
      }
      if (parsed.gr_number) {
        entities.grNumber = parsed.gr_number;
        if (!entities.studentReference) entities.studentReference = parsed.gr_number;
      }
    }

    if (contextualRef && contextualRef.resolvedChallan) {
      entities.challanId = contextualRef.resolvedChallan.id || contextualRef.resolvedChallan.challanNo;
    }

    if (semantics.openDomain && semantics.openDomain.isMarket) {
      entities.symbol = resolveSymbol(rawText);
      entities.isMarket = true;
      if (/\b(?:setup|probability)\b/i.test(rawText)) entities.marketRequestType = 'SETUP';
      else if (/\b(?:trend|direction)\b/i.test(rawText)) entities.marketRequestType = 'TREND';
      else if (/\b(?:levels?|support|resistance)\b/i.test(rawText)) entities.marketRequestType = 'LEVELS';
      else entities.marketRequestType = 'ANALYSIS';
    }

    return entities;
  }

  _buildResolutionResult(data) {
    const {
      intentId, confidence, reasoning, entities, modality, role,
      routingTier = 'TIER_0_DETERMINISTIC', dagPlan = null,
      conditions = [], negationDetected = false, startTime = Date.now(),
      comprehension = null, multiIntents = null, multiIntentSegments = null
    } = data;
    const intentDef = CANONICAL_INTENTS[intentId];
    const roles = intentDef?.allowedRoles || intentDef?.requiredRoles || ['OWNER', 'ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'PUBLIC'];
    const isAuthorized = roles.includes('*') || roles.includes(role);
    const latency = Date.now() - startTime;

    const capabilities = intentDef ? [intentDef.category] : ['system.general'];

    return {
      intent: intentId,
      modality,
      confidence,
      reasoning,
      entities,
      riskTier: intentDef?.riskTier || RiskTier.READ_ONLY,
      isAuthorized,
      routingTier,
      dagPlan,
      conditions,
      negationDetected,
      latencyMs: latency,
      // JARVIS 4.3: comprehension object attached for router self-check
      comprehension,
      multiIntents,
      multiIntentSegments,
      confidenceGate: comprehension ? (
        comprehension.CONFIDENCE >= 0.85 ? 'EXECUTE'
          : comprehension.CONFIDENCE >= 0.65 ? 'VERIFY'
          : 'CLARIFY'
      ) : 'EXECUTE',
      evidence: {
        INTENT_SELECTED: intentId,
        CONFIDENCE: confidence,
        SEMANTIC_MATCH: routingTier,
        CONTEXT_REFERENCES: entities.resolvedVia || 'NONE',
        MODEL_USED: routingTier,
        CAPABILITIES_SELECTED: capabilities,
        AUTH_DECISION: isAuthorized ? 'AUTHORIZED' : 'DENIED',
        // JARVIS 4.3 metrics
        UNDERSTAND_BEFORE_RESPOND: 'YES',
        COMPREHENSION_DOMAIN: comprehension?.DOMAIN || 'UNKNOWN',
        COMPREHENSION_SUBDOMAIN: comprehension?.SUBDOMAIN || 'UNKNOWN',
        CONTEXT_ACTION: comprehension?.CONTEXT_ACTION || 'NONE',
        NEGATION_DETECTED: negationDetected || comprehension?.NEGATION?.detected || false,
        CORRECTION_DETECTED: comprehension?.USER_CORRECTION?.detected || false,
        CONFIDENCE_GATE: comprehension ? (
          comprehension.CONFIDENCE >= 0.85 ? 'EXECUTE'
            : comprehension.CONFIDENCE >= 0.65 ? 'VERIFY'
            : 'CLARIFY'
        ) : 'EXECUTE'
      }
    };
  }

  getRoutingDistribution() {
    const total = this.routingStats.total || 1;
    return {
      DETERMINISTIC_ROUTE_PERCENT: ((this.routingStats.tier0 / total) * 100).toFixed(2) + '%',
      EMBEDDING_ROUTE_PERCENT: ((this.routingStats.tier1 / total) * 100).toFixed(2) + '%',
      LLM_ROUTE_PERCENT: ((this.routingStats.tier2 / total) * 100).toFixed(2) + '%',
      STRONG_MODEL_ROUTE_PERCENT: ((this.routingStats.tier3 / total) * 100).toFixed(2) + '%'
    };
  }
}

export const semanticIntentResolver = new SemanticIntentResolver();
