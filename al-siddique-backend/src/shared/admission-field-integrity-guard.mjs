/**
 * JARVIS 4.1 — Admission Field Integrity Guard & Date-of-Birth Normalization Engine
 * 
 * Enforces strict mathematical field preservation:
 * 1. INPUT_FIELDS ⊆ PREVIEW_FIELDS
 * 2. CONFIRMED_PREVIEW_FIELDS ⊆ WRITE_PAYLOAD_FIELDS
 * 3. WRITE_PAYLOAD_FIELDS == CANONICAL_READBACK_FIELDS
 * 
 * Zero silent field loss. If a supplied field cannot be safely normalized,
 * execution halts with a field-specific clarification.
 */

// Convert Eastern Arabic / Urdu numerals to Western Arabic
export function convertUrduNumeralsToAscii(str) {
  if (!str) return '';
  const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let res = String(str);
  for (let i = 0; i <= 9; i++) {
    res = res.replaceAll(urduDigits[i], String(i));
  }
  return res;
}

/**
 * Normalizes user-supplied Date of Birth into canonical ISO (YYYY-MM-DD)
 * Supports:
 * - 29/6/2022, 29/06/2022, 11/10/2022
 * - 29-06-2022, 29-6-2022
 * - 2022-06-29, 2022/06/29
 * - 29.06.2022, 29.6.2022
 * - Urdu script numerals (۲۹/۰۶/۲۰۲۲)
 */
export function normalizeDateOfBirth(rawDob) {
  if (!rawDob || String(rawDob).trim() === '') {
    return { valid: false, error: 'DOB_EMPTY', iso: null, display: null };
  }

  const clean = convertUrduNumeralsToAscii(String(rawDob).trim());

  // 1. Check ISO pattern: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (isValidDate(year, month, day)) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const display = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      return { valid: true, iso, display, year, month, day };
    }
  }

  // 2. Check Standard British/Pakistani pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (isValidDate(year, month, day)) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const display = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      return { valid: true, iso, display, year, month, day };
    }
  }

  // 3. Two-digit year fallback (e.g. 29/06/22)
  const dmyShortMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const day = parseInt(dmyShortMatch[1], 10);
    const month = parseInt(dmyShortMatch[2], 10);
    let year = parseInt(dmyShortMatch[3], 10);
    year = year <= 35 ? 2000 + year : 1900 + year;
    if (isValidDate(year, month, day)) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const display = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      return { valid: true, iso, display, year, month, day };
    }
  }

  return {
    valid: false,
    error: 'UNRECOGNIZED_DATE_FORMAT',
    raw: rawDob,
    iso: null,
    display: null
  };
}

function isValidDate(year, month, day) {
  if (year < 1990 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Check days in month
  const maxDays = new Date(year, month, 0).getDate();
  return day <= maxDays;
}

export class AdmissionFieldIntegrityGuard {
  /**
   * Gate 1: Ensure all user-supplied input fields are present in the generated preview
   */
  static verifyPreviewIntegrity(candidate, previewText) {
    const missingInPreview = [];
    const text = String(previewText || '');

    if (candidate.name && !text.toLowerCase().includes(candidate.name.toLowerCase())) {
      missingInPreview.push({ field: 'name', value: candidate.name });
    }
    if (candidate.father_name && !text.toLowerCase().includes(candidate.father_name.toLowerCase())) {
      missingInPreview.push({ field: 'father_name', value: candidate.father_name });
    }
    if (candidate.class && !text.toLowerCase().includes(candidate.class.toLowerCase())) {
      missingInPreview.push({ field: 'class', value: candidate.class });
    }
    if (candidate.phone && !text.includes(candidate.phone)) {
      missingInPreview.push({ field: 'phone', value: candidate.phone });
    }

    // Critical Invariant: If DOB was supplied, preview CANNOT display "Not specified" or omit it
    if (candidate.dob || candidate.date_of_birth || candidate.dateOfBirth) {
      const dobVal = candidate.dob || candidate.date_of_birth || candidate.dateOfBirth;
      const norm = normalizeDateOfBirth(dobVal);
      const isPresent = norm.valid && (text.includes(norm.display) || text.includes(norm.iso) || text.includes(String(dobVal)));
      const hasNotSpecified = /Date\s*of\s*Birth:\s*Not\s*specified/i.test(text);

      if (!isPresent || hasNotSpecified) {
        missingInPreview.push({ field: 'dob', value: dobVal, reason: hasNotSpecified ? 'SHOWN_AS_NOT_SPECIFIED' : 'OMITTED_FROM_PREVIEW' });
      }
    }

    return {
      passed: missingInPreview.length === 0,
      missingFields: missingInPreview
    };
  }

  /**
   * Gate 2: Ensure confirmed preview candidate data matches the API POST payload
   */
  static verifyPayloadIntegrity(candidate, payload) {
    const discrepancies = [];

    if (candidate.name && payload.name !== candidate.name) {
      discrepancies.push({ field: 'name', expected: candidate.name, got: payload.name });
    }
    if (candidate.father_name && payload.father_name !== candidate.father_name) {
      discrepancies.push({ field: 'father_name', expected: candidate.father_name, got: payload.father_name });
    }
    if (candidate.class && payload.class !== candidate.class) {
      discrepancies.push({ field: 'class', expected: candidate.class, got: payload.class });
    }
    if (candidate.phone && payload.parent_phone !== candidate.phone) {
      discrepancies.push({ field: 'phone', expected: candidate.phone, got: payload.parent_phone });
    }

    // Critical Invariant: date_of_birth MUST be present in payload if supplied
    const suppliedDob = candidate.dob || candidate.date_of_birth || candidate.dateOfBirth;
    if (suppliedDob) {
      const norm = normalizeDateOfBirth(suppliedDob);
      if (!norm.valid) {
        discrepancies.push({ field: 'date_of_birth', error: 'INVALID_SUPPLIED_DOB', raw: suppliedDob });
      } else if (!payload.date_of_birth || payload.date_of_birth !== norm.iso) {
        discrepancies.push({
          field: 'date_of_birth',
          expected: norm.iso,
          got: payload.date_of_birth || null,
          reason: 'SILENT_DOB_OMISSION_PROHIBITED'
        });
      }
    }

    return {
      passed: discrepancies.length === 0,
      discrepancies
    };
  }

  /**
   * Gate 3: Ensure PostgreSQL readback matches write payload
   */
  static verifyReadbackIntegrity(payload, readbackRow) {
    const mismatches = [];

    if (payload.name && readbackRow.name !== payload.name) {
      mismatches.push({ field: 'name', payload: payload.name, db: readbackRow.name });
    }
    if (payload.father_name && readbackRow.father_name !== payload.father_name) {
      mismatches.push({ field: 'father_name', payload: payload.father_name, db: readbackRow.father_name });
    }
    if (payload.date_of_birth) {
      const dbDate = readbackRow.date_of_birth ? String(readbackRow.date_of_birth).split('T')[0] : null;
      if (dbDate !== payload.date_of_birth) {
        mismatches.push({ field: 'date_of_birth', payload: payload.date_of_birth, db: dbDate });
      }
    }

    return {
      passed: mismatches.length === 0,
      mismatches
    };
  }
}
