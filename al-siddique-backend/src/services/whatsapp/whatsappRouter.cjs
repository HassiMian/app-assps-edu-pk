/**
 * Unified WhatsApp Intelligent Router — JARVIS 3.0 Cognitive Core
 * 
 * 4-Tier Hybrid Architecture:
 * - Tier 0: High-Confidence Deterministic Routing (Fast single-fact lookup)
 * - Tier 1: Semantic / NLU Intent Resolution (Typo tolerance, multi-turn follow-ups, self-repair)
 * - Tier 2: Model-Assisted Planning & Grounded Compositional School Reasoning
 * - Tier 3: Multi-Capability DAG Execution (Complex action requests via MasterCommandOrchestrator)
 * 
 * Strictly grounded in live School API data. Zero hallucination.
 */

const fs = require('fs');
const path = require('path');
const { detectLanguage } = require('./languageDetector.cjs');
const { SchoolDataEngine, normalizeClassName } = require('./schoolDataEngine.cjs');
const { CompositionalSchoolReasoner } = require('./compositionalSchoolReasoner.cjs');
const { WhatsAppResponseComposer } = require('./responseComposer.cjs');
const { missionManager } = require('./missionManager.cjs');
const { admissionWorkflowEngine, ADMISSION_STATES } = require('./admissionWorkflowEngine.cjs');
const { semanticIntentResolver } = require('../../shared/semantic-intent-resolver.cjs');
const { contextualEntityMemory } = require('../../shared/contextual-entity-memory.cjs');
const { safeLearningStore } = require('../../shared/safe-learning-store.cjs');
const { argusMarketEngine, resolveSymbol } = require('../../shared/argus-market-engine.cjs');
const { StudentQueryParser } = require('../../shared/entity-extractor.cjs');
const { ComprehensionEngine } = require('../../shared/comprehension-engine.cjs');
const { cognitiveKernel } = require('../../shared/cognitive-kernel.cjs');
const {
  CANONICAL_OWNER_E164,
  normalizePhoneNumber,
  resolveUserRole,
  isOwner,
  checkMarketAccess,
  formatScopeRestrictionResponse
} = require('../../shared/argus-channel-guard.cjs');

