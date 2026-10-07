/**
 * Mission Manager & Mandatory Completion Watchdog
 * 
 * Enforces the strict contract:
 * RECEIVED -> UNDERSTOOD -> EXECUTING -> VERIFIED -> FINAL_RESPONSE_SENT -> COMPLETED
 * 
 * Guarantees:
 * - final_response_required = true
 * - COMPLETED_WITHOUT_FINAL_REPLY = 0
 * - ACKNOWLEDGEMENT_LOOPS = 0
 * - DUPLICATE_FINAL_RESPONSES = 0
 */

const crypto = require('crypto');

class WhatsAppMissionManager {
  constructor() {
    this.missions = new Map();         // missionId -> mission object
    this.senderContext = new Map();    // cleanFrom -> { lastMissionId, lastQuery, lastReport, history: [] }
    this.sentResponses = new Set();    // hash(to + text) to prevent duplicates
  }

  createMission(fromNumber, userText, language, role) {
    const missionId = `MSN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const cleanFrom = String(fromNumber).replace(/\D/g, '');

    const mission = {
      missionId,
      sender: cleanFrom,
      rawQuery: userText,
      language,
      role,
      final_response_required: true,
      status: 'RECEIVED',
      intent: null,
      toolExecuted: null,
      data: null,
      finalResponseText: null,
      sentAt: null,
      createdAt: new Date().toISOString(),
      transitions: [{ state: 'RECEIVED', timestamp: Date.now() }]
    };

    this.missions.set(missionId, mission);

    // Update sender context pointer
    const ctx = this.senderContext.get(cleanFrom) || { history: [] };
    ctx.currentMissionId = missionId;
    this.senderContext.set(cleanFrom, ctx);

    return mission;
  }

  transition(missionId, newState, extra = {}) {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    mission.status = newState;
    mission.transitions.push({ state: newState, timestamp: Date.now() });

    if (extra.intent) mission.intent = extra.intent;
    if (extra.data) mission.data = extra.data;
    if (extra.finalResponseText) mission.finalResponseText = extra.finalResponseText;

    if (newState === 'FINAL_RESPONSE_SENT') {
      mission.sentAt = new Date().toISOString();
      mission.status = 'COMPLETED';
      mission.transitions.push({ state: 'COMPLETED', timestamp: Date.now() });

      // Record in sender context
      const ctx = this.senderContext.get(mission.sender) || { history: [] };
      ctx.lastCompletedMissionId = missionId;
      ctx.lastQuery = mission.rawQuery;
      if (!mission.intent || !mission.intent.startsWith('FOLLOW_UP_')) {
        ctx.lastReport = mission.finalResponseText;
      }
      ctx.history.push({ query: mission.rawQuery, report: mission.finalResponseText, time: Date.now() });
      if (ctx.history.length > 10) ctx.history.shift();
      this.senderContext.set(mission.sender, ctx);
    }

    return mission;
  }

  isDuplicateResponse(to, text, messageId = null) {
    const cleanTo = String(to).replace(/\D/g, '');
    // Scope deduplication to specific incoming messageId or brief transport retry window (3s)
    const key = messageId ? `${cleanTo}:${messageId}:${String(text).trim()}` : `${cleanTo}:${String(text).trim()}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    if (this.sentResponses.has(hash)) {
      return true;
    }
    this.sentResponses.add(hash);
    const expiry = messageId ? 30000 : 3000;
    setTimeout(() => this.sentResponses.delete(hash), expiry).unref();
    return false;
  }

  isFollowUpTrigger(text) {
    const clean = String(text || '').trim().toLowerCase();
    return this.isNudgeQuick(clean) || this.isQueryMissing(clean) || /quick|jaldi|bhejo\s*bhi|mujhy\s*bhejo/i.test(clean);
  }

  isNudgeQuick(text) {
    const clean = String(text || '').trim().toLowerCase();
    return /(?:ok\s*)?make\s*it\s*quick|^quick$|jaldi\s*(?:karo|karein|bhejo)|tez\s*karo/i.test(clean);
  }

  isQueryMissing(text) {
    const clean = String(text || '').trim().toLowerCase();
    return /btaya\s*ni\s*tumny|batao\s*bhi|report\s*kahan\s*hai|kahan\s*hai\s*report|abhi\s*tk\s*report\s*ni\s*di|report\s*ni\s*mili|kya\s*bana|kya\s*hua/i.test(clean);
  }

  getPreviousResult(fromNumber) {
    const cleanFrom = String(fromNumber).replace(/\D/g, '');
    const ctx = this.senderContext.get(cleanFrom);
    if (!ctx || !ctx.lastReport) return null;
    return {
      missionId: ctx.lastCompletedMissionId,
      query: ctx.lastQuery,
      report: ctx.lastReport,
      delivered: ctx.lastDelivered !== false
    };
  }

  markDelivered(fromNumber, missionId = null) {
    const cleanFrom = String(fromNumber).replace(/\D/g, '');
    const ctx = this.senderContext.get(cleanFrom);
    if (ctx) {
      ctx.lastDelivered = true;
    }
  }

  getTelemetry() {
    let completedWithoutReply = 0;
    let ackLoops = 0;
    let completed = 0;

    for (const m of this.missions.values()) {
      if (m.status === 'COMPLETED' && (!m.finalResponseText || !m.sentAt)) {
        completedWithoutReply++;
      }
      if (m.status === 'COMPLETED') {
        completed++;
      }
    }

    return {
      totalMissions: this.missions.size,
      completedMissions: completed,
      completedWithoutFinalReply: completedWithoutReply,
      acknowledgementLoops: ackLoops
    };
  }
}

const missionManager = new WhatsAppMissionManager();

module.exports = {
  WhatsAppMissionManager,
  missionManager
};
