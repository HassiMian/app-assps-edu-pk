/**
 * JARVIS 4.0 — Canonical Business Intent Ontology
 *
 * Defines semantic intents by business meaning, real-world effect, preconditions,
 * and verification contracts rather than surface phrasing.
 */

export const IntentCategory = {
  FINANCIAL: 'FINANCIAL',
  ACADEMIC: 'ACADEMIC',
  OPERATIONAL: 'OPERATIONAL',
  SYSTEM: 'SYSTEM',
  OPEN_DOMAIN: 'OPEN_DOMAIN'
};

export const Modality = {
  READ: 'READ',
  WRITE: 'WRITE',
  ACTION: 'ACTION',
  CONVERSATIONAL: 'CONVERSATIONAL'
};

export const RiskTier = {
  READ_ONLY: 'READ_ONLY',
  SENSITIVE_READ: 'SENSITIVE_READ',
  SENSITIVE_WRITE: 'SENSITIVE_WRITE',
  ADMIN_ACTION: 'ADMIN_ACTION'
};

export const CANONICAL_INTENTS = {
  RECORD_FEE_COLLECTION: {
    intentId: 'RECORD_FEE_COLLECTION',
    category: IntentCategory.FINANCIAL,
    modality: Modality.WRITE,
    riskTier: RiskTier.SENSITIVE_WRITE,
    description: 'Authorized staff confirms cash/manual fee payment has already been collected and commands school ledger update.',
    businessMeaning: 'Money collected by hand at school. Record payment on open fee challan and reduce remaining balance.',
    requiredEntities: ['student_reference'],
    optionalEntities: ['amount', 'payment_mode', 'challan_reference', 'notes'],
    defaultSemantics: {
      payment_mode: 'cash',
      payment_source: 'MANUAL_SCHOOL_COLLECTION',
      amount_rule: 'EXACT_OUTSTANDING_BALANCE_UNLESS_SPECIFIED'
    },
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['school.record_fee_payment'],
    preconditions: ['STUDENT_RESOLVED', 'OPEN_UNPAID_CHALLAN_EXISTS', 'ROLE_AUTHORIZED'],
    expectedEffects: ['CHALLAN_PAID_AMOUNT_INCREMENTED', 'REMAINING_BALANCE_DECREMENTED', 'CHALLAN_STATUS_UPDATED'],
    verificationContract: 'POST_WRITE_API_READBACK_PROVES_REMAINING_AND_PAID'
  },

  READ_STUDENT_FEE: {
    intentId: 'READ_STUDENT_FEE',
    category: IntentCategory.FINANCIAL,
    modality: Modality.READ,
    riskTier: RiskTier.SENSITIVE_READ,
    description: 'Inquire about student fee status, pending dues, monthly billing, or challan details.',
    businessMeaning: 'Read-only financial inquiry about a specific student or voucher.',
    requiredEntities: ['student_reference'],
    optionalEntities: ['month', 'year', 'class_name'],
    allowedRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT'],
    capabilities: ['school.get_student_fee'],
    preconditions: ['STUDENT_RESOLVED', 'PRIVACY_CHECK_PASSED'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_READ'
  },

  READ_OPEN_CHALLANS: {
    intentId: 'READ_OPEN_CHALLANS',
    category: IntentCategory.FINANCIAL,
    modality: Modality.READ,
    riskTier: RiskTier.SENSITIVE_READ,
    description: 'Retrieve pending or overdue fee vouchers across school, class, or student.',
    businessMeaning: 'Query outstanding billing vouchers that have not been settled.',
    requiredEntities: [],
    optionalEntities: ['class_name', 'month', 'year'],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['school.get_fee_defaulters', 'school.get_fee_summary'],
    preconditions: ['PRIVACY_CHECK_PASSED'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_READ'
  },

  READ_FEE_SUMMARY: {
    intentId: 'READ_FEE_SUMMARY',
    category: IntentCategory.FINANCIAL,
    modality: Modality.READ,
    riskTier: RiskTier.SENSITIVE_READ,
    description: 'Query overall school fee collection, total pending amount, and recovery rates.',
    businessMeaning: 'Macro financial performance summary of the school.',
    requiredEntities: [],
    optionalEntities: ['month', 'session'],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['school.get_fee_summary'],
    preconditions: ['ROLE_AUTHORIZED'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_READ'
  },

  CREATE_ADMISSION: {
    intentId: 'CREATE_ADMISSION',
    category: IntentCategory.ACADEMIC,
    modality: Modality.WRITE,
    riskTier: RiskTier.SENSITIVE_WRITE,
    description: 'Initiate or finalize new student admission into the school.',
    businessMeaning: 'Onboard candidate, create student record, assign class, generate admission form and initial fee voucher.',
    requiredEntities: ['candidate_name', 'father_name', 'class_name', 'gender'],
    optionalEntities: ['parent_phone', 'dob', 'discount_percent', 'agreed_fee'],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['school.create_admission', 'school.generate_admission_documents'],
    preconditions: ['CANDIDATE_DATA_COMPLETE', 'DUPLICATE_CHECK_PASSED', 'EXPLICIT_OWNER_PREVIEW_CONFIRMED'],
    expectedEffects: ['STUDENT_RECORD_CREATED', 'ADMISSION_RECORD_CREATED', 'FEE_CHALLAN_CREATED', 'PDF_DOCUMENTS_GENERATED'],
    verificationContract: 'POINTER_LOCK_AND_POST_COMMIT_READBACK'
  },

  UPDATE_ADMISSION_DRAFT: {
    intentId: 'UPDATE_ADMISSION_DRAFT',
    category: IntentCategory.ACADEMIC,
    modality: Modality.WRITE,
    riskTier: RiskTier.READ_ONLY,
    description: 'Provide missing fields for an active in-progress admission candidate.',
    businessMeaning: 'Enrich conversational candidate draft slots across multiple dialogue turns.',
    requiredEntities: ['admission_field_payload'],
    optionalEntities: [],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['school.update_candidate_draft'],
    preconditions: ['ACTIVE_ADMISSION_SESSION_EXISTS'],
    expectedEffects: ['DRAFT_SLOTS_UPDATED'],
    verificationContract: 'SESSION_SLOT_VALIDATION'
  },

  SEARCH_STUDENT: {
    intentId: 'SEARCH_STUDENT',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Search for student records by name, GR number, roll number, or father name.',
    businessMeaning: 'Look up student identity and academic assignment in the school roster.',
    requiredEntities: ['student_query'],
    optionalEntities: ['class_name', 'father_name'],
    allowedRoles: ['OWNER', 'ADMIN', 'TEACHER'],
    capabilities: ['school.search_student'],
    preconditions: ['PRIVACY_CHECK_PASSED'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'LIVE_SAAS_STUDENT_MATCH'
  },

  READ_STUDENT_COUNT: {
    intentId: 'READ_STUDENT_COUNT',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Query total enrolled, active, inactive students and gender demographics.',
    businessMeaning: 'Authoritative student headcount across the entire school.',
    requiredEntities: [],
    optionalEntities: [],
    allowedRoles: ['*'],
    capabilities: ['school.get_students_count', 'school.get_strength'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_STUDENTS_COUNT'
  },

  READ_CLASS_STRENGTH: {
    intentId: 'READ_CLASS_STRENGTH',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Query student roster count for a specific class or section.',
    businessMeaning: 'Class-level headcount and gender breakdown.',
    requiredEntities: ['class_name'],
    optionalEntities: ['section_name'],
    allowedRoles: ['*'],
    capabilities: ['school.get_class_strength'],
    preconditions: ['VALID_CANONICAL_CLASS'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_CLASS_STRENGTH'
  },

  READ_CLASSES_LIST: {
    intentId: 'READ_CLASSES_LIST',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Query list of classes, grades, and sections offered by the school.',
    businessMeaning: 'Academic structural offering of ASSPS (Starter to 10th / Hifaz).',
    requiredEntities: [],
    optionalEntities: [],
    allowedRoles: ['*'],
    capabilities: ['school.get_classes_list'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_CLASS_CATALOG'
  },

  READ_ATTENDANCE: {
    intentId: 'READ_ATTENDANCE',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Query school daily attendance, present count, absent count, and percentages.',
    businessMeaning: 'Student and staff attendance telemetry for today or specified date.',
    requiredEntities: [],
    optionalEntities: ['date', 'class_name', 'student_reference'],
    allowedRoles: ['OWNER', 'ADMIN', 'TEACHER'],
    capabilities: ['school.get_attendance', 'school.get_class_attendance'],
    preconditions: ['PRIVACY_CHECK_PASSED'],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_ATTENDANCE'
  },

  MARK_ATTENDANCE: {
    intentId: 'MARK_ATTENDANCE',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.WRITE,
    riskTier: RiskTier.SENSITIVE_WRITE,
    description: 'Mark attendance (present/absent) for student or class.',
    businessMeaning: 'Write attendance records into canonical database.',
    requiredEntities: ['attendance_payload'],
    optionalEntities: ['date'],
    allowedRoles: ['OWNER', 'ADMIN', 'TEACHER'],
    capabilities: ['school.mark_attendance'],
    preconditions: ['ROLE_AUTHORIZED', 'VALID_STUDENT_OR_CLASS'],
    expectedEffects: ['ATTENDANCE_TABLE_MUTATED'],
    verificationContract: 'POST_WRITE_ATTENDANCE_READBACK'
  },

  READ_STAFF_SUMMARY: {
    intentId: 'READ_STAFF_SUMMARY',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Query staff count, teachers count, administrative staff, and employee list.',
    businessMeaning: 'Employee and faculty roster summary.',
    requiredEntities: [],
    optionalEntities: ['role_filter'],
    allowedRoles: ['OWNER', 'ADMIN', 'TEACHER'],
    capabilities: ['school.get_staff_count', 'school.get_teacher_count'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'AUTHORITATIVE_SAAS_STAFF'
  },

  COMPOSITIONAL_COMPARISON: {
    intentId: 'COMPOSITIONAL_COMPARISON',
    category: IntentCategory.OPERATIONAL,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'Perform multi-entity arithmetic, class comparisons, percentages, or attendance deductions.',
    businessMeaning: 'Reasoning across multiple datasets (e.g. Class 7 vs Class 8, percentage of girls in school).',
    requiredEntities: ['reasoning_targets'],
    optionalEntities: ['comparison_metric'],
    allowedRoles: ['*'],
    capabilities: ['school.compare_classes', 'school.calculate_enrollment_share', 'school.deduce_unmarked_attendance'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'MULTI_FACT_AUTHORITATIVE_RECONCILIATION'
  },

  MARKET_INTELLIGENCE: {
    intentId: 'MARKET_INTELLIGENCE',
    category: IntentCategory.OPEN_DOMAIN,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'ARGUS financial market telemetry, gold rates, currency quotes, and economic news.',
    businessMeaning: 'Quantitative market quotes and macroeconomic data.',
    requiredEntities: ['symbol_or_asset'],
    optionalEntities: [],
    allowedRoles: ['*'],
    capabilities: ['argus.get_market_quote', 'argus.get_market_news'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'LIVE_ARGUS_TELEMETRY'
  },

  BROWSER_RESEARCH: {
    intentId: 'BROWSER_RESEARCH',
    category: IntentCategory.OPEN_DOMAIN,
    modality: Modality.ACTION,
    riskTier: RiskTier.ADMIN_ACTION,
    description: 'Autonomous web browsing, navigation, and structured web data extraction.',
    businessMeaning: 'External research via Browser Operator.',
    requiredEntities: ['url_or_search_query'],
    optionalEntities: [],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['browser.search', 'browser.navigate_and_extract'],
    preconditions: ['SECURITY_POLICY_CHECK'],
    expectedEffects: ['BROWSER_AUTOMATION_EXECUTED'],
    verificationContract: 'DOM_EXTRACTION_VERIFIED'
  },

  DESKTOP_ACTION: {
    intentId: 'DESKTOP_ACTION',
    category: IntentCategory.OPEN_DOMAIN,
    modality: Modality.ACTION,
    riskTier: RiskTier.ADMIN_ACTION,
    description: 'Desktop OS automation: launch application, author document, window control.',
    businessMeaning: 'Local machine automation via Desktop Operator.',
    requiredEntities: ['action_type'],
    optionalEntities: ['app_name', 'text_content', 'file_path'],
    allowedRoles: ['OWNER', 'ADMIN'],
    capabilities: ['desktop.launch_app', 'desktop.type', 'desktop.keypress', 'files.create_folder'],
    preconditions: ['DESKTOP_SECURITY_POLICY_PASSED'],
    expectedEffects: ['DESKTOP_STATE_ALTERED'],
    verificationContract: 'OS_HANDLE_OR_FILE_SYSTEM_VERIFIED'
  },

  PUBLIC_INFO: {
    intentId: 'PUBLIC_INFO',
    category: IntentCategory.SYSTEM,
    modality: Modality.READ,
    riskTier: RiskTier.READ_ONLY,
    description: 'General school information, location, timings, helpline, admissions policy for public.',
    businessMeaning: 'Public information brochure and admission guidance.',
    requiredEntities: [],
    optionalEntities: [],
    allowedRoles: ['*'],
    capabilities: ['school.get_public_info'],
    preconditions: [],
    expectedEffects: ['NONE_READ_ONLY'],
    verificationContract: 'STATIC_SCHOOL_METADATA'
  },

  GENERAL_CONVERSATION: {
    intentId: 'GENERAL_CONVERSATION',
    category: IntentCategory.SYSTEM,
    modality: Modality.CONVERSATIONAL,
    riskTier: RiskTier.READ_ONLY,
    description: 'Greeting, identity question, capability inquiries, or pleasantries.',
    businessMeaning: 'Polite conversational exchange without factual school data requests.',
    requiredEntities: [],
    optionalEntities: [],
    allowedRoles: ['*'],
    capabilities: ['system.conversation'],
    preconditions: [],
    expectedEffects: ['NONE_CONVERSATIONAL'],
    verificationContract: 'NATURAL_LANGUAGE_RESPONSE'
  },

  CLARIFICATION_REQUIRED: {
    intentId: 'CLARIFICATION_REQUIRED',
    category: IntentCategory.SYSTEM,
    modality: Modality.CONVERSATIONAL,
    riskTier: RiskTier.READ_ONLY,
    description: 'Low-confidence or ambiguous command requiring a single focused clarifying question.',
    businessMeaning: 'Safety gate: do not guess when user intention is unclear or ambiguously poised between read and write.',
    requiredEntities: ['clarification_prompt'],
    optionalEntities: ['candidate_intents'],
    allowedRoles: ['*'],
    capabilities: ['system.conversation'],
    preconditions: [],
    expectedEffects: ['NONE_AWAITING_USER_INPUT'],
    verificationContract: 'ZERO_GUESS_CLARIFICATION'
  }
};

export function getIntentDefinition(intentId) {
  return CANONICAL_INTENTS[intentId] || null;
}

export function listCanonicalIntents() {
  return Object.values(CANONICAL_INTENTS);
}
