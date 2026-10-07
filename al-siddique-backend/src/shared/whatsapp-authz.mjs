/**
 * JARVIS Production 2.0 — WhatsApp Identity & Privacy Authorization Gate
 *
 * Enforces strict E.164 normalization, zero fuzzy matching, and deterministic
 * child-scope RBAC isolation across parents, teachers, owners, and public users.
 */

import { schoolConnector } from './school-connector.mjs';

export function normalizeE164(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return digits;
}

export function resolveGuardianByPhone(phone) {
  const normPhone = normalizeE164(phone);
  if (!normPhone) {
    return {
      guardian_id: null,
      normalized_phone: '',
      linked_students: [],
      relationship_source: 'NONE',
      verification_status: 'UNREGISTERED'
    };
  }

  try {
    const db = schoolConnector.getSchoolDb();
    const studentRows = db.prepare("SELECT s.id, s.name, s.roll_no, s.father_name, s.phone, c.name as class_name, c.section FROM students s JOIN classes c ON c.id = s.class_id WHERE REPLACE(REPLACE(REPLACE(s.phone, '+', ''), '-', ''), ' ', '') LIKE ?").all(`%${normPhone.slice(-10)}%`);
    const matchedStudents = studentRows.filter(s => normalizeE164(s.phone) === normPhone);

    if (matchedStudents.length > 0) {
      return {
        guardian_id: `GRD-${normPhone}`,
        normalized_phone: normPhone,
        guardian_name: matchedStudents[0].father_name || 'Verified Guardian',
        linked_students: matchedStudents.map(s => ({
          id: s.id,
          name: s.name,
          roll_no: s.roll_no,
          className: `${s.class_name}-${s.section}`,
          fatherName: s.father_name
        })),
        relationship_source: 'AUTHORITATIVE_SCHOOL_DB',
        verification_status: 'VERIFIED_GUARDIAN'
      };
    }
  } catch {}

  return {
    guardian_id: null,
    normalized_phone: normPhone,
    linked_students: [],
    relationship_source: 'NONE',
    verification_status: 'UNREGISTERED'
  };
}

export function resolveWhatsAppIdentity(senderPhone) {
  const normPhone = normalizeE164(senderPhone);
  if (!normPhone) {
    return { role: 'public', senderNumber: '', verifiedStudentIds: [], verifiedStudents: [] };
  }

  // 1. Owner / Admin Allowlist Check
  const envCommanders = String(process.env.JARVIS_WHATSAPP_COMMANDERS || "")
    .split(",")
    .map(normalizeE164)
    .filter(Boolean);
  const defaultOwner = normalizeE164(process.env.SCHOOL_OFFICIAL_PHONE || "923069545996");
  const ownerList = new Set([defaultOwner, ...envCommanders]);

  if (ownerList.has(normPhone)) {
    return {
      role: 'owner',
      senderNumber: normPhone,
      name: 'Executive Owner / Admin',
      verifiedStudentIds: [],
      verifiedStudents: []
    };
  }

  try {
    const db = schoolConnector.getSchoolDb();

    // 2. Active Staff / Teacher Check
    const teacher = db.prepare("SELECT id, name, email, role FROM users WHERE role='teacher' AND (REPLACE(REPLACE(phone, '-', ''), ' ', '') = ? OR REPLACE(REPLACE(email, '-', ''), ' ', '') = ?) LIMIT 1").get(normPhone, normPhone);
    if (teacher) {
      return {
        role: 'teacher',
        senderNumber: normPhone,
        name: teacher.name,
        teacherId: teacher.id,
        verifiedStudentIds: [],
        verifiedStudents: []
      };
    }

    // 3. Registered Guardian / Parent Exact Match
    // Search students with exact parent contact phone
    const studentRows = db.prepare("SELECT s.id, s.name, s.roll_no, s.father_name, s.phone, c.name as class_name, c.section FROM students s JOIN classes c ON c.id = s.class_id WHERE REPLACE(REPLACE(REPLACE(s.phone, '+', ''), '-', ''), ' ', '') LIKE ?").all(`%${normPhone.slice(-10)}%`);

    const matchedStudents = studentRows.filter(s => normalizeE164(s.phone) === normPhone);
 if (matchedStudents.length > 0) {
 return {
 role: 'parent',
 senderNumber: normPhone,
 name: matchedStudents[0].father_name || 'Verified Guardian',
 verifiedStudentIds: matchedStudents.map(s => s.id),
 verifiedStudents: matchedStudents
 };
 }
 } catch (e) {
 // Fail safe to public
 }

 // 4. Default Public User
 return {
 role: 'public',
 senderNumber: normPhone,
 name: 'Public Inquirer',
 verifiedStudentIds: [],
 verifiedStudents: []
 };
}

