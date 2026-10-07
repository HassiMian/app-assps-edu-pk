import { randomUUID } from 'node:crypto';
import { executeSchoolIntent, normalizeQuery, detectLanguage } from './school-tools.mjs';
import { liveSchoolSaaSClient } from './live-school-saas-client.mjs';
import { deepseekClient } from './deepseek-client.mjs';
import { EntityExtractor } from './entity-extractor.mjs';

/**
 * Enterprise Production WhatsApp Event Pipeline for JARVIS
 */

// LRU Deduplication Cache
class DeduplicationCache {
  constructor(maxSize = 1000, ttlMs = 120000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  isDuplicate(messageId) {
    if (!messageId) return false;
    const now = Date.now();
    if (this.cache.has(messageId)) {
      const entry = this.cache.get(messageId);
      if (now - entry < this.ttlMs) return true;
    }
    this.cache.set(messageId, now);
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    return false;
  }
}

// Conversation Context Store (Isolated per JID)
class ConversationContextStore {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.contexts = new Map();
  }

  getContext(jid) {
    const entry = this.contexts.get(jid);
    if (!entry) return { jid, turns: [], lastActive: Date.now(), activeEntity: null };
    if (Date.now() - entry.lastActive > this.ttlMs) {
      this.contexts.delete(jid);
      return { jid, turns: [], lastActive: Date.now(), activeEntity: null };
    }
    entry.lastActive = Date.now();
    return entry;
  }

  updateContext(jid, update = {}) {
    const current = this.getContext(jid);
    const updated = {
      ...current,
      ...update,
      lastActive: Date.now()
    };
    this.contexts.set(jid, updated);
    return updated;
  }

  addTurn(jid, userMsg, botReply, activeEntity = null) {
    const ctx = this.getContext(jid);
    ctx.turns.push({ user: userMsg, bot: botReply, at: new Date().toISOString() });
    if (ctx.turns.length > 6) ctx.turns.shift();
    if (activeEntity) ctx.activeEntity = activeEntity;
    ctx.lastActive = Date.now();
    this.contexts.set(jid, ctx);
  }

  clear(jid) {
    this.contexts.delete(jid);
  }
}

// Rate Limiter per User
class UserRateLimiter {
  constructor(maxPerMinute = 20) {
    this.maxPerMinute = maxPerMinute;
    this.windows = new Map();
  }

  isRateLimited(number) {
    const now = Date.now();
    const window = this.windows.get(number) || { count: 0, resetAt: now + 60000 };
    if (now > window.resetAt) {
      window.count = 0;
      window.resetAt = now + 60000;
    }
    window.count++;
    this.windows.set(number, window);
    return window.count > this.maxPerMinute;
  }
}

export class WhatsAppEventPipeline {
  constructor(options = {}) {
    this.gateway = options.gateway || null;
    this.dedup = new DeduplicationCache();
    this.contextStore = new ConversationContextStore();
    this.rateLimiter = new UserRateLimiter();
    this.missions = new Map();
    this.ownerAllowlist = new Set([
      "923001291959",
      "03001291959",
      "923069545996",
      "923320605730",
      "15816629843",
      "158166298434",
      "201064984891585"
    ]);
  }

  setGateway(gateway) {
    this.gateway = gateway;
  }

