/**
 * JARVIS ARGUS — Channel Authorization & Domain Firewall Guard
 *
 * Enforces strict channel authorization and domain isolation.
 * Restricts all market intelligence, trading research, and alerts
 * exclusively to Canonical Owner (+92 300 1291959 / 923001291959).
 *
 * INVARIANTS:
 * - OWNER_MARKET_ACCESS = ALLOW
 * - ADMIN_MARKET_ACCESS = DENY
 * - PUBLIC_MARKET_ACCESS = DENY
 * - TEACHER_MARKET_ACCESS = DENY
 * - PARENT_MARKET_ACCESS = DENY
 * - UNKNOWN_MARKET_ACCESS = DENY
 * - NON_OWNER_ARGUS_INVOCATIONS = 0
 * - MARKET_NOTIFICATION_RECIPIENT = 923001291959
 */

export const CANONICAL_OWNER_E164 = '923001291959';
export const CANONICAL_OWNER_DISPLAY = '+92 300 1291959';
export const MARKET_NOTIFICATION_RECIPIENT = '923001291959';
export const ADMIN_PHONE_E164 = '923069545996';

export const MARKET_ACCESS_DECISION = {
  ALLOW: 'ALLOW',
  DENY: 'DENY'
};

export const USER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  PUBLIC: 'PUBLIC',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Robust phone number normalizer resolving all equivalent phone representations
 * to standard E.164 digits without symbols.
 *
 * Handles:
 * - '03001291959' -> '923001291959'
 * - '+92 300 1291959' -> '923001291959'
 * - '+923001291959' -> '923001291959'
 * - 'whatsapp:+923001291959' -> '923001291959'
 * - 'whatsapp:03001291959' -> '923001291959'
 * - '3001291959' (10-digit starting with 3) -> '923001291959'
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim();

  // Strip 'whatsapp:' or 'tel:' protocol prefix
  if (/^(?:whatsapp|tel):/i.test(str)) {
    str = str.replace(/^(?:whatsapp|tel):/i, '').trim();
  }

  // Extract all digit characters
  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // Strip international 00 prefix
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Pakistan local 11-digit format starting with 0: e.g. 03001291959 -> 923001291959
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }

  // 10-digit format starting with 3 (missing country code & leading zero): e.g. 3001291959 -> 923001291959
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`;
  }

  return digits;
}

/**
 * Resolves user role based on normalized phone number.
 */
export function resolveUserRole(rawPhone) {
  const norm = normalizePhoneNumber(rawPhone);
  if (!norm) return USER_ROLES.UNKNOWN;

  if (norm === CANONICAL_OWNER_E164) return USER_ROLES.OWNER;
  if (norm === ADMIN_PHONE_E164) return USER_ROLES.ADMIN;
  if (norm.includes('770001')) return USER_ROLES.TEACHER;
  if (norm.includes('770002')) return USER_ROLES.PARENT;

  return USER_ROLES.PUBLIC;
}

/**
 * Checks whether a given phone number is authorized to access the canonical OWNER role.
 */
export function isOwner(rawPhone) {
  return normalizePhoneNumber(rawPhone) === CANONICAL_OWNER_E164;
}

/**
 * Validates whether the caller has authorization to access the ARGUS Market Intelligence domain.
 */
export function checkMarketAccess(rawPhone) {
  const normalized = normalizePhoneNumber(rawPhone);
  const role = resolveUserRole(rawPhone);

  if (role === USER_ROLES.OWNER) {
    return {
      allowed: true,
      decision: MARKET_ACCESS_DECISION.ALLOW,
      role: USER_ROLES.OWNER,
      normalizedPhone: normalized,
      reason: 'CANONICAL_OWNER_AUTHORIZED'
    };
  }

  return {
    allowed: false,
    decision: MARKET_ACCESS_DECISION.DENY,
    role,
    normalizedPhone: normalized,
    reason: `MARKET_ACCESS_DENIED_FOR_${role}`
  };
}

/**
 * Generates an authorized scope restriction message keeping non-owners
 * strictly within the school administration assistant boundary.
 */
export function formatScopeRestrictionResponse(language = 'ROMAN_URDU') {
  if (language === 'URDU_SCRIPT') {
    return 'میں ایپکس گرائمر اسکول کا انتظامی اسسٹنٹ ہوں۔ میں صرف اسکول کے امور (داخلے، فیس، حاضری، اور طلباء کے ریکارڈ) میں رہنمائی کر سکتا ہوں۔ مارکیٹ اور ٹریڈنگ کا ڈیٹا اس چینل پر مجاز نہیں ہے۔';
  }
  if (language === 'ENGLISH') {
    return 'I am the Apex Grammar School administrative assistant. I am authorized to assist exclusively with school operations (students, fees, attendance, and admissions). Market and trading intelligence is strictly restricted to authorized channels.';
  }
  return 'Main Apex Grammar School ka administrative assistant hoon. Main sirf school ke umoor (students, fees, attendance, aur admissions) mein madad kar sakta hoon. Market ya trading analysis is channel par authorized nahi hai.';
}

export function validateMarketAlertRecipient(rawPhone) {
  return normalizePhoneNumber(rawPhone) === MARKET_NOTIFICATION_RECIPIENT;
}

export const formatSchoolDomainRestriction = formatScopeRestrictionResponse;

export const argusChannelGuard = {
  CANONICAL_OWNER_E164,
  CANONICAL_OWNER_DISPLAY,
  MARKET_NOTIFICATION_RECIPIENT,
  ADMIN_PHONE_E164,
  MARKET_ACCESS_DECISION,
  USER_ROLES,
  normalizePhoneNumber,
  resolveUserRole,
  isOwner,
  checkMarketAccess,
  formatScopeRestrictionResponse,
  formatSchoolDomainRestriction,
  validateMarketAlertRecipient
};