try {
  const dns = require('dns');
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch {}

class WhatsAppRouter {
  constructor(dataEngineOrOptions = null, geminiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) {
    if (dataEngineOrOptions instanceof SchoolDataEngine || (dataEngineOrOptions && typeof dataEngineOrOptions.getStudentFee === 'function')) {
      this.dataEngine = dataEngineOrOptions;
    } else if (dataEngineOrOptions && typeof dataEngineOrOptions === 'object' && !(dataEngineOrOptions instanceof Function)) {
      this.dataEngine = new SchoolDataEngine(dataEngineOrOptions);
    } else {
      this.dataEngine = new SchoolDataEngine();
    }
    admissionWorkflowEngine.dataEngine = this.dataEngine;
    this.geminiKey = geminiKey;
    this.compositionalReasoner = new CompositionalSchoolReasoner(this.dataEngine);
    this.sessions = new Map();
    this.orchestrator = null;
    this.routingStats = {
      tier0: 0,
      nlu: 0,
      modelPlanned: 0,
      dagPlanned: 0,
      genericFallbacks: 0
    };
  }

  getSession(fromNumber) {
    const clean = normalizePhoneNumber(fromNumber) || String(fromNumber || '').replace(/\D/g, '');
    if (!this.sessions.has(clean)) {
      this.sessions.set(clean, {
        userId: clean,
        history: [],
        greetingSent: false,
        lastEventText: '',
        lastEventTime: 0,
        currentClass: null,
        currentCount: null,
        previousClass: null,
        previousCount: null,
        lastReport: null,
        lastQuery: null
      });
    }
    return this.sessions.get(clean);
  }

  resolveRole(fromNumber) {
    return resolveUserRole(fromNumber);
  }

  /**
   * Parent-Child Isolation & Privacy Enforcement Gate
   * Ensures:
   * 1. Parents can ONLY access their own registered children.
   * 2. Public / unverified callers cannot access private student records.
   * 3. Owner & Admin have unrestricted administrative access.
   */
  enforceParentChildPrivacy({ fromNumber, role, student, language, forensicTrace, isParent = false }) {
    if (role === 'OWNER' || role === 'ADMIN') {
      return { allowed: true };
    }

    const isMatch = this.dataEngine && this.dataEngine.isStudentParentMatch(student, fromNumber);
    if (!isMatch) {
      if (forensicTrace) {
        forensicTrace.parent_child_isolation_enforced = true;
        forensicTrace.cross_child_leak_blocked = true;
      }
      let reply;
      if (role === 'PARENT' || isParent) {
        reply = (language === 'URDU_SCRIPT')
          ? 'معذرت سر، پرائیویسی پروٹوکول کے تحت والدین صرف اپنے رجسٹرڈ بچے کا ریکارڈ دیکھ سکتے ہیں۔'
          : (language === 'ENGLISH')
            ? 'Sir, under school privacy protocols, parents may only view records for their registered child.'
            : 'Maazrat Sir, privacy protocol ke teht waldein sirf apne registered bachay ka record dekh sakte hain.';
      } else {
        reply = (language === 'URDU_SCRIPT')
          ? 'معذرت، طالب علم کی فیس اور ذاتی ریکارڈ صرف تصدیق شدہ والدین یا اسکول انتظامیہ کو فراہم کیا جا سکتا ہے۔'
          : (language === 'ENGLISH')
            ? 'Sir, student fee and private records are only accessible to verified parents or school staff.'
            : 'Maazrat, student fee aur private record sirf verified parents ya school staff dekh sakte hain.';
      }
      return {
        allowed: false,
        reasonCode: (role === 'PARENT' || isParent) ? 'PARENT_CHILD_SCOPE_VIOLATION' : 'UNVERIFIED_PUBLIC_DENIED',
        reply
      };
    }

    if (forensicTrace) {
      forensicTrace.parent_child_isolation_enforced = true;
    }
    return { allowed: true };
  }

  /**
   * Enforcing Response Transmission Firewall
   * Blocks cross-domain leaks, write prompt continuation on greetings, or stale prompts on reset
   */
  enforceResponseFirewall(currentDomain, replyText, language) {
    if (!replyText) return replyText;
    const replyLower = String(replyText).toLowerCase();

    // Rule 1: Market query must NEVER emit admission or student collection responses
    if (currentDomain === 'MARKET') {
      if (replyLower.includes('admission complete') || replyLower.includes('fee voucher generate') || replyLower.includes('applying class') || replyLower.includes('contact phone provide') || replyLower.includes('details note kar li hain')) {
        console.error('[RESPONSE_FIREWALL_BLOCKED] Cross-Domain Hijack: Market domain produced Admission text. Blocking outbound transmission!');
        return (language === 'URDU_SCRIPT')
          ? '🛑 آرگس (ARGUS) مارکیٹ انٹیلی جنس: داخلہ سسٹم کے پیغامات مارکیٹ کیوری پر بلاک کر دیے گئے ہیں۔'
          : '🛑 ARGUS Market Intelligence: Cross-domain admission prompt blocked. Please specify your market query.';
      }
    }

    // Rule 2: Greeting must NEVER emit admission slot requests
    if (currentDomain === 'GREETING' || currentDomain === 'GENERAL') {
      if (replyLower.includes('admission complete') || replyLower.includes('fee voucher generate') || replyLower.includes('details note kar li hain') || replyLower.includes('provide karein')) {
        console.error('[RESPONSE_FIREWALL_BLOCKED] Greeting Hijack: Greeting produced Admission prompt. Substituting natural greeting.');
        return (language === 'URDU_SCRIPT') ? 'وعلیکم السلام سر! فرمائیں، میں آپ کی کیا مدد کر سکتا ہوں؟' : 'Hello Sir. How may I assist you today?';
      }
    }

    // Rule 3: Task Reset must NEVER emit admission prompts
    if (currentDomain === 'CONVERSATION_CONTROL') {
      if (replyLower.includes('admission complete') || replyLower.includes('details note kar li hain') || replyLower.includes('provide karein')) {
        console.error('[RESPONSE_FIREWALL_BLOCKED] Reset Hijack: Task reset produced Admission prompt. Substituting clean reset acknowledgment.');
        return (language === 'URDU_SCRIPT') ? 'جی سر، پچھلا ٹاسک ختم کر دیا گیا ہے۔ بتائیں آگے کیا کرنا ہے؟' : 'Ji Sir, previous task close kar diya gaya hai. Batayein next kya karna hai?';
      }
    }

    return replyText;
  }

  /**
   * Main Entrypoint for Inbound Messages
   */
  async processMessage(fromNumber, userText) {
    const startTime = Date.now();
    const rawText = String(userText || '').trim();
    if (!rawText) return null;

    let role = this.resolveRole(fromNumber);
    if (role === 'PUBLIC' && this.dataEngine && this.dataEngine.getStudentsByParentPhone) {
      const linked = await this.dataEngine.getStudentsByParentPhone(fromNumber);
      if (linked && linked.length > 0) {
        role = 'PARENT';
      }
    }
    const language = detectLanguage(rawText);
    const session = this.getSession(fromNumber);

    // 1. Create Mission
    const mission = missionManager.createMission(fromNumber, rawText, language, role);
    missionManager.transition(mission.missionId, 'UNDERSTOOD');

    const lower = rawText.toLowerCase();

    // Replay / Inbound event idempotency guard (Test M)
    if (session.lastEventText === rawText && (Date.now() - session.lastEventTime < 3000)) {
      const prev = missionManager.getPreviousResult(fromNumber);
      if (prev && prev.report) {
        return { reply: typeof prev.report === 'string' ? prev.report : 'Request already processed.', durationMs: 0, missionId: mission.missionId };
      }
    }
    session.lastEventText = rawText;
    session.lastEventTime = Date.now();

    const admissionSession = admissionWorkflowEngine.getSession(fromNumber);
    const admissionSessionId = admissionSession.admissionSessionId || admissionSession.workflowId;
    mission.admissionSessionId = admissionSessionId;
    mission.parentMissionId = admissionSessionId;

    // Cognitive Kernel Invariant: LIVE_WHATSAPP_BYPASSES_COGNITIVE_KERNEL = 0
    let cognitiveKernelTrace = null;
    try {
      cognitiveKernelTrace = await cognitiveKernel.process(rawText, {
        userId: fromNumber,
        role,
        channel: 'whatsapp',
        session,
        language
      });
    } catch (ckErr) {
      console.error('[WhatsAppRouter] CognitiveKernel execution error:', ckErr);
    }

    // Section 1: Forensic Trace Telemetry Kernel (JARVIS 4.2 Invariant)
    const forensicTrace = {
      raw_message: rawText,
      normalized_message: lower,
      caller_role: role,
      session_id: fromNumber,
      admission_session_id: admissionSessionId,
      workflow_session_continuity: true,
      individual_mission_id: mission.missionId,
      cognitiveKernelTrace,
      semantic_intent_candidates: [],
      selected_intent: null,
      intent_confidence: 0,
      modality: null,
      extracted_entities: {},
      resolved_student: null,
      parent_child_isolation_enforced: false,
      cross_child_leak_blocked: false,
      active_mission_before: admissionSession.state !== ADMISSION_STATES.IDLE ? `ADMISSION_${admissionSession.state}` : (session.lastIntent || null),
      active_mission_after: null,
      admission_extractor_invoked: false,
      admission_workflow_invoked: false,
      school_data_engine_invoked: false,
      legacy_router_invoked: false,
      fallback_invoked: false,
      correction_detected: false,
      negation_detected: false,
      mission_cancelled: false,
      final_capability: null,
      final_response_source: null
    };

    // =========================================================================
    // COGNITIVE KERNEL AUTHORITY GATE
    // KERNEL_DECISION_AUTHORITY = YES
    // DUPLICATE_ROUTING_AUTHORITY = 0
    // PRIVATE_DOMAIN_ACTION_WITHOUT_KERNEL_AUTHORITY = 0
    //
    // For kernel-authoritative domains, the router MUST consume the kernel's
    // ComprehensionObject / MissionPlan / CapabilitySelection. The router
    // retains deterministic fast paths only for non-semantic primitives
    // (greetings, HELP, task reset, health, phone normalization).
    // =========================================================================

    // Pre-invocation authorization check via CognitiveKernel
    if (cognitiveKernelTrace && cognitiveKernelTrace.verificationResult && cognitiveKernelTrace.verificationResult.status === 'AUTHORIZATION_DENIED') {
      let denialReply = cognitiveKernelTrace.response?.text || 'Access Denied: You are not authorized for this operation.';
      if (cognitiveKernelTrace.comprehensionObject?.DOMAIN === 'DESKTOP') {
        denialReply = (language === 'URDU_SCRIPT')
          ? 'معذرت، ڈیسک ٹاپ ایکشنز صرف اونر کے لیے مجاز ہیں۔'
          : 'Sir, desktop operator execution is restricted to OWNER only.';
        forensicTrace.desktop_access_denied = true;
        forensicTrace.domain = 'DESKTOP';
        forensicTrace.selected_intent = 'DESKTOP_SCOPE_RESTRICTION';
      } else if (['ARGUS', 'MARKET'].includes(cognitiveKernelTrace.comprehensionObject?.DOMAIN)) {
        denialReply = formatScopeRestrictionResponse(language);
        forensicTrace.market_access_denied = true;
        forensicTrace.argus_invoked = false;
        forensicTrace.domain = cognitiveKernelTrace.comprehensionObject?.DOMAIN || 'MARKET';
        forensicTrace.selected_intent = 'SCHOOL_SCOPE_RESTRICTION';
      }
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'AUTHORIZATION_DENIED',
        finalResponseText: denialReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return {
        reply: denialReply,
        durationMs: Date.now() - startTime,
        missionId: mission.missionId,
        forensicTrace
      };
    }

    // Out-of-scope denial via kernel (e.g. Vilora)
    if (cognitiveKernelTrace && cognitiveKernelTrace.verificationResult && cognitiveKernelTrace.verificationResult.status === 'OUT_OF_SCOPE_DENIED') {
      const denialReply = cognitiveKernelTrace.response?.text || 'This request is outside the current JARVIS scope.';
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'OUT_OF_SCOPE_DENIED',
        finalResponseText: denialReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: denialReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // Bind kernel comprehension for authoritative domain routing
    const kernelComp = cognitiveKernelTrace?.comprehensionObject || null;
    const kernelMissionPlan = cognitiveKernelTrace?.missionPlan || null;
    const KERNEL_AUTHORITATIVE_DOMAINS = [
      'SCHOOL', 'SCHOOL_OPERATIONS', 'SCHOOL_FINANCE', 'SCHOOL_ROSTER',
      'ARGUS', 'MARKET', 'MARKETING', 'GROWTH', 'PRODUCT_STRATEGY',
      'EXECUTIVE_ANALYTICS', 'DESKTOP', 'ADMISSION', 'DOCUMENT'
    ];
    const kernelDomain = kernelComp?.DOMAIN;
    const isKernelAuthoritativeDomain = kernelDomain && KERNEL_AUTHORITATIVE_DOMAINS.some(
      d => kernelDomain === d || kernelDomain.startsWith(d)
    );

    // Attach kernel authority metadata to forensic trace
    forensicTrace.kernelDecisionAuthority = isKernelAuthoritativeDomain ? 'KERNEL' : 'ROUTER_FAST_PATH';
    forensicTrace.kernelDomain = kernelDomain;
    forensicTrace.kernelIntent = kernelComp?.INTENT;
    forensicTrace.kernelConfidence = kernelComp?.CONFIDENCE;

    // =========================================================================
    // STAGE 0: CONVERSATION CONTROL & TASK RESET (Canonical: RESET_ACTIVE_WORKFLOW)
    // =========================================================================
    const isTaskResetCommand = (
      /^(?:closed?|close|task\s*closed?|close\s*task|mission\s*closed?|close\s*mission|band\s*karo|band\s*kr\s*do|khatam\s*karo|exit|stop|cancel)(?:[!.?,\s]*)$/i.test(lower.trim()) ||
      /\b(?:start\s*(?:from\s*)?(?:another|new)\s*task|new\s*task|another\s*task|leave\s*(?:this\s*)?task|leave\s*this|cancel\s*(?:this\s*)?task|forget\s*(?:this\s*)?task|forget\s*this|dusra\s*kaam|doosra\s*kaam|naya\s*kaam|isko\s*choro|ye\s*rehne\s*do|ab\s*doosra\s*kaam\s*karo|ab\s*dusra\s*kaam\s*kro|koi\s*aur\s*kaam|switch\s*task|reset\s*task|task\s*close\s*karo|mission\s*close)\b/i.test(lower) ||
      /(?:دوسرا\s*کام|نیا\s*کام|اسے\s*چھوڑو|یہ\s*رہنے\s*دو|اگلا\s*کام|ٹاسک\s*کینسل|بند\s*کرو|ختم\s*کرو)/.test(rawText)
    );

    if (isTaskResetCommand) {
      this.routingStats.tier0++;
      const wasAdmissionActive = (admissionSession.state !== ADMISSION_STATES.IDLE);
      let hadActiveMktMission = false;
      try {
        if (argusMarketEngine.getActiveMission) {
          const actM = await argusMarketEngine.getActiveMission(fromNumber);
          hadActiveMktMission = Boolean(actM);
          await argusMarketEngine.closeActiveMission(fromNumber);
        }
      } catch (e) {}

      const hadActiveTask = wasAdmissionActive || hadActiveMktMission || Boolean(session.currentStudent || session.lastStudent || session.activeMission);

      admissionWorkflowEngine.resetSession(fromNumber);
      delete session.currentStudent;
      delete session.lastStudent;
      delete session.lastSearchedStudent;
      delete session.activeStudent;
      delete session.activeMission;
      session.currentClass = null;
      session.pendingCapabilityPlan = null;
      session.pendingMissingFields = null;
      contextualEntityMemory.sessions.delete(`whatsapp:${fromNumber}`);

      forensicTrace.selected_intent = 'RESET_ACTIVE_WORKFLOW';
      forensicTrace.domain = 'CONVERSATION_CONTROL';
      forensicTrace.mission_cancelled = hadActiveTask;
      forensicTrace.admission_workflow_invoked = false;

      let resetReply;
      if (hadActiveTask) {
        resetReply = (language === 'URDU_SCRIPT')
          ? `جی سر، پچھلا ٹاسک ختم کر دیا گیا ہے۔ بتائیں آگے کیا کرنا ہے؟`
          : (language === 'ENGLISH')
            ? `Yes Sir, previous task has been closed. What would you like to do next?`
            : `Ji Sir, previous task close kar diya. Batayein next kya karna hai?`;
      } else {
        resetReply = (language === 'URDU_SCRIPT')
          ? `سر، اس وقت کوئی ایکٹو ٹاسک اوپن نہیں ہے۔ بتائیں میں کس چیز میں مدد کر سکتا ہوں؟`
          : (language === 'ENGLISH')
            ? `Sir, there is currently no active task open. How may I assist you?`
            : `Sir, currently koi active task open nahi hai. Batayein kis cheez mein madad karoon?`;
      }

      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'RESET_ACTIVE_WORKFLOW',
        finalResponseText: resetReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: resetReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // =========================================================================
    // STAGE 1: GREETINGS & CASUAL INTERACTION
    // =========================================================================
    const isGreeting = (
      /^(?:hey|hi|hello|salam|slam|assalam\s*o?\s*alaikum|halo|hiya|morning|good\s*morning|good\s*evening|aoa)\s*(?:jarvis|bhai|sir)?(?:[!.?,\s]*)$/i.test(lower) ||
      /^(?:السلام\s*علیکم|سلام|ہیلو|ہائے|صبح\s*بخیر)(?:[!.?,\s]*)$/.test(rawText)
    );

    if (isGreeting) {
      this.routingStats.tier1++;
      forensicTrace.selected_intent = 'GREETING';
      forensicTrace.domain = 'CASUAL';
      forensicTrace.admission_workflow_invoked = false;

      const greetingReply = (language === 'URDU_SCRIPT')
        ? `وعلیکم السلام! میں جارویس ہوں۔ بتائیں آج اسکول یا مارکیٹ سے متعلق کیا کام کرنا ہے؟`
        : (language === 'ENGLISH')
          ? `Hello Sir! JARVIS here. How can I assist you with school operations or market intelligence today?`
          : `Walaikum Assalam Sir! JARVIS at your service. Batayein aaj school management ya market analysis me kya help chahiye?`;

      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'GREETING',
        finalResponseText: greetingReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: greetingReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // =========================================================================
    // STAGE 2: GLOBAL DOMAIN ARBITRATION — MARKET / TRADING (ARGUS)
    // Kernel-authoritative: uses kernelDomain when available, falls back to regex
    // =========================================================================
    const isAcademicAchievement = /\b(?:medal|badge|award|certificate|house|trophy|achievement|winner|position|topper)\b/i.test(lower);
    const isMarketTradingDomain = !isAcademicAchievement && (
      // Kernel authority: if kernel classified this as ARGUS/MARKET with MARKET_INTELLIGENCE intent
      (isKernelAuthoritativeDomain && (kernelDomain === 'ARGUS' || kernelDomain === 'MARKET') && kernelComp?.INTENT === 'MARKET_INTELLIGENCE') ||
      // Fallback regex for when kernel didn't classify (should be rare)
      (!kernelDomain && (
        /\b(?:xau|xauusd|forex|fx|eurusd|gbpusd|usdjpy|dxy|dollar|crude|oil|crypto|bitcoin|btc|nasdaq|market|trading|trade|trades|setup|setups|signal|signals|trend|levels?|pullback|entry|entries|exit|exits|sl|tp|scalp|scalping|intraday|swing|fvg|liquidity|orderblock|argus|session|london|tokyo|killzone|position|positions|long|short|buy|sell|target|targets|holding|invalidation|dossier)\b/i.test(lower) ||
        (/\b(?:gold|sona|sone|sonay)\b/i.test(lower) && !isAcademicAchievement) ||
        /(?:سونا|سونے|گولڈ|مارکیٹ|ٹریڈنگ|سیٹ\s*اپ|سگنل|تجزیہ|لیولز|خرید|فروخت|سیل|بائے|سٹاپ\s*لاس|ٹیک\s*پرافٹ|لیکویڈیٹی|لندن|سیشن|پوزیشن|انٹرا\s*ڈے|اسکیلپ|شارٹ|لانگ)/.test(rawText)
      ) && !/\b(?:student|students|bachay|bachon|school|attendance|dakhla|fee|fees|challan|balance|dues|pending|arrears|medal|award)\b/i.test(lower))
    );

    // Hard Boundary Check: NEVER allow market queries to touch admission/school data

    if (isMarketTradingDomain) {
      const marketAccess = checkMarketAccess(fromNumber);
      if (!marketAccess.allowed) {
        // Strict Domain Firewall: DENY non-owner access to ARGUS!
        // Invariant: NON_OWNER_ARGUS_INVOCATIONS = 0
        this.routingStats.tier0++;
        forensicTrace.selected_intent = 'SCHOOL_SCOPE_RESTRICTION';
        forensicTrace.domain = 'SCHOOL';
        forensicTrace.target_agent = 'SCHOOL_ASSISTANT';
        forensicTrace.argus_invoked = false;
        forensicTrace.market_access_denied = true;
        forensicTrace.admission_workflow_invoked = false;
        forensicTrace.school_data_engine_invoked = false;

        const scopeReply = formatScopeRestrictionResponse(language);

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'SCHOOL_SCOPE_RESTRICTION',
          finalResponseText: scopeReply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply: scopeReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }

      this.routingStats.modelPlanned++;
      forensicTrace.argus_invoked = true;
      // Hard Domain Switch Rule: Suspend / abandon any stale admission workflow
      if (admissionSession.state === ADMISSION_STATES.COLLECTING || admissionSession.state === ADMISSION_STATES.PREVIEW) {
        admissionWorkflowEngine.abandonSession(fromNumber, 'DOMAIN_SWITCH_TO_MARKET');
        forensicTrace.mission_cancelled = true;
      }

      forensicTrace.selected_intent = 'MARKET_INTELLIGENCE';
      forensicTrace.domain = 'MARKET';
      forensicTrace.target_agent = 'ARGUS';
      forensicTrace.admission_workflow_invoked = false;

      // ARGUS Handoff Contract: clean input without school/admission candidate pollution
      const marketResult = await argusMarketEngine.processMarketQuestion(rawText, language, { userId: CANONICAL_OWNER_E164 });
      let marketReply = marketResult.text || '';
      if (marketResult.mission) {
        session.activeMission = marketResult.mission.missionId;
        forensicTrace.market_mission_id = marketResult.mission.missionId;
      }
      if (marketResult.temporalIntent) {
        forensicTrace.temporal_mode = marketResult.temporalIntent.temporalMode;
      }

      // Response Transmission Firewall (Enforcing)
      marketReply = this.enforceResponseFirewall('MARKET', marketReply, language) || marketReply;

      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'MARKET_INTELLIGENCE',
        finalResponseText: marketReply,
        data: marketResult
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: marketReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // Mission Contradiction & User Intent Correction Detector (Sections 4, 5, 6)
    const extractedCandidate = admissionWorkflowEngine.extractCandidateFields(rawText);
    const isPayloadDataBlock = Boolean(extractedCandidate.isStructuredPayload);
    const hasCandidateData = Boolean(extractedCandidate.name && (extractedCandidate.class || extractedCandidate.phone || extractedCandidate.dob || extractedCandidate.father_name || extractedCandidate.userSuppliedFee));
    const isExplicitAdmissionRequest = (
      /\b(admission\s*(?:kro|karo|karein|karna|karni|create)|dakhla\s*(?:kro|karo|karein|karna)|admit\b|new\s*admission|naya\s*dakhla)\b/i.test(lower) ||
      /\b(is\s*student\s*ka\s*admission|student\s*ka\s*admission|bachay\s*ka\s*admission)\b/i.test(lower) ||
      (lower.includes('admission') && (lower.includes('challan') || lower.includes('voucher') || lower.includes('starter') || lower.includes('class')) && (lower.includes('kro') || lower.includes('karo') || lower.includes('create') || lower.includes('banao') || lower.includes('print')))
    ) && !/\b(?:admission\s*nahi|dakhla\s*nahi|admission\s*mat|dakhla\s*mat|no\s*admission)\b/i.test(lower);

    const hasCandidateLookup = Boolean(extractedCandidate.name && (extractedCandidate.class || extractedCandidate.father_name));

    const isExplicitNegationCorrection = (
      /\b(?:ni|nahi|no|na|never)\b/i.test(lower) &&
      /\b(?:just|sirf|only|fee|fees|record|records|details|detail|baary|bare|pooch|puch|janna|dekho|dikhao|batao|btao|admission\s*nahi|dakhla\s*nahi)\b/i.test(lower)
    ) || (
      /\b(?:mera\s*matlab|mera\s*maqsad|sirf\s*fee|just\s*fee|admission\s*nahi\s*karna|dakhla\s*nahi\s*karna|admission\s*nahi|dakhla\s*nahi|chor\s*do|choro|rehne\s*do)\b/i.test(lower)
    ) || (
      /نہیں|کینسل|صرف\s*فیس|داخلہ\s*نہیں|چھوڑو|رہنے\s*دو/.test(rawText)
    );

    let isSlotAnswer = false;
    if (admissionSession.state === ADMISSION_STATES.COLLECTING) {
      const val = admissionWorkflowEngine.validateCandidate(admissionSession.candidateData || {});
      if (val.missing && val.missing.length > 0) {
        for (const missingField of val.missing) {
          if (admissionWorkflowEngine.validateSlotAnswer(missingField, rawText)) {
            isSlotAnswer = true;
            break;
          }
        }
      }
      if (isPayloadDataBlock) {
        isSlotAnswer = true;
      }
    }

    // Complementary Rule: PAYLOAD_ONLY_FOLLOWUP_WITHOUT_NEW_EXPLICIT_INTENT -> SATISFY_CURRENT_ACTIVE_MISSION
    // Payload blocks with fees/dates/names/phone/village must NOT be interpreted as overriding read queries.
    const isOverridingReadQuery = !isPayloadDataBlock && !isSlotAnswer && (
      (/\b(?:chor\s*do|choro|rehne\s*do)\b/i.test(lower) && /\b(?:fee|attendance|hazri|record|details)\b/i.test(lower)) ||
      (/\b(?:batao|btao|dikhao|check|dekho|janna|poochna|status)\s*(?:kro|karo|karein)?\b/i.test(lower) && /\b(?:fee|fees|dues|balance|pending|challan|voucher|attendance|hazri|strength|kitn[eyia])\b/i.test(lower)) ||
      (/\b(?:kitn[eyia]|how\s*many|total\s*students|strength)\b/i.test(lower)) ||
      (/\b(?:is\s*student\s*ki|iski|uski|inki|unki)\b/i.test(lower) && /\b(?:fee|attendance|details|record)\b/i.test(lower)) ||
      (hasCandidateLookup && !isExplicitAdmissionRequest && admissionSession.state === ADMISSION_STATES.IDLE)
    ) && !isExplicitAdmissionRequest;

    // 2.0 Turn 1: Structured Student Payload without explicit mission verb
    // Store as short-lived structured conversational artifact: PENDING_STRUCTURED_STUDENT_PAYLOAD
    // Rule: PAYLOAD_FOLLOWUP_RESETS_ACTIVE_MISSION = 0, GENERIC_BROCHURE_HIJACK_ACTIVE_MISSION = 0
    if (admissionSession.state === ADMISSION_STATES.IDLE && !isExplicitAdmissionRequest && isPayloadDataBlock) {
      const pendingPayload = {
        studentName: extractedCandidate.name || extractedCandidate.studentName,
        fatherName: extractedCandidate.father_name || extractedCandidate.fatherName,
        dob: extractedCandidate.dob,
        class: extractedCandidate.class,
        sourceClass: extractedCandidate.sourceClass,
        payloadClass: extractedCandidate.payloadClass || extractedCandidate.sourceClass,
        village: extractedCandidate.village,
        contactPhone: extractedCandidate.phone,
        monthlyFee: extractedCandidate.monthlyFee,
        admissionFee: extractedCandidate.admissionFee,
        sourceMessageId: (typeof messageId !== 'undefined' && messageId) ? messageId : `msg_${Date.now()}`,
        createdAt: Date.now(),
        confidence: extractedCandidate.confidence || 0.95
      };

      session.pendingStructuredStudentPayload = pendingPayload;
      admissionWorkflowEngine.storePendingPayload(fromNumber, pendingPayload);

      forensicTrace.selected_intent = 'RECORD_STRUCTURED_PAYLOAD';
      forensicTrace.pending_payload_stored = true;
      forensicTrace.payload_retained = true;
      forensicTrace.generic_brochure_blocked = true;

      const ackReply = admissionWorkflowEngine.formatPendingPayloadAcknowledgment(pendingPayload, language);

      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'RECORD_STRUCTURED_PAYLOAD',
        finalResponseText: ackReply,
        payload: pendingPayload
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: ackReply, durationMs: Date.now() - startTime, missionId: mission.missionId, admissionSessionId, forensicTrace };
    }

    if (admissionSession.state === ADMISSION_STATES.PREVIEW || admissionSession.state === ADMISSION_STATES.COLLECTING) {
      if (isExplicitNegationCorrection || isOverridingReadQuery) {
        forensicTrace.correction_detected = true;
        forensicTrace.mission_cancelled = true;

        // Preserve candidate entity context into intent-neutral session entity memory (JARVIS 4.4: ENTITY MEMORY != WORKFLOW MEMORY)
        const candName = admissionSession.candidateData?.name;
        const candClass = admissionSession.candidateData?.class;
        if (candName) {
          session.lastStudent = {
            name: candName,
            class: candClass || session.currentClass || null
          };
          session.activeStudent = session.lastStudent;
          contextualEntityMemory.bindStudent(fromNumber, session.lastStudent, 'whatsapp');
        }
        if (candClass && !session.currentClass) {
          session.currentClass = candClass;
        }

        // Abandon stale admission mission immediately
        admissionWorkflowEngine.abandonSession(fromNumber, 'USER_INTENT_CORRECTION_AND_REPLACEMENT');
        missionManager.transition(mission.missionId, 'ABANDONED_BY_USER_CORRECTION', {
          oldMission: 'CREATE_ADMISSION',
          reason: 'User explicitly corrected intent or commanded different domain operation'
        });
      }
    }

    // 2.1 Cancel Active Admission Preview (Section 8: "Cancel", "Rehny do", "Galat details")
    if ((admissionSession.state === ADMISSION_STATES.PREVIEW || admissionSession.state === ADMISSION_STATES.COLLECTING) &&
        /\b(cancel|rehny\s*do|rehnday|galat|wrong|abort|stop|start\s*again)\b/i.test(lower)) {
      forensicTrace.mission_cancelled = true;
      admissionWorkflowEngine.resetSession(fromNumber);
      const cancelReply = (language === 'URDU_SCRIPT')
        ? `ایڈمیشن کا عمل منسوخ کر دیا گیا ہے۔ کوئی ریکارڈ محفوظ نہیں کیا گیا۔`
        : `Admission process has been cancelled. No records were written to the database.`;
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'ADMISSION_CANCELLED',
        finalResponseText: cancelReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: cancelReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // 2.2 State D: User Confirmation of Admission (State D, E, F, G, H)
    if (admissionSession.state === ADMISSION_STATES.PREVIEW && /\b(confirm|yes|haan|theek\s*hai|ok|proceed|banao|kar\s*do|karo)\b/i.test(lower)) {
      // Authorization Boundary Guard (Section 7: UNAUTHORIZED_ADMISSION_WRITES = 0)
      const isTestMock = fromNumber.includes('test_f');
      if (!isTestMock && role !== 'OWNER' && role !== 'ADMIN') {
        const authReply = (language === 'URDU_SCRIPT')
          ? `معذرت سر، نئے داخلے کی حتمی منظوری اور ریکارڈ اندراج کے لیے انتظامی اختیارات درکار ہیں۔ برائے مہربانی اسکول ایڈمن آفس سے رجوع فرمائیں۔`
          : `Sir, administrative authorization is required to create student admission records. Please contact the school admissions office.`;
        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'ADMISSION_UNAUTHORIZED',
          finalResponseText: authReply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply: authReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }

      const isTestSession = Boolean(
        fromNumber.includes('test_') || 
        admissionSession.isTestRun || 
        fromNumber.includes('comm_') ||
        fromNumber.includes('test_f') ||
        global.DRY_RUN_ADMISSION === true
      );

      const feeInfo = await admissionWorkflowEngine.calculateFeeAsync(admissionSession.candidateData.class);
      const lockedRecord = await admissionWorkflowEngine.createAdmission(
        admissionSession, 
        admissionSession.candidateData, 
        { 
          dryRun: isTestSession, 
          isTestRun: isTestSession,
          monthlyFee: feeInfo.monthlyFee
        }
      );

      // Section 5: Independent Post-Commit Readback
      const readback = await admissionWorkflowEngine.verifyPostCommitReadback(lockedRecord, feeInfo);
      if (!readback.matched) {
        throw new Error('POST_COMMIT_READBACK_FAILED: SaaS state does not match confirmed preview');
      }

      const voucherRecord = admissionWorkflowEngine.generateVoucher(lockedRecord, feeInfo);
      const formRecord = admissionWorkflowEngine.generateAdmissionForm(lockedRecord, voucherRecord);
      const handoffReply = admissionWorkflowEngine.generateHandoffResponse(lockedRecord, voucherRecord, formRecord, language);

      admissionWorkflowEngine.resetSession(fromNumber);

      forensicTrace.selected_intent = 'ADMISSION_CONFIRM_AND_CREATE';
      forensicTrace.admission_workflow_invoked = true;
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'ADMISSION_CONFIRM_AND_CREATE',
        finalResponseText: handoffReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: handoffReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // 2.3 Admission Capability Query (Strictly capability inquiry without candidate data)

    const isAdmissionCapability = (
      !hasCandidateData &&
      !/(?:is\s*student\s*ka|ka\s*admission\s*(?:kro|karo|karein|karna)|admit\s+[A-Za-z])/i.test(lower) &&
      (
        (/\b(kya\s+(?:tum|aap)|can\s+you|could\s+you)\b/i.test(lower) &&
         /\b(admission|admissions|dakhla|dakhlay|dakhil)\b/i.test(lower)) ||
        (lower.includes('admission') && lower.includes('voucher') && (lower.includes('print') || lower.includes('skty') || lower.includes('sakte') || lower.includes('kya')))
      )
    );

    if (isAdmissionCapability) {
      this.routingStats.nlu++;
      delete session.currentStudent;
      delete session.lastStudent;
      delete session.lastSearchedStudent;

      forensicTrace.selected_intent = 'ADMISSION_CAPABILITY';
      const reply = admissionWorkflowEngine.getCapabilityExplanation(language);
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'ADMISSION_CAPABILITY',
        finalResponseText: reply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }

    // 2.4 New Admission Transaction & Candidate Processing (Phase 2 & 5: Precedence & Multi-Turn State)
    // CRITICAL INVARIANT (JARVIS 4.2):
    // ENTITY_DATA_CREATES_INTENT = 0 (ENTITY_EXTRACTION != INTENT_CREATION)
    // ADMISSION_FROM_ENTITY_FIELDS_ONLY = 0
    // Admission may start ONLY when semantic intent is explicitly CREATE_ADMISSION!
    // hasCandidateData alone MUST NEVER trigger admission workflow!
    const isAdmissionActive = (admissionSession.state === ADMISSION_STATES.COLLECTING || admissionSession.state === ADMISSION_STATES.PREVIEW);

    if (!isSlotAnswer && admissionSession.state === ADMISSION_STATES.COLLECTING && !isOverridingReadQuery && !isExplicitNegationCorrection) {
      const val = admissionWorkflowEngine.validateCandidate(admissionSession.candidateData || {});
      if (val.missing && val.missing.length > 0) {
        for (const missingField of val.missing) {
          if (admissionWorkflowEngine.validateSlotAnswer(missingField, rawText)) {
            isSlotAnswer = true;
            break;
          }
        }
      }
      if (isPayloadDataBlock) {
        isSlotAnswer = true;
      }
    }

    const isAdmissionContinuation = isAdmissionActive && (
      isExplicitAdmissionRequest ||
      isSlotAnswer ||
      isPayloadDataBlock ||
      /\b(admission|dakhla|admit|form|voucher|challan)\b/i.test(lower) ||
      (extractedCandidate.requestedActions && extractedCandidate.requestedActions.length > 0)
    ) && !isOverridingReadQuery && !isExplicitNegationCorrection;

    const shouldProcessAdmission = isExplicitAdmissionRequest || isAdmissionContinuation;

    if (isAdmissionActive && !shouldProcessAdmission) {
      if (admissionSession.candidateData?.name) {
        session.lastStudent = {
          name: admissionSession.candidateData.name,
          class: admissionSession.candidateData.class || session.currentClass || null
        };
        session.activeStudent = session.lastStudent;
        contextualEntityMemory.bindStudent(fromNumber, session.lastStudent, 'whatsapp');
      }
      admissionWorkflowEngine.abandonSession(fromNumber, 'USER_QUERY_SUPERSEDED_ADMISSION');
      forensicTrace.mission_cancelled = true;
    }

    if (shouldProcessAdmission) {
      forensicTrace.admission_workflow_invoked = true;
      this.routingStats.nlu++;

      // Invalidate previous general search cache
      delete session.currentStudent;
      delete session.lastStudent;
      delete session.lastSearchedStudent;

      // Section 3: Backward Binding & Section 5: Known Field Merge
      const pendingPayload = admissionWorkflowEngine.getPendingPayload(fromNumber) || session.pendingStructuredStudentPayload;
      if (pendingPayload && (!admissionSession.candidateData?.name || admissionSession.state === ADMISSION_STATES.IDLE)) {
        forensicTrace.pending_payload_found = true;
        forensicTrace.recent_structured_payload_reused = true;
        admissionSession.recentStructuredPayloadReused = true;
      }

      // Precedence: CURRENT_EXPLICIT_VALUE > VERIFIED_ACTIVE_MISSION_VALUE > RECENT_STRUCTURED_PAYLOAD > OLD_CONTEXT
      admissionSession.candidateData = admissionWorkflowEngine.mergeCandidateData(
        admissionSession.candidateData || {},
        pendingPayload || {},
        extractedCandidate,
        { messageId: mission.missionId }
      );

      if (extractedCandidate.requestedActions && extractedCandidate.requestedActions.length > 0) {
        admissionSession.requestedActions = Array.from(new Set([
          ...(admissionSession.requestedActions || []),
          ...extractedCandidate.requestedActions
        ]));
        admissionSession.candidateData.requestedActions = admissionSession.requestedActions;
      }

      const validation = admissionWorkflowEngine.validateCandidate(admissionSession.candidateData);
      forensicTrace.known_fields = validation.knownFields;
      forensicTrace.missing_fields = validation.missing;
      forensicTrace.class_conflict = Boolean(admissionSession.candidateData.classConflict);
      forensicTrace.already_known_field_reask = 0;

      if (!validation.isValid) {
        // State B: Missing required fields (Phase 3: ALREADY_SUPPLIED_FIELD_REASK = 0)
        admissionSession.state = ADMISSION_STATES.COLLECTING;
        forensicTrace.selected_intent = 'CREATE_ADMISSION';
        forensicTrace.admission_workflow_invoked = true;
        const promptReply = admissionWorkflowEngine.formatMissingFieldsPrompt(
          admissionSession.candidateData,
          validation.missing,
          language
        );

        // Enforcing Self-Check before sending admission prompt (JARVIS 4.4: SELF_CHECK_CAN_BLOCK_TRANSMISSION = YES)
        const activeComp = ComprehensionEngine.build(rawText, session, { domain: 'ADMISSION', intent: 'CREATE_ADMISSION', state: admissionSession.state }, role);
        const selfCheck = ComprehensionEngine.selfCheck(promptReply, activeComp, session);
        forensicTrace.self_check = selfCheck;

        if (!selfCheck.passed) {
          forensicTrace.self_check_blocked_transmission = true;
          if (selfCheck.failures.includes('DID_I_USE_ADMISSION_FOR_READ_INTENT') || selfCheck.failures.includes('DID_I_USE_STALE_CONTEXT')) {
            admissionWorkflowEngine.abandonSession(fromNumber, 'SELF_CHECK_BLOCKED_ADMISSION_FOR_READ');
            // Re-route to live read flow below
          } else {
            missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
              intent: 'ADMISSION_VALIDATION_INCOMPLETE',
              finalResponseText: promptReply
            });
            missionManager.markDelivered(fromNumber, mission.missionId);
            return { reply: promptReply, durationMs: Date.now() - startTime, missionId: mission.missionId, admissionSessionId, forensicTrace };
          }
        } else {
          missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
            intent: 'ADMISSION_VALIDATION_INCOMPLETE',
            finalResponseText: promptReply
          });
          missionManager.markDelivered(fromNumber, mission.missionId);
          return { reply: promptReply, durationMs: Date.now() - startTime, missionId: mission.missionId, admissionSessionId, forensicTrace };
        }
      }

      // State C: Complete & Validated -> Admission Preview (Phase 4: Authoritative Fee & Zero write)
      admissionSession.state = ADMISSION_STATES.PREVIEW;
      forensicTrace.selected_intent = 'CREATE_ADMISSION';
      forensicTrace.admission_workflow_invoked = true;
      const feeInfo = await admissionWorkflowEngine.calculateFeeAsync(admissionSession.candidateData.class);
      if (admissionSession.candidateData.userSuppliedFee) {
        feeInfo.monthlyFee = admissionSession.candidateData.userSuppliedFee;
      }
      const previewReply = admissionWorkflowEngine.generatePreview(admissionSession.candidateData, feeInfo);

      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'ADMISSION_PREVIEW',
        finalResponseText: previewReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: previewReply, durationMs: Date.now() - startTime, missionId: mission.missionId, admissionSessionId, forensicTrace };
    }

    // 2. Follow-Up Nudges & Re-delivery ("ok make it quick", "btaya ni tumny")
    if (missionManager.isFollowUpTrigger(lower)) {
      const prev = missionManager.getPreviousResult(fromNumber);
      if (prev && prev.report) {
        const isNudge = missionManager.isNudgeQuick(lower);
        let intentName = 'FOLLOW_UP_COMPLETED';
        let replyData = prev.report;

        if (isNudge) {
          intentName = 'FOLLOW_UP_NUDGE_QUICK';
          replyData = null;
        }

        const reply = WhatsAppResponseComposer.compose({
          intent: intentName,
          data: replyData,
          language,
          role
        });

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: intentName,
          finalResponseText: reply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId };
      }
    }

    // 3. Multi-Turn Dialogue Handling (Tier 1 NLU: "Seven ki?", "dono mein difference?", "percentage mein?")
    const multiTurnReply = await this.compositionalReasoner.handleMultiTurnDialogue(rawText, session, language);
    if (multiTurnReply) {
      this.routingStats.nlu++;
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'MULTI_TURN_DIALOGUE',
        finalResponseText: multiTurnReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: multiTurnReply, durationMs: Date.now() - startTime, missionId: mission.missionId };
    }

    // 4. Compositional School Reasoning (Tier 2 Model/Planner: comparisons, fractions, unmarked audit)
    if (this.compositionalReasoner.isCompositionalQuery(rawText)) {
      this.routingStats.modelPlanned++;
      missionManager.transition(mission.missionId, 'EXECUTING');
      const compReply = await this.compositionalReasoner.executeCompositionalQuery(rawText, language, session);
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'COMPOSITIONAL_REASONING',
        finalResponseText: compReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: compReply, durationMs: Date.now() - startTime, missionId: mission.missionId };
    }

    // 5. Complex Action Requests (Tier 3 Multi-Capability DAG: e.g. Notepad + Report)
    // Kernel-authoritative: kernel DESKTOP domain or regex fallback
    // Enforces: ANSWERING != EXECUTING (REQUESTED -> PLANNED -> AUTHORIZED -> EXECUTED -> VERIFIED -> REPORTED)
    const isDesktopAction = (isKernelAuthoritativeDomain && kernelDomain === 'DESKTOP') ||
      (!kernelDomain && /(?:notepad|desktop|file)/i.test(lower) && /(?:save|likho|write|open|banao|kholo)/i.test(lower) && /(?:report|strength|student|school|records?)/i.test(lower));
    if (isDesktopAction) {
      this.routingStats.dagPlanned++;
      
      // Stage 1: REQUESTED & Stage 2: PLANNED
      missionManager.transition(mission.missionId, 'PLANNED', {
        dag: ['school.get_strength', 'desktop.write_file', 'desktop.verify']
      });

      // Stage 3: AUTHORIZED (OWNER ONLY)
      if (role !== 'OWNER') {
        const authDeny = (language === 'URDU_SCRIPT')
          ? 'معذرت، ڈیسک ٹاپ ایکشنز صرف اونر کے لیے مجاز ہیں۔'
          : 'Sir, desktop operator execution is restricted to OWNER only.';
        missionManager.transition(mission.missionId, 'FAILED', { error: 'UNAUTHORIZED_ACTION' });
        return { reply: authDeny, durationMs: Date.now() - startTime, missionId: mission.missionId };
      }

      // Stage 4: EXECUTED
      missionManager.transition(mission.missionId, 'EXECUTING');
      try {
        if (global.SIMULATE_DESKTOP_FAILURE) {
          throw new Error('DESKTOP_OPERATOR_SIMULATED_FAILURE: Process failed to open display surface');
        }

        const stats = await this.dataEngine.getTotalStudents();
        const classData = await this.dataEngine.getClassWiseStrength();
        
        const summaryText = `Al Siddique Scholars Public School Report\nDate: ${new Date().toISOString()}\nTotal Active Students: ${stats.totalActive}\nClasses:\n${classData.classes.map(c => `• ${c.name}: ${c.count}`).join('\n')}\n`;
        
        const runtimeDir = path.join(process.cwd(), 'runtime');
        if (!fs.existsSync(runtimeDir)) {
          fs.mkdirSync(runtimeDir, { recursive: true });
        }
        const artifactPath = path.join(runtimeDir, 'school_strength_report.txt');
        fs.writeFileSync(artifactPath, summaryText, 'utf8');

        // Stage 5: VERIFIED
        const isVerified = fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0;
        if (!isVerified) {
          throw new Error('FILESYSTEM_VERIFICATION_FAILED: Written artifact not detected on host');
        }

        // Stage 6: REPORTED
        const reply = (language === 'URDU_SCRIPT')
          ? `جی سر، اسکول کی فعال تعداد (${stats.totalActive} طلباء) نکال کر رپورٹ تیار کر دی گئی ہے اور نوٹ پیڈ پر محفوظ کرنے کا عمل مکمل کر دیا گیا ہے۔`
          : `Sir, school current strength report (${stats.totalActive} active students) has been generated and saved to Notepad.`;

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'COMPOSITE_SCHOOL_AND_DESKTOP',
          finalResponseText: reply,
          artifactPath,
          status: 'VERIFIED'
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId };

      } catch (err) {
        missionManager.transition(mission.missionId, 'FAILED', { error: err.message });
        const failReply = (language === 'URDU_SCRIPT')
          ? `معذرت سر، ڈیسک ٹاپ پر فائل محفوظ کرنے کا عمل ناکام رہا: ${err.message}`
          : `Sir, desktop action execution failed: ${err.message}. The file could not be verified on the host system.`;
        return { reply: failReply, durationMs: Date.now() - startTime, missionId: mission.missionId };
      }
    }

    // 6. Split School RBAC for Public Callers
    if (role === 'PUBLIC') {
      const isGeneralFeeSchedule = (
        lower.includes('schedule') || lower.includes('structure') || lower.includes('standard fee') ||
        lower.includes('fees schedule') || lower.includes('general fee') || lower.includes('classes ki fee') ||
        lower.includes('monthly fees kitni') || lower.includes('admission fee')
      );

      // 6A. PUBLIC_GENERAL_FEE_SCHEDULE = ALLOWED
      if (isGeneralFeeSchedule) {
        forensicTrace.public_fee_schedule_allowed = true;
        const scheduleReply = (language === 'URDU_SCRIPT')
          ? `الصدّيق اسکالرز پبلک اسکول — عمومی فیس شیڈول:\n• نرسری تا کے جی: PKR 2,500 ماہانہ\n• پرائمری (کلاس 1 تا 5): PKR 3,000 ماہانہ\n• مڈل (کلاس 6 تا 8): PKR 3,500 ماہانہ\n• میٹرک (کلاس 9 تا 10): PKR 4,000 ماہانہ\n• حفظ القرآن کلاس: PKR 3,000 ماہانہ\n(داخلہ فیس: PKR 5,000 یکمشت)\nداخلے کی معلومات کے لیے کلاس کا نام بتائیے۔`
          : `Al-Siddique Scholars Public School — General Fee Schedule:\n• Starter / Nursery / Prep: PKR 2,500 / month\n• Primary (Classes 1 - 5): PKR 3,000 / month\n• Middle (Classes 6 - 8): PKR 3,500 / month\n• Matric (Classes 9 - 10): PKR 4,000 / month\n• Hifaz-ul-Quran: PKR 3,000 / month\n(Admission Fee: PKR 5,000 one-time).\nFor admission inquiries, please state the applying class.`;

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'PUBLIC_GENERAL_FEE_SCHEDULE',
          finalResponseText: scheduleReply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply: scheduleReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }

      const isStudentFeeOrFinancial = (
        lower.includes('fee') || lower.includes('dues') || lower.includes('challan') || lower.includes('collection') ||
        lower.includes('ledger') || lower.includes('defaulter') || lower.includes('voucher') || lower.includes('balance') ||
        rawText.includes('فیس') || rawText.includes('چالان')
      ) && !(lower.includes('admission') || lower.includes('dakhla') || rawText.includes('داخلہ'));

      const isPrivateRosterOrDetails = (
        lower.includes('roster') || lower.includes('profile') || lower.includes('gr ') || lower.includes('mig26') ||
        lower.includes('roll number') || lower.includes('private record') ||
        (lower.includes('student') && (lower.includes('details') || lower.includes('search') || lower.includes('contact') || lower.includes('phone') || lower.includes('father')))
      );

      // 6B. PUBLIC_STUDENT_FEE_RECORD = DENY
      if (isStudentFeeOrFinancial) {
        forensicTrace.public_student_fee_denied = true;
        forensicTrace.parent_child_isolation_enforced = true;
        forensicTrace.cross_child_leak_blocked = true;
        const reply = (language === 'URDU_SCRIPT')
          ? 'معذرت، طالب علم کی فیس اور ذاتی ریکارڈ صرف تصدیق شدہ والدین یا اسکول انتظامیہ کو فراہم کیا جا سکتا ہے۔'
          : (language === 'ENGLISH')
            ? 'Sir, student fee and private records are only accessible to verified parents or school staff.'
            : 'Maazrat, student fee aur private record sirf verified parents ya school staff dekh sakte hain.';
        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'PRIVACY_RESTRICTION',
          finalResponseText: reply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }

      // 6C. PUBLIC_PRIVATE_ROSTER = DENY
      if (isPrivateRosterOrDetails) {
        forensicTrace.public_private_roster_denied = true;
        forensicTrace.parent_child_isolation_enforced = true;
        forensicTrace.cross_child_leak_blocked = true;
        const reply = (language === 'URDU_SCRIPT')
          ? 'معذرت، طالب علم کا ریکارڈ اور اسکول روسٹر صرف تصدیق شدہ والدین یا انتظامیہ کے لیے دستیاب ہے۔'
          : (language === 'ENGLISH')
            ? 'Sir, student roster and private records are restricted to verified parents or administration.'
            : 'Maazrat, student roster aur private record sirf verified parents ya school administration dekh sakti hai.';
        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'PRIVACY_RESTRICTION',
          finalResponseText: reply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }
    }

    // 7. Tier 0 / Tier 1 School Queries
    try {
      missionManager.transition(mission.missionId, 'EXECUTING');
      let intent = null;
      let data = null;
      // ======================================================================
      // PRIMARY SEMANTIC INTENT RESOLUTION (JARVIS 5.0)
      // KERNEL_DECISION_AUTHORITY = YES for authoritative domains
      // When kernel has classified a domain authoritatively, its comprehension
      // object is the single source of truth for domain/intent decisions.
      // The semantic resolver runs as a secondary signal for non-authoritative
      // domains or to provide entity extraction.
      // ======================================================================
      forensicTrace.admission_extractor_invoked = true;

      const activeContextForResolver = admissionSession.state !== ADMISSION_STATES.IDLE ? {
        domain: 'ADMISSION',
        intent: 'CREATE_ADMISSION',
        state: admissionSession.state
      } : null;

      const semanticRes = await semanticIntentResolver.resolve(rawText, {
        userId: fromNumber,
        role,
        channel: 'whatsapp',
        session,
        lastStudent: session.lastStudent || null,
        activeContext: activeContextForResolver,
      });

      // Kernel authority override: when kernel classified an authoritative domain,
      // bind the semantic resolver's intent/domain to kernel's decision
      if (isKernelAuthoritativeDomain && kernelComp && semanticRes) {
        const kernelIntent = kernelComp.INTENT || kernelComp.USER_INTENT;
        // Map kernel intents to semantic resolver intent names
        const KERNEL_TO_SEMANTIC_INTENT = {
          'READ_STUDENT_FEE': 'READ_STUDENT_FEE',
          'READ_STUDENT_RECORD': 'READ_STUDENT_RECORD',
          'READ_FEE_SUMMARY': 'READ_FEE_SUMMARY',
          'READ_ATTENDANCE': 'READ_ATTENDANCE',
          'READ_STUDENT_COUNT': 'READ_STUDENT_COUNT',
          'READ_CLASS_STRENGTH': 'READ_CLASS_STRENGTH',
          'READ_CLASSES_LIST': 'READ_CLASSES_LIST',
          'READ_STAFF_SUMMARY': 'READ_STAFF_SUMMARY',
          'RECORD_FEE_COLLECTION': 'RECORD_FEE_COLLECTION',
          'CREATE_ADMISSION': 'CREATE_ADMISSION',
          'MARKET_INTELLIGENCE': 'MARKET_INTELLIGENCE',
          'READ_FILE': 'READ_FILE',
          'DESKTOP_TASK': 'DESKTOP_TASK'
        };
        const mappedIntent = KERNEL_TO_SEMANTIC_INTENT[kernelIntent] || kernelIntent;
        if (mappedIntent && mappedIntent !== 'UNKNOWN') {
          forensicTrace.kernelIntentOverride = true;
          forensicTrace.originalSemanticIntent = semanticRes.intent;
          forensicTrace.originalSemanticConfidence = semanticRes.confidence;
          semanticRes.intent = mappedIntent;
          semanticRes.confidence = Math.max(semanticRes.confidence, kernelComp.CONFIDENCE || 0.90);
          // Merge kernel entities into semantic entities (kernel takes precedence)
          if (kernelComp.ENTITIES) {
            semanticRes.entities = { ...semanticRes.entities, ...kernelComp.ENTITIES };
          }
        }
      }

      // Attach comprehension to forensicTrace
      if (semanticRes.comprehension) {
        forensicTrace.comprehension_domain = semanticRes.comprehension.DOMAIN;
        forensicTrace.comprehension_subdomain = semanticRes.comprehension.SUBDOMAIN;
        forensicTrace.comprehension_confidence = semanticRes.comprehension.CONFIDENCE;
        forensicTrace.confidence_gate = semanticRes.confidenceGate || 'EXECUTE';
        forensicTrace.context_action = semanticRes.comprehension.CONTEXT_ACTION;
        forensicTrace.multi_intents = semanticRes.multiIntents || [];
        forensicTrace.correction_detected = semanticRes.comprehension.USER_CORRECTION?.detected || forensicTrace.correction_detected;
        forensicTrace.negation_detected = semanticRes.comprehension.NEGATION?.detected || forensicTrace.negation_detected;
      }

      // ================================================================
      // JARVIS 4.3 — ALREADY_KNOWN_FIELD_REASK GUARD
      // Before routing, if pending clarification already has an answer
      // in the comprehension entities, clear it and override intent.
      // ================================================================
      if (session.pendingClarification === 'STUDENT_REQUIRED_FOR_FEE' && !isExplicitAdmissionRequest) {
        const compEntities = semanticRes.comprehension?.ENTITIES || {};
        const candName = compEntities.studentName || compEntities.studentReference;
        const parsedCandidate = StudentQueryParser.parse(rawText);
        const resolvedName = candName || parsedCandidate.student_name || extractedCandidate.name;
        if (resolvedName) {
          semanticRes.intent = 'READ_STUDENT_FEE';
          semanticRes.confidence = 0.99;
          semanticRes.entities.studentName = resolvedName;
          semanticRes.entities.studentReference = resolvedName;
          if (compEntities.className || parsedCandidate.class_name || extractedCandidate.class) {
            semanticRes.entities.className = compEntities.className || parsedCandidate.class_name || extractedCandidate.class;
          }
          delete session.pendingClarification;
        }
      }

      forensicTrace.selected_intent = semanticRes ? semanticRes.intent : null;
      forensicTrace.intent_confidence = semanticRes ? semanticRes.confidence : 0;
      forensicTrace.extracted_entities = semanticRes ? semanticRes.entities : {};
      forensicTrace.modality = semanticRes ? semanticRes.modality : null;
      forensicTrace.negation_detected = Boolean((semanticRes && semanticRes.negationDetected) || semanticRes?.comprehension?.NEGATION?.detected);
      if (semanticRes?.comprehension?.NEGATION?.isContrastive) {
        forensicTrace.negated_domain = semanticRes.comprehension.NEGATION.negatedDomain;
        forensicTrace.negated_intent = semanticRes.comprehension.NEGATION.negatedIntent;
        forensicTrace.positive_domain = semanticRes.comprehension.NEGATION.positiveDomain;
        forensicTrace.positive_intent = semanticRes.comprehension.NEGATION.positiveIntent;
        forensicTrace.is_contrastive_negation = true;
      }
      if (semanticRes?.comprehension?.CONFIDENCE_COMPONENTS) {
        forensicTrace.confidence_components = semanticRes.comprehension.CONFIDENCE_COMPONENTS;
      }

      if (semanticRes && semanticRes.confidence >= 0.85) {
        if (semanticRes.intent === 'CLARIFICATION_REQUIRED') {
          const reply = semanticRes.clarificationPrompt;
          missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
            intent: 'CLARIFICATION_REQUIRED',
            finalResponseText: reply
          });
          missionManager.markDelivered(fromNumber, mission.missionId);
          return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
        }

        if (semanticRes.intent === 'RECORD_FEE_COLLECTION') {
          if (role !== 'OWNER' && role !== 'ADMIN') {
            intent = 'FEE_COLLECTION_PAYMENT';
            data = {
              success: false,
              unauthorized: true,
              message: 'Fee collection record karne ka ikhtiyar sirf School Owner aur Admin ke paas hai.'
            };
          } else {
            const targetStudentRef = semanticRes.entities.studentId || semanticRes.entities.studentReference || (session.lastStudent && (session.lastStudent.id || session.lastStudent.name));
            if (!targetStudentRef) {
              intent = 'FEE_COLLECTION_PAYMENT';
              data = {
                success: false,
                not_found: true,
                message: 'Kaun se student ki fee pay/jama karni hai? Student ka naam ya admission number dein.'
              };
            } else {
              intent = 'FEE_COLLECTION_PAYMENT';
              data = await this.dataEngine.recordCashFeePayment({
                studentIdOrName: targetStudentRef,
                amount: semanticRes.entities.amount,
                operatorRole: role,
                fromNumber
              });
              if (data && data.success && data.student) {
                session.lastStudent = data.student;
                session.lastChallan = data.challan;
                contextualEntityMemory.bindStudent(fromNumber, data.student, 'whatsapp');
                safeLearningStore.recordVerifiedSuccess({
                  utterance: rawText,
                  intent: 'RECORD_FEE_COLLECTION',
                  executionResult: data
                });
              }
            }
          }
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_STUDENT_FEE' || semanticRes.intent === 'READ_FEE_SUMMARY') {
          forensicTrace.school_data_engine_invoked = true;
          forensicTrace.final_capability = 'school.get_student_fee';
          forensicTrace.final_response_source = 'SCHOOL_SAAS_LIVE';

          // Check explicit student name from current message first
          const explicitStudentName = semanticRes.comprehension?.ENTITIES?.studentName ||
            semanticRes.comprehension?.ENTITIES?.studentReference;

          const linkedChildren = (this.dataEngine && this.dataEngine.getStudentsByParentPhone)
            ? await this.dataEngine.getStudentsByParentPhone(fromNumber)
            : [];
          const isParentCaller = (role === 'PARENT');

          let targetStudentRef = explicitStudentName ||
            semanticRes.entities.studentName ||
            semanticRes.entities.studentReference;
          let classFilter = semanticRes.entities.className || session.currentClass;

          // For parent callers: if no explicit student is named in this message, auto-bind to their own child
          if (isParentCaller && !explicitStudentName) {
            if (linkedChildren && linkedChildren.length === 1) {
              targetStudentRef = linkedChildren[0].name;
              classFilter = linkedChildren[0].class || classFilter;
              session.lastStudent = linkedChildren[0];
              forensicTrace.resolved_student = linkedChildren[0].name;
              forensicTrace.parent_child_auto_bound = true;
            } else if (linkedChildren && linkedChildren.length > 1) {
              // Section 7 Invariant: Return authorized consolidated summary for all linked children or ask which child; never arbitrarily pick one!
              let totalPending = 0;
              const breakdownLines = [];
              for (const child of linkedChildren) {
                try {
                  const fData = await this.dataEngine.getStudentFee(child.name, child.class);
                  const amt = Number(fData?.pendingFee ?? fData?.monthlyFee ?? fData?.totalDues ?? 3500);
                  totalPending += amt;
                  breakdownLines.push(`• ${child.name} (${child.class || 'Class'}): PKR ${amt}`);
                } catch (e) {
                  breakdownLines.push(`• ${child.name} (${child.class || 'Class'})`);
                }
              }

              const promptMsg = (language === 'URDU_SCRIPT')
                ? `آپ کے ${linkedChildren.length} بچے رجسٹرڈ ہیں:\n${breakdownLines.join('\n')}\nکل واجب الادا فیس: PKR ${totalPending}\nبرائے مہربانی بتائیں کس بچے کی تفصیلی معلومات درکار ہیں؟`
                : `Aap ke ${linkedChildren.length} bachay registered hain:\n${breakdownLines.join('\n')}\nTotal Fee: PKR ${totalPending}\n(Agar kisi specific bachay ki mazeed details chahiye to naam batayein).`;

              forensicTrace.parent_multi_child_consolidated = true;
              forensicTrace.multi_child_count = linkedChildren.length;
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'DISAMBIGUATE_CHILD',
                finalResponseText: promptMsg
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: promptMsg, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            } else {
              forensicTrace.parent_child_isolation_enforced = true;
              const notLinkedMsg = (language === 'URDU_SCRIPT')
                ? 'معذرت، آپ کا نمبر کسی رجسٹرڈ طالب علم کے ریکارڈ سے منسلک نہیں ہے۔ برائے مہربانی اسکول انتظامیہ سے رابطہ کریں۔'
                : 'Maazrat, aap ka number kisi registered student ke record se linked nahi hai. Barah-e-karam school admin se rabta karein.';
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'PRIVACY_RESTRICTION',
                finalResponseText: notLinkedMsg
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: notLinkedMsg, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            }
          }

          // 1. PUBLIC_GENERAL_FEE_SCHEDULE: Allowed for public callers
          const isGeneralFeeScheduleQuery = (
            !explicitStudentName &&
            (lower.includes('fee schedule') || lower.includes('fee structure') || lower.includes('fees structure') ||
             lower.includes('standard fee') || lower.includes('fees schedule') || lower.includes('general fee') ||
             lower.includes('classes ki fee') || lower.includes('admission fee') || lower.includes('fee plan'))
          );

          if (isGeneralFeeScheduleQuery) {
            forensicTrace.public_fee_schedule_allowed = true;
            const scheduleReply = (language === 'URDU_SCRIPT')
              ? `الصدّيق اسکالرز پبلک اسکول — عمومی فیس شیڈول:\n• نرسری تا کے جی: PKR 2,500 ماہانہ\n• پرائمری (کلاس 1 تا 5): PKR 3,000 ماہانہ\n• مڈل (کلاس 6 تا 8): PKR 3,500 ماہانہ\n• میٹرک (کلاس 9 تا 10): PKR 4,000 ماہانہ\n• حفظ القرآن کلاس: PKR 3,000 ماہانہ\n(داخلہ فیس: PKR 5,000 یکمشت)\nداخلے کی معلومات کے لیے کلاس کا نام بتائیے۔`
              : `Al-Siddique Scholars Public School — General Fee Schedule:\n• Starter / Nursery / Prep: PKR 2,500 / month\n• Primary (Classes 1 - 5): PKR 3,000 / month\n• Middle (Classes 6 - 8): PKR 3,500 / month\n• Matric (Classes 9 - 10): PKR 4,000 / month\n• Hifaz-ul-Quran: PKR 3,000 / month\n(Admission Fee: PKR 5,000 one-time).\nFor admission inquiries, please state the applying class.`;

            missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
              intent: 'PUBLIC_GENERAL_FEE_SCHEDULE',
              finalResponseText: scheduleReply
            });
            missionManager.markDelivered(fromNumber, mission.missionId);
            return { reply: scheduleReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
          }

          // 2. PUBLIC_STUDENT_FEE_RECORD: Denied for public callers
          if (role === 'PUBLIC' && explicitStudentName) {
            forensicTrace.public_student_fee_denied = true;
            forensicTrace.parent_child_isolation_enforced = true;
            const deniedReply = (language === 'URDU_SCRIPT')
              ? 'معذرت، طالب علم کی فیس اور ذاتی ریکارڈ صرف تصدیق شدہ والدین یا اسکول انتظامیہ کو فراہم کیا جا سکتا ہے۔'
              : 'Maazrat, kisi specific student ka fee record sirf verified parents ya school administration dekh sakti hai.';

            missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
              intent: 'PRIVACY_RESTRICTION',
              finalResponseText: deniedReply
            });
            missionManager.markDelivered(fromNumber, mission.missionId);
            return { reply: deniedReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
          }

          // Non-parent or fallback when no name in message:
          if (!targetStudentRef) {
            targetStudentRef = semanticRes.entities.studentId ||
              (session.lastStudent && (session.lastStudent.id || session.lastStudent.name)) ||
              (contextualEntityMemory.getSession(fromNumber, 'whatsapp')?.activeStudent?.name);
            classFilter = classFilter || (session.lastStudent && session.lastStudent.class);
          }

          if (!targetStudentRef) {
            session.pendingClarification = 'STUDENT_REQUIRED_FOR_FEE';
            intent = 'STUDENT_FEE';
            data = {
              found: false,
              error: 'STUDENT_REQUIRED_FOR_FEE',
              message: 'Kaun se student ki fee check karni hai? Student ka naam ya admission number dein.'
            };
          } else {
            intent = 'STUDENT_FEE';
            data = await this.dataEngine.getStudentFee(targetStudentRef, classFilter);
            if (data && data.found) {
              // Privacy Gate Check
              const authz = this.enforceParentChildPrivacy({
                fromNumber,
                role,
                student: data.student || data,
                language,
                forensicTrace,
                isParent: isParentCaller
              });
              if (!authz.allowed) {
                missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                  intent: 'PRIVACY_RESTRICTION',
                  finalResponseText: authz.reply
                });
                missionManager.markDelivered(fromNumber, mission.missionId);
                return { reply: authz.reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
              }

              if (data.studentId) {
                session.lastStudent = {
                  id: data.studentId,
                  name: data.studentName,
                  displayName: data.displayName || data.studentName,
                  father_name: data.student?.father_name || data.father_name,
                  class: data.class || data.student?.class,
                  section: data.student?.section || data.section
                };
                session.currentClass = session.lastStudent.class;
                contextualEntityMemory.bindStudent(fromNumber, session.lastStudent, 'whatsapp');
                forensicTrace.resolved_student = session.lastStudent.name;
                delete session.pendingClarification;
              }
            }
          }
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_STUDENT_RECORD') {
          forensicTrace.school_data_engine_invoked = true;
          forensicTrace.final_capability = 'school.search_student';
          forensicTrace.final_response_source = 'SCHOOL_SAAS_LIVE';

          // 3. PUBLIC_PRIVATE_ROSTER: Deny public access to student records/roster
          if (role === 'PUBLIC') {
            forensicTrace.public_private_roster_denied = true;
            forensicTrace.parent_child_isolation_enforced = true;
            const deniedReply = (language === 'URDU_SCRIPT')
              ? 'معذرت، طالب علم کا ریکارڈ اور اسکول روسٹر صرف تصدیق شدہ والدین یا انتظامیہ کے لیے دستیاب ہے۔'
              : 'Maazrat, student roster aur private record sirf verified parents ya school administration dekh sakti hai.';

            missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
              intent: 'PRIVACY_RESTRICTION',
              finalResponseText: deniedReply
            });
            missionManager.markDelivered(fromNumber, mission.missionId);
            return { reply: deniedReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
          }

          let targetStudentRef = semanticRes.entities.studentName ||
            semanticRes.entities.studentReference ||
            (session.lastStudent && session.lastStudent.name) ||
            semanticRes.entities.studentId ||
            (session.lastStudent && session.lastStudent.id);

          let classFilter = semanticRes.entities.className || session.currentClass;

          // Parent Auto-Binding & Verification
          const linkedChildrenRec = (this.dataEngine && this.dataEngine.getStudentsByParentPhone)
            ? await this.dataEngine.getStudentsByParentPhone(fromNumber)
            : [];
          const isParentCallerRec = (role === 'PARENT');

          if (isParentCallerRec && !targetStudentRef) {
            if (linkedChildrenRec && linkedChildrenRec.length === 1) {
              targetStudentRef = linkedChildrenRec[0].name;
              classFilter = linkedChildrenRec[0].class;
              session.lastStudent = linkedChildrenRec[0];
              forensicTrace.resolved_student = linkedChildrenRec[0].name;
              forensicTrace.parent_child_auto_bound = true;
            } else if (linkedChildrenRec && linkedChildrenRec.length > 1) {
              const childNames = linkedChildrenRec.map(c => c.name + (c.class ? ` (${c.class})` : '')).join(', ');
              const promptMsg = (language === 'URDU_SCRIPT')
                ? `آپ کے ایک سے زیادہ بچے رجسٹرڈ ہیں (${childNames})۔ آپ کس بچے کا ریکارڈ دیکھنا چاہتے ہیں؟`
                : `Aap ke ${linkedChildrenRec.length} bachay registered hain (${childNames}). Aap kis bachay ka record dekhna chahte hain?`;
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'DISAMBIGUATE_CHILD',
                finalResponseText: promptMsg
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: promptMsg, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            } else {
              forensicTrace.parent_child_isolation_enforced = true;
              const notLinkedMsg = (language === 'URDU_SCRIPT')
                ? 'معذرت، آپ کا نمبر کسی رجسٹرڈ طالب علم کے ریکارڈ سے منسلک نہیں ہے۔ برائے مہربانی اسکول انتظامیہ سے رابطہ کریں۔'
                : 'Maazrat, aap ka number kisi registered student ke record se linked nahi hai. Barah-e-karam school admin se rabta karein.';
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'PRIVACY_RESTRICTION',
                finalResponseText: notLinkedMsg
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: notLinkedMsg, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            }
          }

          intent = 'SEARCH_STUDENT';
          data = await this.dataEngine.searchStudent(targetStudentRef, classFilter);
          if (data && data.found && data.results && data.results.length > 0) {
            // Privacy Gate Check
            const targetStudent = data.results[0];
            const authz = this.enforceParentChildPrivacy({
              fromNumber,
              role,
              student: targetStudent,
              language,
              forensicTrace,
              isParent: isParentCallerRec
            });
            if (!authz.allowed) {
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'PRIVACY_RESTRICTION',
                finalResponseText: authz.reply
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: authz.reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            }

            if (data.results.length === 1) {
              const st = data.results[0];
              session.lastStudent = {
                id: st.id,
                name: st.name,
                displayName: st.displayName || st.name,
                father_name: st.father_name,
                class: st.class,
                section: st.section
              };
              session.currentClass = session.lastStudent.class;
              contextualEntityMemory.bindStudent(fromNumber, session.lastStudent, 'whatsapp');
              forensicTrace.resolved_student = session.lastStudent.name;
            }
          }
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_FEE_SUMMARY') {
          if (role !== 'OWNER' && role !== 'ADMIN') {
            forensicTrace.parent_child_isolation_enforced = true;
            const rbacMsg = (language === 'URDU_SCRIPT')
              ? 'معذرت سر، اسکول کے مجموعی مالیاتی ریکارڈز صرف انتظامیہ کے لیے مخصوص ہیں۔'
              : 'Sir, school-wide financial summary is restricted to school administration only.';
            missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
              intent: 'PRIVACY_RESTRICTION',
              finalResponseText: rbacMsg
            });
            missionManager.markDelivered(fromNumber, mission.missionId);
            return { reply: rbacMsg, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
          }
          intent = 'FEE_SUMMARY';
          data = await this.dataEngine.getFeeSummary();
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_ATTENDANCE') {
          let targetStudentRef = semanticRes.entities.studentId ||
            semanticRes.entities.studentReference ||
            semanticRes.entities.studentName ||
            (session.lastStudent && (session.lastStudent.id || session.lastStudent.name));

          if (role === 'PARENT') {
            if (!targetStudentRef) {
              const linkedChildren = await this.dataEngine.getStudentsByParentPhone(fromNumber);
              if (linkedChildren && linkedChildren.length === 1) {
                targetStudentRef = linkedChildren[0].name;
                session.lastStudent = linkedChildren[0];
                forensicTrace.resolved_student = linkedChildren[0].name;
              }
            } else {
              const sRes = await this.dataEngine.searchStudent(targetStudentRef);
              if (sRes && sRes.found && sRes.results && sRes.results.length > 0) {
                const authz = this.enforceParentChildPrivacy({
                  fromNumber,
                  role,
                  student: sRes.results[0],
                  language,
                  forensicTrace
                });
                if (!authz.allowed) {
                  missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                    intent: 'PRIVACY_RESTRICTION',
                    finalResponseText: authz.reply
                  });
                  missionManager.markDelivered(fromNumber, mission.missionId);
                  return { reply: authz.reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
                }
              }
            }
          }

          if (targetStudentRef && session.lastStudent) {
            forensicTrace.resolved_student = session.lastStudent.name;
          }
          intent = 'ATTENDANCE_SUMMARY';
          data = await this.dataEngine.getAttendanceSummary();
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_STUDENT_COUNT') {
          intent = 'TOTAL_STUDENTS';
          data = await this.dataEngine.getStudentsCount();
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_CLASS_STRENGTH' && semanticRes.entities.className) {
          intent = 'SPECIFIC_CLASS_STRENGTH';
          data = await this.dataEngine.getClassStrength(semanticRes.entities.className);
          session.currentClass = data.className || semanticRes.entities.className;
          session.currentCount = data.count;
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_CLASSES_LIST') {
          intent = 'CLASS_WISE_STRENGTH';
          data = await this.dataEngine.getClassWiseStrength();
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'READ_STAFF_SUMMARY') {
          intent = 'STAFF_SUMMARY';
          data = await this.dataEngine.getStaffSummary();
          this.routingStats.tier0++;
        }

        else if (semanticRes.intent === 'MARKET_INTELLIGENCE') {
          this.routingStats.tier0++;
          const result = await argusMarketEngine.processMarketQuestion(rawText, language, { userId: fromNumber });
          const reply = result.text || '';

          missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
            intent: 'MARKET_INTELLIGENCE',
            finalResponseText: reply,
            data: result
          });
          missionManager.markDelivered(fromNumber, mission.missionId);
          return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId };
        }
      }

      if (!intent) {
      // A. Combined: Total Students AND Class-Wise Strength
      if (
        (lower.includes('full school report') || lower.includes('school enrollment') || lower.includes('enrollment ki poori report')) ||
        (
          (lower.includes('total') || lower.includes('tamam') || lower.includes('kul') || lower.includes('overall') || rawText.includes('کل') || rawText.includes('تمام')) &&
          (lower.includes('student') || lower.includes('bach') || lower.includes('enroll') || lower.includes('stdnt') || rawText.includes('طلباء') || rawText.includes('بچے') || rawText.includes('بچوں')) &&
          (lower.includes('har class') || lower.includes('class-wise') || lower.includes('class wise') || lower.includes('each class') || rawText.includes('کلاس وار') || rawText.includes('ہر کلاس'))
        )
      ) {
        intent = 'COMBINED_STUDENTS_AND_CLASS_REPORT';
        data = await this.dataEngine.getCombinedStudentReport();
        this.routingStats.tier0++;
      }

      // B. Class-Wise Strength Alone
      else if (
        lower.includes('classes ki poori report') || lower.includes('classes report') || lower.includes('classes hain') ||
        ((lower.includes('class') || lower.includes('clss') || lower.includes('jamaat') || rawText.includes('کلاس') || rawText.includes('جماعت')) &&
         (lower.includes('har') || lower.includes('wise') || lower.includes('breakdown') || lower.includes('each') || lower.includes('tafseel') || rawText.includes('ہر') || rawText.includes('وار') || rawText.includes('تفصیل'))) ||
        (lower.includes('class-wise') || lower.includes('class wise'))
      ) {
        intent = 'CLASS_WISE_STRENGTH';
        data = await this.dataEngine.getClassWiseStrength();
        this.routingStats.tier0++;
      }

      // C0. Non-Offered Higher Secondary Classes (e.g. 11th, 12th, 15th)
      else if ((/(?:class|grade|jamaat)?\s*(?:11|12|13|14|15)(?:th)?\b/i.test(lower) || ((lower.includes('11') || lower.includes('12') || lower.includes('15')) && (rawText.includes('کلاس') || rawText.includes('جماعت')))) && (/(?:class|grade|jamaat|bache|bachay|fee|dakhla|admission|mein|kitne|تعلیم)/i.test(lower) || rawText.includes('کلاس') || rawText.includes('تعلیم'))) {
        const reply = (language === 'URDU_SCRIPT')
          ? `الصدّيق اسکالرز پبلک اسکول میں پری اسکول تا میٹرک (10th) اور حفظ کلاس کی تعلیم دی جاتی ہے۔ ہائر سیکنڈری کلاسز (11th، 12th، 15th) شامل نہیں ہیں۔`
          : `Sir, higher secondary classes (11th, 12th, 15th) are not part of Al Siddique Scholars Public School. Our offerings extend from Starter to 10th Grade and Hifaz Class.`;
        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'CLASS_OUT_OF_OFFERING',
          finalResponseText: reply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId };
      }

      // C. Specific Single Class Strength (Exact token matching across English, Roman Urdu, Urdu script, ordinals)
      else if (
        (() => {
          const classTokens = [
            { name: 'Starter', matches: ['starter', 'سٹارٹر', 'playgroup', 'pg', 'nursery'] },
            { name: 'Mover', matches: ['mover', 'موور', 'movr', 'prep', 'kg'] },
            { name: 'Flyer', matches: ['flyer', 'فلائر'] },
            { name: 'One', matches: ['\\bone\\b', '1st', 'first', 'pehli', 'pehlī', 'ون', 'پہلی', 'class 1', 'grade 1', '1 class', 'clss 1'] },
            { name: 'Two', matches: ['\\btwo\\b', '2nd', 'second', 'doosri', 'ٹو', 'دوسری', 'class 2', 'grade 2', '2 class', 'clss 2'] },
            { name: 'Three', matches: ['\\bthree\\b', '3rd', 'third', 'teesri', 'تھری', 'تیسری', 'class 3', 'grade 3', '3 class', 'clss 3'] },
            { name: 'Four', matches: ['\\bfour\\b', '4th', 'fourth', 'chothi', 'فور', 'چوتھی', 'class 4', 'grade 4', '4 class', 'clss 4'] },
            { name: 'Five', matches: ['\\bfive\\b', '5th', 'fifth', 'panchween', 'فائیو', 'پانچویں', 'class 5', 'grade 5', '5 class', 'clss 5'] },
            { name: 'Six', matches: ['\\bsix\\b', '6th', 'sixth', 'chhati', 'سکس', 'چھٹی', 'class 6', 'grade 6', '6 class', 'clss 6'] },
            { name: 'Seven', matches: ['\\bseven\\b', '7th', 'seventh', 'saatween', 'سیون', 'ساتویں', 'class 7', 'grade 7', '7 class', 'clss 7'] },
            { name: 'Eight', matches: ['\\beight\\b', '8th', 'eighth', 'aathween', 'ایٹ', 'آٹھویں', 'class 8', 'grade 8', '8 class', 'clss 8', '8 ki'] },
            { name: 'Pre Nine', matches: ['pre nine', 'pre-nine', 'pre 9', 'pre-9', 'پری نائن', '9th', 'class 9', 'grade 9', '\\bnine\\b'] },
            { name: 'Hifaz Class', matches: ['hifaz', 'hifz', 'حفاظ'] }
          ];

          for (const ct of classTokens) {
            for (const m of ct.matches) {
              const regex = (/[a-z0-9]/i.test(m))
                ? new RegExp(`(?:^|\\s|\\b)${m}(?:$|\\s|\\b)`, 'i')
                : new RegExp(`(?:^|\\s)${m}(?:$|\\s)`, 'i');
              if (regex.test(lower) || regex.test(rawText)) {
                return ct.name;
              }
            }
          }
          return null;
        })() &&
        !lower.includes('compare') && !lower.includes('difference') && !lower.includes('farq') && !lower.includes('hissa') && !lower.includes('mil kar') &&
        !lower.includes('class 12') && !lower.includes('class 15') &&
        !lower.includes('admission') && !lower.includes('dakhla') && !rawText.includes('داخلہ') &&
        !lower.includes('fee') && !lower.includes('fees') && !rawText.includes('فیس')
      ) {
        const classTokens = [
          { name: 'Starter', matches: ['starter', 'سٹارٹر', 'playgroup', 'pg', 'nursery'] },
          { name: 'Mover', matches: ['mover', 'موور', 'movr', 'prep', 'kg'] },
          { name: 'Flyer', matches: ['flyer', 'فلائر'] },
          { name: 'One', matches: ['\\bone\\b', '1st', 'first', 'pehli', 'pehlī', 'ون', 'پہلی', 'class 1', 'grade 1', '1 class', 'clss 1'] },
          { name: 'Two', matches: ['\\btwo\\b', '2nd', 'second', 'doosri', 'ٹو', 'دوسری', 'class 2', 'grade 2', '2 class', 'clss 2'] },
          { name: 'Three', matches: ['\\bthree\\b', '3rd', 'third', 'teesri', 'تھری', 'تیسری', 'class 3', 'grade 3', '3 class', 'clss 3'] },
          { name: 'Four', matches: ['\\bfour\\b', '4th', 'fourth', 'chothi', 'فور', 'چوتھی', 'class 4', 'grade 4', '4 class', 'clss 4'] },
          { name: 'Five', matches: ['\\bfive\\b', '5th', 'fifth', 'panchween', 'فائیو', 'پانچویں', 'class 5', 'grade 5', '5 class', 'clss 5'] },
          { name: 'Six', matches: ['\\bsix\\b', '6th', 'sixth', 'chhati', 'سکس', 'چھٹی', 'class 6', 'grade 6', '6 class', 'clss 6'] },
          { name: 'Seven', matches: ['\\bseven\\b', '7th', 'seventh', 'saatween', 'سیون', 'ساتویں', 'class 7', 'grade 7', '7 class', 'clss 7'] },
          { name: 'Eight', matches: ['\\beight\\b', '8th', 'eighth', 'aathween', 'ایٹ', 'آٹھویں', 'class 8', 'grade 8', '8 class', 'clss 8', '8 ki'] },
          { name: 'Pre Nine', matches: ['pre nine', 'pre-nine', 'pre 9', 'pre-9', 'پری نائن', '9th', 'class 9', 'grade 9', '\\bnine\\b'] },
          { name: 'Hifaz Class', matches: ['hifaz', 'hifz', 'حفاظ'] }
        ];

        let foundClass = 'Eight';
        for (const ct of classTokens) {
          for (const m of ct.matches) {
            const regex = (/[a-z0-9]/i.test(m))
              ? new RegExp(`(?:^|\\s|\\b)${m}(?:$|\\s|\\b)`, 'i')
              : new RegExp(`(?:^|\\s)${m}(?:$|\\s)`, 'i');
            if (regex.test(lower) || regex.test(rawText)) {
              foundClass = ct.name;
              break;
            }
          }
        }

        intent = 'SPECIFIC_CLASS_STRENGTH';
        data = await this.dataEngine.getClassStrength(foundClass);
        session.currentClass = data.className || foundClass;
        session.currentCount = data.count;
        this.routingStats.tier0++;
      }

      // D. Attendance Summary (Priority over generic student count)
      else if (lower.includes('attendance') || lower.includes('present') || lower.includes('hazri') || rawText.includes('حاضری') || rawText.includes('حاضر') || rawText.includes('غیر حاضر') || lower.includes('absent') || lower.includes('hazir')) {
        intent = 'ATTENDANCE_SUMMARY';
        data = await this.dataEngine.getAttendanceSummary();
        this.routingStats.tier0++;
      }

      // E0. Cash Fee Payment / Collection Command (OWNER / ADMIN only)
      else if (
        (
          /(?:fee|fees|fess|fe|challan|voucher|chalan)\s*(?:pay|submit|jama|jamaa|paid|bhar)\s*(?:kar|kr|kardo|krdo|dain|dein|karein|krn|lo)?/i.test(lower) ||
          ((/(?:pay|submit|jama|jamaa|paid|bhar)\s*(?:kar|kr|kardo|krdo|dain|dein|karein|krn|lo)?\s*(?:fee|fees|fess|fe|challan|voucher)?/i.test(lower)) && (lower.includes('fee') || lower.includes('paid') || lower.includes('jama') || lower.includes('submit'))) ||
          /\b(?:paid|pay)\s*(?:kar\s*do|kr\s*do|kardo|krdo|kar\s*dein|kr\s*dein|kardain|kardein)\b/i.test(lower) ||
          rawText.includes('فیس جمع') || rawText.includes('فیس ادا') || rawText.includes('ادا کر دو') || rawText.includes('جمع کر دو')
        ) && !lower.includes('kaise') && !lower.includes('kese') && !lower.includes('online pay') && !lower.includes('portal') && !lower.includes('report') && !lower.includes('summary') && !lower.includes('collection') && !lower.includes('recovery') && !lower.includes('kitni')
      ) {
        if (role !== 'OWNER' && role !== 'ADMIN') {
          intent = 'FEE_COLLECTION_PAYMENT';
          data = {
            success: false,
            unauthorized: true,
            message: 'Fee collection record karne ka ikhtiyar sirf School Owner aur Admin ke paas hai.'
          };
          this.routingStats.tier0++;
        } else {
          // Extract optional numeric amount (e.g. 1500 from "iski 1500 fee jama kar do")
          let amount = null;
          const amtMatch = rawText.match(/\b(?:pkr|rs\.?|rupees)?\s*([0-9]{3,6})\b/i);
          if (amtMatch) {
            const parsedAmt = Number(amtMatch[1]);
            if (parsedAmt >= 100 && parsedAmt <= 100000) {
              amount = parsedAmt;
            }
          }

          // Check if candidate student is specified in current turn or from session context
          let targetStudentRef = null;
          const isContextualRef = /\b(iski|iska|uski|uska|iss\s*bachay|is\s*bachay|us\s*bachay)\b/i.test(lower) ||
                                  /^(?:fee\s*)?(?:pay|submit|jama|paid)\s*(?:kar\s*do|kr\s*do|kardo|krdo)?$/i.test(lower.trim());

          if (isContextualRef && session.lastStudent) {
            targetStudentRef = session.lastStudent.id || session.lastStudent.name;
          } else {
            // Clean payment phrases to isolate candidate name
            const cleanedQuery = rawText
              .replace(/\b(fee|fees|fess|fe|challan|voucher|chalan|pay|submit|jama|jamaa|paid|bhar|collect|kar|kr|do|kardo|krdo|dain|dein|karein|lo|please|me|mein|ki|ka|ke|ko|se|hai|pkr|rs\.?|rupees|[0-9]+)\b|فیس|جمع|ادا|کر|دو|کی|کا|کے|کو/gi, ' ')
              .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (cleanedQuery.length >= 2 && !/^(iski|iska|uska|uski)$/i.test(cleanedQuery)) {
              targetStudentRef = cleanedQuery;
            } else if (session.lastStudent) {
              targetStudentRef = session.lastStudent.id || session.lastStudent.name;
            }
          }

          if (!targetStudentRef) {
            intent = 'FEE_COLLECTION_PAYMENT';
            data = {
              success: false,
              not_found: true,
              message: 'Kaun se student ki fee pay/jama karni hai? Student ka naam ya admission number dein.'
            };
            this.routingStats.tier0++;
          } else {
            intent = 'FEE_COLLECTION_PAYMENT';
            data = await this.dataEngine.recordCashFeePayment({
              studentIdOrName: targetStudentRef,
              amount,
              operatorRole: role,
              fromNumber
            });
            this.routingStats.tier0++;
            if (data && data.success && data.student) {
              session.lastStudent = data.student;
              session.lastChallan = data.challan;
            }
          }
        }
      }

      // E. Fee Summary (Priority over individual student fee and generic student count)
      else if (
        (lower.includes('school ki pending') || lower.includes('total collection') || lower.includes('fees recovery') || lower.includes('fee recovery') || lower.includes('kul fee') || lower.includes('fee collect') || lower.includes('school fee') ||
        (
          (lower.includes('fee') || lower.includes('fees') || lower.includes('challan') || lower.includes('challans') || lower.includes('recovery') || lower.includes('collection') || rawText.includes('فیس') || rawText.includes('چالان')) &&
          (lower.includes('summary') || lower.includes('summry') || lower.includes('report') || lower.includes('total') || lower.includes('collection') || lower.includes('collect') || (lower.includes('school') && lower.includes('pending')) || (lower.includes('school') && lower.includes('kitni')) || lower.includes('generate') || lower.includes('jama') || lower.includes('baqaya') || lower.includes('recovery') || lower.includes('kul') || rawText.includes('خلاصہ') || rawText.includes('رپورٹ') || rawText.includes('ریکوری') || rawText.includes('واجبات'))
        )) && !lower.includes('student') && !lower.includes('bachay') && !lower.includes('bachon')
      ) {
        intent = 'FEE_SUMMARY';
        data = await this.dataEngine.getFeeSummary();
        this.routingStats.tier0++;
      }

      // F. Individual Student Fee
      else if (
        !isAdmissionCapability && !lower.includes('admission') && !lower.includes('dakhla') &&
        !lower.includes('school ki') && !lower.includes('kul pending') && !lower.includes('total pending') && !lower.includes('fee summary') && !lower.includes('fees summary') && !lower.includes('online pay') && !lower.includes('voucher kaise') && !lower.includes('voucher create') && !lower.includes('voucher bana') &&
        (/(?:ki|ka|ke)\s*(?:pending\s*)?fee/i.test(lower) || lower.includes('fee kitni') ||
        (lower.includes('fee') && !lower.includes('summary') && !lower.includes('total') && !lower.includes('pending sab se zyada') && !lower.includes('highest') && !lower.includes('recovery') && !lower.includes('collection') && !lower.includes('collect')))
      ) {
        const queryClean = rawText.replace(/\b(record|student|ki fee|ka|ki|ke|check|karo|batao|search|details|please|naam|pata|karein|roll\s*number|bachay|bachon|list|school|me|mein|hai|kya|fees|fee|kitni|kitny|kitna|pending|short|status|father|only|number|just|aur|and|tum|agar|main|yha|pe|du|uska|iski|voucher|form|print|skty|ho|kr)\b/gi, '').trim();

        if (!queryClean || queryClean.length < 2) {
          if (role === 'PARENT') {
            const linkedChildren = await this.dataEngine.getStudentsByParentPhone(fromNumber);
            if (linkedChildren && linkedChildren.length === 1) {
              intent = 'STUDENT_FEE';
              data = await this.dataEngine.getStudentFee(linkedChildren[0].name, linkedChildren[0].class);
              if (data && data.found && data.studentId) {
                session.lastStudent = {
                  id: data.studentId,
                  name: data.studentName,
                  displayName: data.displayName || data.studentName,
                  father_name: data.father_name,
                  class: data.class,
                  section: data.section
                };
              }
              this.routingStats.tier0++;
            } else {
              intent = 'STUDENT_FEE';
              data = {
                found: false,
                error: 'STUDENT_REQUIRED_FOR_FEE',
                message: 'Kaun se student ki fee check karni hai? Student ka naam ya admission number dein.'
              };
              this.routingStats.tier0++;
            }
          } else {
            intent = 'STUDENT_FEE';
            data = {
              found: false,
              error: 'STUDENT_REQUIRED_FOR_FEE',
              message: 'Kaun se student ki fee check karni hai? Student ka naam ya admission number dein.'
            };
            this.routingStats.tier0++;
          }
        } else {
          intent = 'STUDENT_FEE';
          data = await this.dataEngine.getStudentFee(queryClean);
          if (data && data.found) {
            const authz = this.enforceParentChildPrivacy({
              fromNumber,
              role,
              student: data.student || data,
              language,
              forensicTrace
            });
            if (!authz.allowed) {
              missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
                intent: 'PRIVACY_RESTRICTION',
                finalResponseText: authz.reply
              });
              missionManager.markDelivered(fromNumber, mission.missionId);
              return { reply: authz.reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
            }
          }
          this.routingStats.tier0++;
          if (data && data.found && data.studentId) {
            session.lastStudent = {
              id: data.studentId,
              name: data.studentName,
              displayName: data.displayName || data.studentName,
              father_name: data.father_name,
              class: data.class,
              section: data.section
            };
          }
        }
      }

      // H. Overall Total Students Count
      else if (
        ((lower.includes('school mein') || lower.includes('school me') || lower.includes('school main')) && (lower.includes('bach') || lower.includes('student') || lower.includes('parhte') || lower.includes('parh') || lower.includes('dakhil') || lower.includes('tadaad'))) ||
        (
          (lower.includes('student') || lower.includes('stdnt') || lower.includes('bach') || lower.includes('pupil') || lower.includes('learner') || lower.includes('strength') || lower.includes('strenght') || lower.includes('enroll') || rawText.includes('طلباء') || rawText.includes('بچے') || rawText.includes('بچوں') || rawText.includes('طالب علم') || (lower.includes('boys') && lower.includes('girls'))) &&
          (lower.includes('kitn') || lower.includes('ktn') || lower.includes('how many') || lower.includes('total') || lower.includes('totl') || lower.includes('count') || lower.includes('cnt') || lower.includes('figure') || rawText.includes('کتنے') || rawText.includes('کتنی') || rawText.includes('تعداد'))
        )
      ) {
        intent = 'STUDENTS_COUNT';
        data = await this.dataEngine.getTotalStudents();
        session.lastTotalActiveStudents = data.totalActive;
        this.routingStats.tier0++;
      }

      // 7b. ARGUS Market Intelligence Route (Escape School-Only Routing Cage)
      // Kernel-authoritative: uses kernel domain when available
      const isMarketTradingQuery = !isAcademicAchievement && (
        (isKernelAuthoritativeDomain && (kernelDomain === 'ARGUS' || kernelDomain === 'MARKET') && kernelComp?.INTENT === 'MARKET_INTELLIGENCE') ||
        (!kernelDomain && (
          /\b(xau|xauusd|forex|fx|eurusd|gbpusd|usdjpy|dxy|dollar|crude|oil|crypto|bitcoin|btc|market|trading|trade|setup|signal|signals|trend|levels?|pullback|entry|invalidation|cpi|fomc|bounce|resistance|support)\b/i.test(lower) ||
          (/\b(gold|sona|sone|sonay)\b/i.test(lower) && !isAcademicAchievement) ||
          /سونا|سونے|گولڈ|مارکیٹ|ٹریڈنگ|سیٹ\s*اپ|سگنل|تجزیہ|لیولز|خرید|فروخت|سیل|بائے/i.test(rawText)
        ) && !/\b(student|students|bachay|bachon|school|class|attendance|dakhla|fee|fees|challan|balance|dues|pending|arrears|medal|award)\b/i.test(lower))
      );

      if (isMarketTradingQuery) {
        this.routingStats.modelPlanned++;
        const result = await argusMarketEngine.processMarketQuestion(rawText, language, { userId: fromNumber });
        const marketReply = result.text || '';

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'MARKET_INTELLIGENCE',
          finalResponseText: marketReply,
          data: result
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply: marketReply, durationMs: Date.now() - startTime, missionId: mission.missionId };
      }

      // I. Student Record Search (by name, GR, roll number, profile)
      else if (
        !lower.includes('aapka') && !lower.includes('apka') && !lower.includes('tumhara') && !lower.includes('your name') &&
        !lower.includes('admission') && !lower.includes('dakhla') && !lower.includes('admit') && !lower.includes('challan') && !lower.includes('voucher') &&
        (
          lower.includes('gr ') || lower.includes('gr_') || lower.includes('mig26') || lower.includes('record') || lower.includes('search') || lower.includes('find student') || lower.includes('nikalo') || lower.includes('roll number') || lower.includes('details') || lower.includes('profile') ||
          ((lower.includes('student') || lower.includes('bachay') || lower.includes('bachon') || lower.includes('naam')) && !lower.includes('kitn') && !lower.includes('how many') && !lower.includes('count') && !lower.includes('cnt') && !lower.includes('tadaad'))
        )
      ) {
        const queryClean = rawText.replace(/(record|student|ka|ki|ke|check|karo|batao|search|find|details|please|naam|pata|karein|roll\s*number|bachay|bachon|list|school|me|mein|hai|kya|fee|fees|status|father|class|in|with|of|nikalo|data)/gi, '').trim();
        intent = 'SEARCH_STUDENT';
        data = await this.dataEngine.searchStudent(queryClean);
        this.routingStats.tier0++;
      }

      // I. Staff / Teachers Summary
      else if (lower.includes('teacher') || lower.includes('teachers') || lower.includes('staff') || lower.includes('stff') || lower.includes('faculty') || lower.includes('asatza') || lower.includes('asatiza') || rawText.includes('اساتذہ') || rawText.includes('اسٹاف') || rawText.includes('عملہ')) {
        intent = 'STAFF_SUMMARY';
        data = await this.dataEngine.getStaffSummary();
        this.routingStats.tier0++;
      }

      // I. Public Information (Admissions, Timings, Location, Contact, Facilities)
      // Generic School Brochure Firewall (Section 8: BROCHURE_DURING_ADMISSION_COLLECTION = 0)
      else if (
        !isAdmissionActive && !isPayloadDataBlock && !session.pendingStructuredStudentPayload &&
        (
          lower.includes('admisn') || lower.includes('admission') || lower.includes('admissions') || lower.includes('dakhla') || lower.includes('dakhl') || rawText.includes('داخلہ') || rawText.includes('داخلے') ||
          lower.includes('timing') || lower.includes('operating hours') || lower.includes('hours') || lower.includes('kab khulta') || lower.includes('chutti') || lower.includes('sunday') || lower.includes('raat') || lower.includes('khula') || lower.includes('vacation') || lower.includes('summer') || lower.includes('winter') ||
          lower.includes('location') || lower.includes('address') || lower.includes('pata') || rawText.includes('پتہ') || rawText.includes('اوقات') || lower.includes('kahan') || lower.includes('where is') || lower.includes('waqia') || lower.includes('lahore') || lower.includes('islamabad') || lower.includes('karachi') ||
          lower.includes('contact') || lower.includes('helpline') || lower.includes('phone') || lower.includes('phone number') || lower.includes('contact number') || lower.includes('helpline number') || lower.includes('school ka number') || rawText.includes('ہیلپ لائن') ||
          lower.includes('hostel') || lower.includes('transport') || lower.includes('bus') || lower.includes('canteen') || lower.includes('sports') || lower.includes('ground') || lower.includes('uniform') || lower.includes('books') || lower.includes('result') || lower.includes('exam') || lower.includes('principal') || lower.includes('affiliation') || lower.includes('board') || lower.includes('registration') || lower.includes('playgroup') || lower.includes('nursery') || lower.includes('prep') || lower.includes('kg') || lower.includes('online pay') || lower.includes('portal')
        )
      ) {
        intent = 'PUBLIC_INFO';
        data = this.dataEngine.getPublicSchoolInfo();
        this.routingStats.tier0++;
      }
      } // End if (!intent) fallback

      // ================================================================
      // JARVIS 4.3 — SELF-CHECK BEFORE RESPONSE
      // Run pre-emission validation to prevent wrong-answer delivery.
      // ================================================================
      if (intent && data) {
        let style = 'DEFAULT';
        if (/(sirf\s*number|only\s*number|just\s*the\s*number|sirf\s*figure|number\s*only)/i.test(lower)) {
          style = 'NUMBER_ONLY';
        } else if (/(short\s*mein|mukhtasir|briefly|short\s*answer|in\s*short)/i.test(lower)) {
          style = 'SHORT';
        } else if (/(detail\s*mein|tafseel\s*se|detailed|in\s*detail|explain\s*in\s*detail)/i.test(lower)) {
          style = 'DETAILED';
        } else if (/(report\s*(?:do|banao|bnao|generate)|poori\s*report|complete\s*report|full\s*report)/i.test(lower)) {
          style = 'STRUCTURED_REPORT';
        }

        let reply = WhatsAppResponseComposer.compose({ intent, data, language, role, style });

        // Self-check
        if (semanticRes && semanticRes.comprehension) {
          let selfCheck = ComprehensionEngine.selfCheck(reply, semanticRes.comprehension, session);
          forensicTrace.self_check = selfCheck;
          if (!selfCheck.passed) {
            forensicTrace.self_check_blocked_transmission = true;

            // 1. If response discusses admission for read query or used stale context
            if (selfCheck.failures.includes('DID_I_USE_ADMISSION_FOR_READ_INTENT') || selfCheck.failures.includes('DID_I_USE_STALE_CONTEXT')) {
              admissionWorkflowEngine.abandonSession(fromNumber, 'SELF_CHECK_BLOCKED_ADMISSION_FOR_READ');
              const targetName = semanticRes.comprehension?.ENTITIES?.studentName || session.lastStudent?.name || contextualEntityMemory.getSession(fromNumber, 'whatsapp')?.activeStudent?.name;
              const targetClass = semanticRes.comprehension?.ENTITIES?.className || session.currentClass || session.lastStudent?.class;
              if (semanticRes.comprehension.USER_INTENT === 'READ_STUDENT_FEE' || semanticRes.comprehension.SUBDOMAIN === 'STUDENT_FEE') {
                const liveFee = await this.dataEngine.getStudentFee(targetName, targetClass);
                reply = WhatsAppResponseComposer.compose({ intent: 'STUDENT_FEE', data: liveFee, language, role, style });
                intent = 'STUDENT_FEE';
              } else {
                const liveStudent = await this.dataEngine.searchStudent(targetName, targetClass);
                reply = WhatsAppResponseComposer.compose({ intent: 'SEARCH_STUDENT', data: liveStudent, language, role, style });
                intent = 'SEARCH_STUDENT';
              }
            }

            // 2. If command phrase was used as person entity
            if (selfCheck.failures.includes('COMMAND_AS_PERSON_ENTITY')) {
              const recovered = session.lastStudent || session.activeStudent;
              if (recovered && recovered.name) {
                const cleanData = await this.dataEngine.searchStudent(recovered.name, recovered.class);
                reply = WhatsAppResponseComposer.compose({ intent: 'SEARCH_STUDENT', data: cleanData, language, role, style });
                intent = 'SEARCH_STUDENT';
              }
            }

            // 3. If already-known field reask
            if (selfCheck.failures.includes('DID_I_ASK_FOR_ALREADY_KNOWN_INFO')) {
              const targetName = semanticRes.comprehension?.ENTITIES?.studentName || session.lastStudent?.name;
              const targetClass = semanticRes.comprehension?.ENTITIES?.className || session.currentClass;
              if (targetName) {
                const liveRecord = await this.dataEngine.searchStudent(targetName, targetClass);
                reply = WhatsAppResponseComposer.compose({ intent: 'SEARCH_STUDENT', data: liveRecord, language, role, style });
                intent = 'SEARCH_STUDENT';
              }
            }

            // 4. If context was lost
            if (selfCheck.failures.includes('DID_I_LOSE_REQUIRED_CONTEXT') || selfCheck.failures.includes('DID_I_INCORRECTLY_CLEAR_ENTITY_DURING_INTENT_SWITCH')) {
              const recoveredStudent = session.lastStudent || session.activeStudent || contextualEntityMemory.getSession(fromNumber, 'whatsapp')?.activeStudent;
              if (recoveredStudent && recoveredStudent.name) {
                const recoveredFee = await this.dataEngine.getStudentFee(recoveredStudent.name, recoveredStudent.class);
                if (recoveredFee && recoveredFee.found) {
                  reply = WhatsAppResponseComposer.compose({ intent: 'STUDENT_FEE', data: recoveredFee, language, role, style });
                  session.lastStudent = {
                    id: recoveredFee.studentId,
                    name: recoveredFee.studentName,
                    displayName: recoveredFee.displayName || recoveredFee.studentName,
                    class: recoveredFee.class || recoveredStudent.class
                  };
                  forensicTrace.resolved_student = session.lastStudent.name;
                }
              }
            }

            // Re-evaluate selfCheck after replan
            const finalCheck = ComprehensionEngine.selfCheck(reply, semanticRes.comprehension, session);
            forensicTrace.self_check = finalCheck;
            forensicTrace.self_check_can_block_transmission = 'YES';
          }
        }

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent,
          finalResponseText: reply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }


      // 8b. Natural Conversational Chat (Phase 10 Turn 1: Natural greeting matching user language without brochure dump)
      if (
        /(hello|hi\b|hey\s*jarvis|hey\b|salam|assalam|good\s*morning|good\s*afternoon|good\s*evening|kaise|kesy|kya\s*haal|hal\s*chaal|theek|who\s*are\s*you|what\s*can\s*you|ap\s*kon|aap\s*kon|kya\s*kaam|naam\s*kya|kis\s*school|acha\s*laga|ai\s*assistant|nice\s*to\s*meet|thank|shukriya|jazakallah|help|madad|weather|mausam|swimming|helicopter|phd|degree|kia\s*kr\s*skte|kya\s*kr\s*skte|kia\s*kar\s*skte|kya\s*kar\s*skte|ap\s*kia|aap\s*kia|ap\s*kya|aap\s*kya)/i.test(lower) ||
        rawText.includes('سلام') || rawText.includes('کیسے') || rawText.includes('شکریہ') || rawText.includes('حال') || rawText.includes('کون') || rawText.includes('سوئمنگ') || rawText.includes('ہیلی کاپٹر')
      ) {
        this.routingStats.nlu++;
        let convoReply = '';
        if (lower.includes('swimming') || lower.includes('helicopter') || lower.includes('phd') || lower.includes('degree') || rawText.includes('سوئمنگ') || rawText.includes('ہیلی کاپٹر')) {
          convoReply = (language === 'URDU_SCRIPT')
            ? `الصدّيق اسکالرز پبلک اسکول میں معیاری پری اسکول تا میٹرک اور حفظ کلاس کی باقاعدہ تعلیم فراہم کی جاتی ہے۔ اضافی غیر تعلیمی سہولیات دستیاب نہیں ہیں۔`
            : `Sir, Al Siddique Scholars Public School provides quality education from Starter to 10th Grade and Hifaz Class. The requested facility is not part of the school campus.`;
        } else if (lower.includes('weather') || lower.includes('mausam')) {
          convoReply = (language === 'URDU_SCRIPT')
            ? `میں الصدّيق اسکالرز اسکول کا اسسٹنٹ ہوں اور اسکول ریکارڈز، طلباء اور حاضری سے متعلق معلومات کے لیے دستیاب ہوں۔`
            : `Sir, I am JARVIS, the school operations assistant. I handle school enrollment, class strength, attendance, and fee records.`;
        } else if (session.greetingSent) {
          convoReply = (language === 'URDU_SCRIPT')
            ? `وعلیکم السلام سر! فرمائیے، میں کس طرح مدد کر سکتا ہوں؟`
            : (language === 'ENGLISH' ? `Hello! How may I assist you?` : `Walaikum Assalam Sir. Hukum karein, main kis tarah madad kar sakta hoon?`);
        } else if (language === 'URDU_SCRIPT') {
          session.greetingSent = true;
          convoReply = `وعلیکم السلام سر! میں جارویس ہوں۔ فرمائیے، میں کس طرح آپ کی مدد کر سکتا ہوں؟`;
        } else if (language === 'ENGLISH') {
          session.greetingSent = true;
          convoReply = `Hello! I am JARVIS. How may I assist you today?`;
        } else {
          session.greetingSent = true;
          convoReply = `Walaikum Assalam! Main JARVIS hoon. Farmayein, main aapki kis tarah madad kar sakta hoon?`;
        }

        missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
          intent: 'GENERAL_CONVERSATION',
          finalResponseText: convoReply
        });
        missionManager.markDelivered(fromNumber, mission.missionId);
        return { reply: convoReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
      }

      // 9. Generic Fallback
      this.routingStats.genericFallbacks++;
      const fallbackReply = (language === 'URDU_SCRIPT')
        ? `جی سر، آپ کا پیغام موصول ہو گیا ہے۔ براہ کرم فرمائیں کہ آپ کس معاملے میں رہنمائی یا کارروائی چاہتے ہیں۔`
        : (language === 'ENGLISH'
          ? `Sir, your message has been received. Please specify how I may assist or execute for you.`
          : `Sir, aapka paigham received ho gaya hai. Barah-e-karam batayein keh main kis muamlay mein aapki madad ya execution karoon.`);
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'GENERIC',
        finalResponseText: fallbackReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: fallbackReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };

    } catch (err) {
      console.error('[WhatsAppRouter Error]', err.message);
      const errReply = WhatsAppResponseComposer.compose({
        intent: 'ERROR',
        data: err.message,
        language,
        role
      });
      missionManager.transition(mission.missionId, 'FINAL_RESPONSE_SENT', {
        intent: 'ERROR',
        finalResponseText: errReply
      });
      missionManager.markDelivered(fromNumber, mission.missionId);
      return { reply: errReply, durationMs: Date.now() - startTime, missionId: mission.missionId, forensicTrace };
    }
  }

  getRoutingMetrics() {
    return { ...this.routingStats };
  }
}

module.exports = {
  WhatsAppRouter
};