  /**
   * 1. Normalize Inbound Message
   */
  normalizeInbound(rawMessage, ownJid = "") {
    if (!rawMessage?.message) return null;
    const key = rawMessage.key || {};
    const remoteJid = String(key.remoteJid || "");

    // Loop Prevention & Filters
    if (key.fromMe) {
      const isSelfChat = remoteJid.endsWith("@lid") || (ownJid && remoteJid.split(":")[0] === ownJid.split(":")[0]);
      if (!isSelfChat) return null;
    }
    if (remoteJid.endsWith("@g.us")) return null; // Default to DM
    if (remoteJid === "status@broadcast") return null;

    const messageId = String(key.id || randomUUID());
    const timestamp = rawMessage.messageTimestamp
      ? new Date(Number(rawMessage.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    const payload = rawMessage.message;
    const text = String(
      payload.conversation
      || payload.extendedTextMessage?.text
      || payload.imageMessage?.caption
      || payload.videoMessage?.caption
      || payload.buttonsResponseMessage?.selectedDisplayText
      || payload.listResponseMessage?.title
      || ""
    ).trim();

    const fromNumber = String(remoteJid.split('@')[0]).replace(/\D/g, '');

    return {
      messageId,
      remoteJid,
      fromNumber,
      timestamp,
      text,
      hasMedia: Boolean(payload.imageMessage || payload.documentMessage || payload.videoMessage),
      mediaType: payload.imageMessage ? 'image' : (payload.documentMessage ? 'document' : null)
    };
  }

  /**
   * 2. Identity & Role Resolution (Exact E.164 Matching — Zero Fuzzy Logic)
   */
  async resolveRole(fromNumber) {
    const { resolveWhatsAppIdentity } = await import('./whatsapp-authz.mjs');
    const identity = resolveWhatsAppIdentity(fromNumber);
    return {
      role: identity.role.toUpperCase(),
      verified: identity.role !== 'public',
      label: identity.name,
      verifiedStudentIds: identity.verifiedStudentIds || [],
      students: identity.verifiedStudents || []
    };
  }

  /**
   * 3. Handle Complete Inbound Event Pipeline
   */
  async handleInboundEvent(rawEvent, options = {}) {
    const startTime = Date.now();
    const missionId = `MSN-WA-${randomUUID().slice(0, 8).toUpperCase()}`;

    // A. Normalization
    const normalized = options.preNormalized || this.normalizeInbound(rawEvent, options.ownJid);
    if (!normalized || !normalized.text) return null;

    // B. Deduplication (Phase 7)
    if (this.dedup.isDuplicate(normalized.messageId)) {
      return {
        ok: false,
        status: 'DUPLICATE_IGNORED',
        messageId: normalized.messageId,
        missionId
      };
    }

    // C. Rate Limiting (Phase 35)
    if (!options.bypassRateLimit && this.rateLimiter.isRateLimited(normalized.fromNumber)) {
      const rateLimitReply = "Sir, aapke bohot zyada messages aa rahe hain. Baraye meherbani ek minute intezar karein.";
      if (this.gateway) await this.gateway.sendText(normalized.remoteJid, rateLimitReply).catch(() => {});
      return {
        ok: false,
        status: 'RATE_LIMITED',
        missionId,
        reply: rateLimitReply
      };
    }

    // D. Identity & Role Engine (Phase 9)
    const userRole = await this.resolveRole(normalized.fromNumber);
    const lang = detectLanguage(normalized.text);
    const context = this.contextStore.getContext(normalized.remoteJid);

    // E. Contextual Query Augmentation (Phase 17)
    let effectiveQuery = normalized.text;
    const lowerText = normalized.text.toLowerCase();

    // If follow-up mentions month/class/fee without name, reuse active student from context
    if (context.activeEntity?.name && /(august|september|fee|fees|kitni|kitna|dues|gr|class|ka|ki|wali)/i.test(lowerText) && !/\b(asma|arsal|arslan|ali|ahmed|khan|ayyan|fatima)\b/i.test(lowerText)) {
      effectiveQuery = `${context.activeEntity.name} ${normalized.text}`;
    }

    let replyText = "";
    let toolName = "conversation";
    let executionSource = "JARVIS Core";
    let saasData = null;

    // F. Intent Routing & Execution
    // 1. Complaint Workflow (Phase 25)
    if (/(complaint|shikayat|masla|issue|khraab|error|defect|report)/i.test(normalized.text)) {
      toolName = "school.submit_complaint";
      executionSource = "WhatsApp Complaint Store";
      try {
        const { whatsAppDb } = await import("./whatsapp-db.mjs");
        const category = /(fee|fees|challan|payment)/i.test(normalized.text) ? "Fee"
          : /(teacher|class|homework|lesson)/i.test(normalized.text) ? "Academic"
          : /(transport|van|driver)/i.test(normalized.text) ? "Transport"
          : "General";
        const ticketId = whatsAppDb.createComplaint(normalized.fromNumber, normalized.text, category);
        replyText = `Al Siddique Scholars Public School\nComplaint Ticket: #${ticketId}\n\nSir, aapki shikayat darj kar ke Administration ko forward kar di gayi hai. Humari team jald aap se rabta kare gi.`;
        saasData = { ticketId, category, status: "OPEN" };
      } catch (err) {
        replyText = `Sir, complaint save nahi ho saki. Error: ${err.message}`;
        saasData = null;
      }
    }
    // 2. Human Escalation (Phase 26)
    else if (/(human|agent|call me|office se baat|admin se baat|principal se baat)/i.test(normalized.text)) {
      toolName = "school.escalate_human";
      executionSource = "Human Escalation Gateway";
      replyText = `Sir, aapki request school office ko forward kar di gayi hai. Office timings: 08:00 AM se 02:00 PM. Helpline: +92 306 9545996.`;
    }
    // 3. Public Admission / General Info (Phase 14)
    else if (userRole.role === 'PUBLIC' && /(admission|dakhla|fees structure|timing|location|address|kahan hai)/i.test(normalized.text)) {
      toolName = "school.public_info";
      executionSource = "School Public Registry";
      if (/(admission|dakhla)/i.test(normalized.text)) {
        replyText = `Al Siddique Scholars Public School (ASSPS)\nAdmissions Open (Starter to Class 10th).\n\nOnline apply karne ke liye visit karein: https://app.assps.edu.pk ya school office Sharif Chowk, Rayya Khas tashreef layen.`;
      } else {
        replyText = `Al Siddique Scholars Public School (ASSPS)\nLocation: Sharif Chowk, Rayya Khas, Narowal.\nTimings: Mon-Sat 08:00 AM - 01:30 PM.\nContact: +92 306 9545996.`;
      }
    }
    // 4. Parent Scope Enforcement (Phase 11)
    else if (userRole.role === 'PARENT' && /(fee|dues|attendance|hazri)/i.test(normalized.text) && !/(asma|arsal|arslan|ali|all)/i.test(normalized.text) && userRole.students?.length) {
      const child = userRole.students[0];
      effectiveQuery = `${child.name} ki fee pending`;
      const res = await executeSchoolIntent(effectiveQuery);
      toolName = res.tool || "school.get_student_fee";
      executionSource = res.source || "Live School SaaS";
      replyText = res.response;
      saasData = res.data;
      this.contextStore.addTurn(normalized.remoteJid, normalized.text, replyText, { name: child.name, id: child.id });
    }
    // 5. Educational / General AI Q&A (Phase 13)
    else if (/(photosynthesis|explain|math formula|essay|science concept|definition)/i.test(normalized.text) && !/(fee|attendance|student|staff)/i.test(normalized.text)) {
      toolName = "academic.ai_tutor";
      executionSource = "DeepSeek AI Tutor";
      const aiRes = await deepseekClient.ask(`Explain clearly and concisely for school students: ${normalized.text}`, "You are an encouraging and clear school teacher at ASSPS.");
      replyText = aiRes.ok ? aiRes.content.slice(0, 1000) : "Sir, is topic ki explanation abhi available nahi hai.";
    }
    // 6. Authoritative School SaaS Execution via proven Tool Engine (Phases 10, 18, 19, 28, 29)
    else {
      const res = await executeSchoolIntent(effectiveQuery);
      toolName = res.tool || res.intent || res.n8nExecution?.action || "school.execute";
      executionSource = res.source || "Live School SaaS";
      replyText = res.response;
      saasData = res.data;

      // Retain resolved student in context if applicable
      const resolvedName = res.data?.resolvedStudent?.name || 
                           (res.data?.challans && res.data.challans[0]?.name) || 
                           (res.data?.results && res.data.results[0]?.name) || 
                           (res.data?.close_matches && res.data.close_matches[0]?.name) ||
                           res.data?.name || 
                           res.data?.student_name;

      if (resolvedName) {
        this.contextStore.addTurn(normalized.remoteJid, normalized.text, replyText, { name: resolvedName, id: res.data?.studentId });
      } else {
        this.contextStore.addTurn(normalized.remoteJid, normalized.text, replyText);
      }
    }

    // G. Outbound Dispatch (Phase 21)
    let sendStatus = "PREPARED_FOR_GATEWAY";
    if (options.directSend && this.gateway && typeof this.gateway.sendText === 'function') {
      try {
        await this.gateway.sendText(normalized.remoteJid, replyText);
        sendStatus = "SENT";
      } catch (err) {
        sendStatus = `SEND_FAILED: ${err.message}`;
      }
    }

    const durationMs = Date.now() - startTime;

    // H. Mission Telemetry Report (Phase 30)
    const missionReport = {
      missionId,
      whatsappMessageId: normalized.messageId,
      sender: normalized.fromNumber,
      remoteJid: normalized.remoteJid,
      role: userRole.role,
      userLabel: userRole.label,
      query: normalized.text,
      effectiveQuery,
      intent: toolName,
      tool: toolName,
      source: executionSource,
      durationMs,
      sendStatus,
      replyText,
      saasData
    };

    this.missions.set(missionId, missionReport);
    return missionReport;
  }
}

export const whatsAppPipeline = new WhatsAppEventPipeline();
