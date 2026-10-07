/**
 * JARVIS Production 3.0 — Browser Security & Risk Policy
 * 
 * Enforces URL safety boundaries, SSRF prevention, dynamic semantic risk evaluation,
 * user intervention triggers (2FA/OTP/Passwords), and file upload policy.
 */

import path from 'node:path';
import { RiskTier } from './risk-approval-engine.mjs';

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

const BLOCKED_SCHEMES = new Set([
  'file:',
  'javascript:',
  'data:',
  'vbscript:',
  'edge:',
  'chrome:',
  'about:',
  'view-source:'
]);

const SENSITIVE_INTERVENTION_KEYWORDS = [
  'password',
  'passwd',
  'current-password',
  'new-password',
  '2fa',
  'otp',
  'one-time password',
  'two-factor',
  'verification code',
  'authenticator',
  'captcha',
  'recaptcha',
  'hcaptcha',
  'credit card',
  'card number',
  'cvv',
  'security code',
  'expiry date',
  'bank account',
  'iban',
  'pin code'
];

export class BrowserSecurityPolicy {
  /**
   * 1. Validate Navigation URL
   */
  static validateUrl(rawUrl, allowLocalhost = false) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { allowed: false, reason: 'INVALID_URL', error: 'URL must be a non-empty string' };
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { allowed: false, reason: 'MALFORMED_URL', error: 'Unable to parse URL' };
    }

    if (BLOCKED_SCHEMES.has(parsed.protocol.toLowerCase())) {
      return {
        allowed: false,
        reason: 'BLOCKED_PROTOCOL',
        error: `Protocol '${parsed.protocol}' is forbidden by browser security policy.`
      };
    }

    if (!ALLOWED_SCHEMES.has(parsed.protocol.toLowerCase())) {
      return {
        allowed: false,
        reason: 'UNSUPPORTED_PROTOCOL',
        error: `Only HTTP and HTTPS protocols are permitted.`
      };
    }

    const host = parsed.hostname.toLowerCase();

    // Prevent SSRF: block local loopback and internal RFC1918 unless explicitly allowlisted
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(host);

    if ((isLocal || isPrivate) && !allowLocalhost) {
      // Check if explicit testing or port 8787/8791 is allowed
      if (process.env.NODE_ENV !== 'test' && !process.env.JARVIS_ALLOW_LOCAL_BROWSER) {
        return {
          allowed: false,
          reason: 'LOCAL_NETWORK_RESTRICTED',
          error: `Navigation to local/private network address '${host}' is blocked to prevent SSRF.`
        };
      }
    }

    // Block sensitive internal settings
    if (parsed.pathname.includes('/settings/passwords') || parsed.pathname.includes('/chrome/settings')) {
      return {
        allowed: false,
        reason: 'CREDENTIAL_PAGE_FORBIDDEN',
        error: `Navigation to browser credential management pages is forbidden.`
      };
    }

    return { allowed: true, url: parsed.toString() };
  }

  /**
   * 2. Detect User Intervention Triggers (Password, OTP, CAPTCHA, Payment)
   */
  static checkInterventionRequired(elementInfo = {}) {
    const text = String(elementInfo.text || elementInfo.label || elementInfo.placeholder || elementInfo.name || '').toLowerCase();
    const type = String(elementInfo.type || elementInfo.inputType || '').toLowerCase();
    const id = String(elementInfo.id || elementInfo.className || '').toLowerCase();
    const combined = `${text} ${type} ${id}`;

    if (type === 'password') {
      return {
        required: true,
        reason: 'PASSWORD_ENTRY_REQUIRED',
        prompt: 'Password input detected. Automation paused for manual user authentication.'
      };
    }

    for (const kw of SENSITIVE_INTERVENTION_KEYWORDS) {
      if (combined.includes(kw)) {
        return {
          required: true,
          reason: `USER_INTERVENTION_${kw.toUpperCase().replace(/\s+/g, '_')}`,
          prompt: `Sensitive user input (${kw}) detected. Automation paused for manual verification.`
        };
      }
    }

    return { required: false };
  }

  /**
   * 3. Dynamic Semantic Risk Evaluation for Browser Actions
   */
  static evaluateActionRisk(action = {}) {
    const type = String(action.type || '').toLowerCase();
    const target = String(action.target || action.selector || action.value || '').toLowerCase();
    const text = String(action.text || action.buttonText || '').toLowerCase();
    const combined = `${type} ${target} ${text}`;

    if (/(pay|checkout|purchase|transfer|send money|confirm payment|confirm order|card|billing|buy)/i.test(combined)) {
      return RiskTier.FINANCIAL;
    }

    if (/(delete|remove user|drop database|wipe data|destroy|terminate service|erase)/i.test(combined)) {
      return RiskTier.DESTRUCTIVE;
    }

    if (/(send message|send sms|send whatsapp|email blast|broadcast|notify parents|notification)/i.test(combined)) {
      return RiskTier.EXTERNAL_COMMUNICATION;
    }

    if (/(publish|post to facebook|tweet|announcement|release notice)/i.test(combined)) {
      return RiskTier.PUBLICATION;
    }

    if (type === 'type' || type === 'click' || type === 'submit') {
      return RiskTier.LOW_RISK_WRITE;
    }

    return RiskTier.READ_ONLY;
  }

  /**
   * 4. Validate File Upload Path
   */
  static validateUploadPath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return { allowed: false, error: 'File path required for upload.' };
    }

    const resolved = path.resolve(filePath);
    const cwd = process.cwd();
    const tmp = path.resolve(process.env.TEMP || process.env.TMP || '/tmp');

    // Must be inside workspace, runtime, or temp directory
    const isAllowedDir = resolved.startsWith(cwd) || resolved.startsWith(tmp);
    if (!isAllowedDir) {
      return {
        allowed: false,
        error: `File upload path '${resolved}' is outside authorized directories.`
      };
    }

    // Do not permit uploading sensitive credentials, .env, or private keys
    const base = path.basename(resolved).toLowerCase();
    if (base.startsWith('.env') || base.endsWith('.key') || base.endsWith('.pem') || base.includes('id_rsa')) {
      return {
        allowed: false,
        error: `Uploading credential/private key files is strictly forbidden.`
      };
    }

    return { allowed: true, resolvedPath: resolved };
  }
}
