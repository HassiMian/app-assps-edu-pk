/**
 * JARVIS Production 3.0 — Desktop Security & Risk Policy
 * 
 * Enforces strict Windows execution boundaries, filesystem access allowlists,
 * binary execution allowlists, command injection prevention, and user intervention triggers.
 */

import path from 'node:path';
import { RiskTier } from './risk-approval-engine.mjs';

const ALLOWED_APP_BINARIES = new Set([
  'notepad.exe',
  'notepad',
  'calc.exe',
  'calc',
  'calculatorApp.exe',
  'calculator',
  'explorer.exe',
  'explorer',
  'cmd.exe',
  'powershell.exe',
  'msedge.exe'
]);

const SENSITIVE_FILE_PATTERNS = [
  /^\.env/i,
  /\.key$/i,
  /\.pem$/i,
  /id_rsa/i,
  /credentials\.json/i,
  /password/i,
  /secret/i,
  /token/i
];

const FORBIDDEN_ROOT_DIRS = [
  'c:\\windows\\system32',
  'c:\\windows\\syswow64',
  'c:\\windows',
  'c:\\program files',
  'c:\\program files (x86)',
  'c:\\users\\default'
];

export class DesktopSecurityPolicy {
  /**
   * 1. Validate Target Application Binary
   */
  static validateAppLaunch(appName) {
    if (!appName || typeof appName !== 'string') {
      return { allowed: false, error: 'App name required for launch.' };
    }

    const baseName = path.basename(appName).toLowerCase();
    
    // Check for command injection in appName
    if (/[&|;`$><]/.test(appName)) {
      return { allowed: false, error: 'Command chaining or injection characters detected in app name.' };
    }

    const isAllowed = ALLOWED_APP_BINARIES.has(baseName) || ALLOWED_APP_BINARIES.has(baseName.replace(/\.exe$/, ''));
    if (!isAllowed) {
      return {
        allowed: false,
        error: `Application '${appName}' is not in the authorized desktop application allowlist.`
      };
    }

    return { allowed: true, baseName };
  }

  /**
   * 2. Validate Filesystem Operation Path
   */
  static validateFilePath(targetPath, isWrite = false) {
    if (!targetPath || typeof targetPath !== 'string') {
      return { allowed: false, error: 'Target file path must be a non-empty string.' };
    }

    // Check for path traversal or malicious injection
    if (/[|;`$><]/.test(targetPath)) {
      return { allowed: false, error: 'Malicious characters detected in file path.' };
    }

    const resolved = path.resolve(targetPath);
    const lower = resolved.toLowerCase();

    // Block Windows system directories
    for (const forbidden of FORBIDDEN_ROOT_DIRS) {
      if (lower.startsWith(forbidden)) {
        return {
          allowed: false,
          error: `Access to Windows system directory '${forbidden}' is strictly blocked.`
        };
      }
    }

    // Block browser profile credential store direct paths
    if (lower.includes('\\microsoft\\edge\\user data') || lower.includes('\\google\\chrome\\user data')) {
      return {
        allowed: false,
        error: `Direct filesystem access to personal browser profile stores is strictly forbidden.`
      };
    }

    // Check sensitive file patterns
    const base = path.basename(resolved).toLowerCase();
    for (const pattern of SENSITIVE_FILE_PATTERNS) {
      if (pattern.test(base)) {
        return {
          allowed: false,
          error: `Access to sensitive credential/key file '${base}' is strictly blocked.`
        };
      }
    }

    // Must be inside workspace, runtime, temp, or user desktop/documents
    const cwd = process.cwd().toLowerCase();
    const temp = path.resolve(process.env.TEMP || process.env.TMP || '/tmp').toLowerCase();
    const userProfile = path.resolve(process.env.USERPROFILE || 'C:\\Users\\Default').toLowerCase();

    const isInsideAllowedTree = lower.startsWith(cwd) || lower.startsWith(temp) || lower.startsWith(userProfile);
    if (!isInsideAllowedTree) {
      return {
        allowed: false,
        error: `Path '${resolved}' is outside permitted workspace/user boundaries.`
      };
    }

    return { allowed: true, resolvedPath: resolved };
  }

