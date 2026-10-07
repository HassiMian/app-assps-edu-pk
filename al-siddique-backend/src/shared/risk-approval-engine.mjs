/**
 * JARVIS Production 2.0 — Risk Assessment & Approval Engine
 *
 * Classifies operational commands into 7 strict risk tiers and enforces
 * formal authorization / approval boundaries before high-impact execution.
 */

export const RiskTier = Object.freeze({
  READ_ONLY: 'READ_ONLY',
  LOW_RISK_WRITE: 'LOW_RISK_WRITE',
  SENSITIVE_WRITE: 'SENSITIVE_WRITE',
  FINANCIAL: 'FINANCIAL',
  PUBLICATION: 'PUBLICATION',
  DESTRUCTIVE: 'DESTRUCTIVE',
  EXTERNAL_COMMUNICATION: 'EXTERNAL_COMMUNICATION'
});

export const RiskScores = Object.freeze({
  [RiskTier.READ_ONLY]: 1,
  [RiskTier.LOW_RISK_WRITE]: 2,
  [RiskTier.SENSITIVE_WRITE]: 3,
  [RiskTier.FINANCIAL]: 3,
  [RiskTier.PUBLICATION]: 3,
  [RiskTier.DESTRUCTIVE]: 3,
  [RiskTier.EXTERNAL_COMMUNICATION]: 3
});

export class RiskApprovalEngine {
  constructor(options = {}) {
    this.approvalStore = options.approvalStore || null;
  }

  /**
   * Classify risk level of command / intent
   */
  evaluateRisk(command, domain = 'school', intent = null) {
    const s = String(command || '').toLowerCase();
    const intentStr = String(intent || '').toLowerCase();

    // 1. Destructive actions
    if (/\b(delete|drop\s*table|remove\s*all|purge|truncate|format|destroy|hata\s*do|mita\s*do)\b/i.test(s) ||
        intentStr.includes('delete') || intentStr.includes('purge')) {
      return {
        tier: RiskTier.DESTRUCTIVE,
        score: RiskScores[RiskTier.DESTRUCTIVE],
        requiresApproval: true,
        reason: 'Operation involves permanent data deletion or destructive modifications.'
      };
    }

    // 2. Financial modifications
    if (/\b(record\s*payment|discount\s*do|concession|fee\s*adjust|refund|payment\s*entry|choot\s*do)\b/i.test(s) &&
        !/\b(summary|kitni|collection|recovery|defaulter|balance|pending)\b/i.test(s)) {
      return {
        tier: RiskTier.FINANCIAL,
        score: RiskScores[RiskTier.FINANCIAL],
        requiresApproval: true,
        reason: 'Operation impacts school financial balances or records payment concessions.'
      };
    }

    // 3. External communications (WhatsApp / SMS)
    if (/\b(send\s*whatsapp|whatsapp|send\s*sms|sms\s*karo|message\s*bhejo|message\s*bhej|bhejo\s*message|broadcast)\b/i.test(s) ||
        intentStr.includes('send_message') || intentStr.includes('send_notification')) {
      return {
        tier: RiskTier.EXTERNAL_COMMUNICATION,
        score: RiskScores[RiskTier.EXTERNAL_COMMUNICATION],
        requiresApproval: true,
        reason: 'Operation broadcasts external notifications/messages to parents or teachers.'
      };
    }

    // 4. Public social / marketing publication
    if (/\b(publish|post\s*to\s*facebook|facebook\s*pe\s*post|live\s*campaign|run\s*ad)\b/i.test(s) ||
        intentStr.includes('publish')) {
      return {
        tier: RiskTier.PUBLICATION,
        score: RiskScores[RiskTier.PUBLICATION],
        requiresApproval: true,
        reason: 'Operation creates public external publications or live marketing spend.'
      };
    }

    // 5. Sensitive database writes
    if (/\b(update\s*student|change\s*name|edit\s*record|admission\s*create|nayi\s*entry|tabdeeli)\b/i.test(s) ||
        intentStr.includes('update_student') || intentStr.includes('create_student')) {
      return {
        tier: RiskTier.SENSITIVE_WRITE,
        score: RiskScores[RiskTier.SENSITIVE_WRITE],
        requiresApproval: true,
        reason: 'Operation mutates official school student or academic records.'
      };
    }

    // 6. Low risk write (local notes, draft documents)
    if (/\b(draft|generate\s*diary|lesson\s*plan|create\s*paper|tayyar\s*karo|banao)\b/i.test(s)) {
      return {
        tier: RiskTier.LOW_RISK_WRITE,
        score: RiskScores[RiskTier.LOW_RISK_WRITE],
        requiresApproval: false,
        reason: 'Operation generates local academic draft or non-destructive content.'
      };
    }

    // 7. Default Read Only
    return {
      tier: RiskTier.READ_ONLY,
      score: RiskScores[RiskTier.READ_ONLY],
      requiresApproval: false,
      reason: 'Operational read query with zero external side effects.'
    };
  }

  /**
   * Check authorization against caller role
   */
  authorizeRole(riskTier, callerRole = 'admin') {
    const role = String(callerRole || 'public').toLowerCase();

    // High impact actions cannot be initiated by public/unknown
    if (['public', 'unknown'].includes(role) && riskTier !== RiskTier.READ_ONLY) {
      return {
        authorized: false,
        reason: `Caller role "${role}" is not authorized for risk tier "${riskTier}".`
      };
    }

    // Parent restricted to read-only for their own child
    if (role === 'parent' && riskTier !== RiskTier.READ_ONLY) {
      return {
        authorized: false,
        reason: 'Parent accounts are strictly restricted to read-only authorized queries.'
      };
    }

    return { authorized: true, reason: 'Caller authorized' };
  }
}

export const riskApprovalEngine = new RiskApprovalEngine();
