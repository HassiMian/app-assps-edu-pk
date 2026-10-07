/**
 * JARVIS ARGUS — Channel Authorization & Domain Firewall Guard (CommonJS)
 */
'use strict';

const CANONICAL_OWNER_E164 = '923001291959';
const CANONICAL_OWNER_DISPLAY = '+92 300 1291959';
const MARKET_NOTIFICATION_RECIPIENT = '923001291959';
const ADMIN_PHONE_E164 = '923069545996';

const MARKET_ACCESS_DECISION = {
  ALLOW: 'ALLOW',
  DENY: 'DENY'
};

const USER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  PUBLIC: 'PUBLIC',
  UNKNOWN: 'UNKNOWN'
};

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim();

  if (/^(?:whatsapp|tel):/i.test(str)) {
    str = str.replace(/^(?:whatsapp|tel):/i, '').trim();
  }

  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`;
  }

  return digits;
}

function resolveUserRole(rawPhone) {
  const norm = normalizePhoneNumber(rawPhone);
  if (!norm) return USER_ROLES.UNKNOWN;

  if (norm === CANONICAL_OWNER_E164) return USER_ROLES.OWNER;
  if (norm === ADMIN_PHONE_E164) return USER_ROLES.ADMIN;
  if (norm.includes('770001')) return USER_ROLES.TEACHER;
  if (norm.includes('770002')) return USER_ROLES.PARENT;

  return USER_ROLES.PUBLIC;
}

function isOwner(rawPhone) {
  return normalizePhoneNumber(rawPhone) === CANONICAL_OWNER_E164;
}

function checkMarketAccess(rawPhone) {
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

function formatScopeRestrictionResponse(language = 'ROMAN_URDU') {
  if (language === 'URDU_SCRIPT') {
    return 'میں ایپکس گرائمر اسکول کا انتظامی اسسٹنٹ ہوں۔ میں صرف اسکول کے امور (داخلے، فیس، حاضری، اور طلباء کے ریکارڈ) میں رہنمائی کر سکتا ہوں۔ مارکیٹ اور ٹریڈنگ کا ڈیٹا اس چینل پر مجاز نہیں ہے۔';
  }
  if (language === 'ENGLISH') {
    return 'I am the Apex Grammar School administrative assistant. I am authorized to assist exclusively with school operations (students, fees, attendance, and admissions). Market and trading intelligence is strictly restricted to authorized channels.';
  }
  return 'Main Apex Grammar School ka administrative assistant hoon. Main sirf school ke umoor (students, fees, attendance, aur admissions) mein madad kar sakta hoon. Market ya trading analysis is channel par authorized nahi hai.';
}

function validateMarketAlertRecipient(rawPhone) {
  return normalizePhoneNumber(rawPhone) === MARKET_NOTIFICATION_RECIPIENT;
}

const formatSchoolDomainRestriction = formatScopeRestrictionResponse;

const argusChannelGuard = {
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

module.exports = {
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
  validateMarketAlertRecipient,
  argusChannelGuard
};