  /**
   * 3. Evaluate Semantic Risk Tier for Desktop Action
   */
  static evaluateActionRisk(action = {}) {
    const type = String(action.type || '').toLowerCase();
    const target = String(action.target || action.appName || action.filePath || '').toLowerCase();
    const text = String(action.text || action.value || '').toLowerCase();
    const combined = `${type} ${target} ${text}`;

    // Destructive operations
    if (type === 'files.delete' || type === 'files.overwrite' || /(delete|remove|format|erase|destroy|kill|uninstall)/i.test(combined)) {
      return RiskTier.DESTRUCTIVE;
    }

    // Financial actions
    if (/(pay|checkout|transfer|credit card|billing|purchase|buy)/i.test(combined)) {
      return RiskTier.FINANCIAL;
    }

    // External communication / publication
    if (/(send whatsapp|send email|post|tweet|publish|broadcast)/i.test(combined)) {
      return RiskTier.EXTERNAL_COMMUNICATION;
    }

    // Read-only inspection
    if (type === 'desktop.screenshot' || type === 'desktop.list_windows' || type === 'desktop.get_active_window' ||
        type === 'desktop.inspect_ui' || type === 'desktop.find_element' || type === 'files.list' ||
        type === 'files.search' || type === 'files.inspect') {
      return RiskTier.READ_ONLY;
    }

    // Low-risk interactive writes
    return RiskTier.LOW_RISK_WRITE;
  }

  /**
   * 4. Check for User-Only Intervention Triggers (Password/OTP/2FA/CAPTCHA)
   */
  static checkInterventionRequired(action = {}) {
    const text = String(action.text || action.value || action.target || '').toLowerCase();
    
    if (/(password|passwd|pin code)/i.test(text)) {
      return {
        required: true,
        reason: 'USER_INTERVENTION_PASSWORD',
        prompt: 'Password input detected. Automation paused for manual verification.'
      };
    }

    if (/(2fa|otp|one-time password|verification code)/i.test(text)) {
      return {
        required: true,
        reason: 'USER_INTERVENTION_OTP',
        prompt: 'Two-factor authentication code detected. Automation paused for user verification.'
      };
    }

    if (/(credit card|card number|cvv|security code|iban)/i.test(text)) {
      return {
        required: true,
        reason: 'USER_INTERVENTION_FINANCIAL',
        prompt: 'Financial credentials detected. Automation paused for user entry.'
      };
    }

    return { required: false };
  }

  /**
   * 5. Validate Shell / Command String Against Injection & Chaining
   */
  static validateShellCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') {
      return { allowed: false, error: 'Command must be a non-empty string.' };
    }

    // Reject command injection chaining tokens
    if (/[&|;`$]/.test(cmd)) {
      return {
        allowed: false,
        error: 'Command chaining or subshell expansion tokens (&, &&, |, ||, ;, `, $) are forbidden.'
      };
    }

    // Reject PowerShell encoded command switches
    if (/-(enc|encodedcommand|e)\b/i.test(cmd)) {
      return {
        allowed: false,
        error: 'PowerShell encoded command execution is forbidden.'
      };
    }

    // Extract root executable
    const rootExec = cmd.trim().split(/\s+/)[0].replace(/['"]/g, '');
    const baseExec = path.basename(rootExec).toLowerCase();

    if (!ALLOWED_APP_BINARIES.has(baseExec) && !ALLOWED_APP_BINARIES.has(baseExec.replace(/\.exe$/, ''))) {
      return {
        allowed: false,
        error: `Executable '${baseExec}' is not in the authorized binary allowlist.`
      };
    }

    return { allowed: true, rootExec: baseExec };
  }
}