export function authorizeWhatsAppCapability({ role, capability, requestedStudentId = null, verifiedStudentIds = [] }) {
 // Public capabilities — allowed for anyone
 const publicCapabilities = new Set([
 'school.get_admissions_summary',
 'school.submit_admission_inquiry',
 'school.submit_complaint',
 'school.request_human_escalation',
 'school.get_public_info',
 'system.conversation'
 ]);

 if (publicCapabilities.has(capability)) {
 return { allow: true, reasonCode: 'PUBLIC_PERMITTED' };
 }

 // Owner / Admin has full administrative read access
 if (role === 'owner' || role === 'admin') {
 return { allow: true, reasonCode: 'OWNER_PERMITTED' };
 }

 // Public users are strictly forbidden from accessing private individual or financial data
 if (role === 'public') {
 return {
 allow: false,
 reasonCode: 'UNVERIFIED_PUBLIC_DENIED',
 safeUserMessage: "Main yeh maloomat sirf verified parents ya school staff ko provide kar sakta hoon. Apne WhatsApp number ko school record se link karwane ke liye school office se rabta karein."
 };
 }

 // Parent / Guardian Child-Scope Enforcement
 if (role === 'parent') {
 const parentAllowedCapabilities = new Set([
 'school.get_student_fee',
 'school.get_student_fee_history',
 'school.get_student_attendance',
 'school.get_results',
 'school.get_timetable'
 ]);

 if (!parentAllowedCapabilities.has(capability)) {
 return {
 allow: false,
 reasonCode: 'PARENT_RBAC_FORBIDDEN',
 safeUserMessage: "Yeh operational report sirf school administration ke liye makhsoos hai."
 };
 }

 if (requestedStudentId && !verifiedStudentIds.includes(Number(requestedStudentId))) {
 return {
 allow: false,
 reasonCode: 'PARENT_CHILD_SCOPE_VIOLATION',
 safeUserMessage: "Aap sirf apne registered bachon ka record dekh sakte hain. Kisi aur talib-e-ilm ka record dekhnay ki ijazat nahi hai."
 };
 }

 return { allow: true, reasonCode: 'PARENT_CHILD_PERMITTED' };
 }

 // Teacher RBAC Enforcement
 if (role === 'teacher') {
 const teacherAllowed = new Set([
 'school.get_timetable',
 'school.get_class_attendance',
 'school.get_class_strength',
 'school.get_assessments'
 ]);
 if (teacherAllowed.has(capability)) {
 return { allow: true, reasonCode: 'TEACHER_PERMITTED' };
 }
 return {
 allow: false,
 reasonCode: 'TEACHER_FINANCIAL_FORBIDDEN',
 safeUserMessage: "Financial aur individual fee records dekhnay ke liye administrative access darkar hai."
 };
 }

 return {
 allow: false,
 reasonCode: 'DEFAULT_DENIED',
 safeUserMessage: "Is action ki ijazat nahi hai."
 };
}

export function authorizeStudentAccess(actor, studentId, capability) {
  const { role, verifiedStudentIds = [] } = actor || {};
  return authorizeWhatsAppCapability({
    role: role || 'public',
    capability,
    requestedStudentId: studentId,
    verifiedStudentIds
  });
}
