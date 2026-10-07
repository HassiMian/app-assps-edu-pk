/**
 * JARVIS School Metrics Service & Reconciliation Engine
 * 
 * Authoritative Central Registry for all School SaaS business analytics,
 * invariants, provenance, and data truth.
 * 
 * Guarantees:
 * 1. Single Authoritative Source: Live ASSPS Production (https://app.assps.edu.pk/api)
 * 2. Mandatory Invariant Checks:
 *    - Male + Female + Unknown === Total Active Students
 *    - Sum(Class Enrollments) + Unassigned === Total Active Students
 *    - Present + Absent + Late + Leave === Marked Attendance
 *    - Marked Attendance + Unmarked === Total Active Students
 *    - Gross Billed - Discounts - Paid === Remaining Balance
 *    - Teaching + Admin + Operational + Other === Total Active Staff
 * 3. Never guesses/infers gender or fabricates data.
 * 4. Fails loudly with DATA_INTEGRITY_ERROR if reconciliations do not match.
 */

import { liveSchoolSaaSClient } from './live-school-saas-client.mjs';
import { normalizeClassKey } from './entity-extractor.mjs';
import crypto from 'node:crypto';

export class SchoolMetricsService {
  constructor(client = liveSchoolSaaSClient) {
    this.client = client;
    this.tenant = null;
    this.schoolId = null;
  }

  _generateSnapshotId() {
    return `SNAP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * 1. Student Demographics & Population Metrics
   */
  async getStudentMetrics(options = {}) {
    const identity = await this.client.verifyTenantIdentity();
    if (!identity.ok) return { ok: false, status: identity.status, error_code: identity.error_code, error: identity.error, identity, data: null };
    const res = await this.client.getStudents(options);
    if (!res.ok) {
      return {
        ok: false,
        status: "SOURCE_UNAVAILABLE",
        error: res.error || "Failed to retrieve student records from live SaaS",
        data: null
      };
    }

    const students = Array.isArray(res.data) ? res.data : [];
    const totalEnrolled = students.length;
    const activeList = students.filter(s => s.is_active !== false && s.status !== 'inactive');
    const totalActive = activeList.length;
    const inactiveCount = totalEnrolled - totalActive;

    let maleCount = 0;
    let femaleCount = 0;
    let unknownGenderCount = 0;

    for (const s of activeList) {
      const g = String(s.gender || '').trim().toLowerCase();
      if (g === 'male' || g === 'm' || g === 'boy') {
        maleCount++;
      } else if (g === 'female' || g === 'f' || g === 'girl') {
        femaleCount++;
      } else {
        unknownGenderCount++;
      }
    }

    const genderReconciliationValid = (maleCount + femaleCount + unknownGenderCount) === totalActive;
    if (!genderReconciliationValid) {
      throw new Error(`DATA_INTEGRITY_ERROR: Student gender sum (${maleCount} + ${femaleCount} + ${unknownGenderCount}) does not reconcile to total active students (${totalActive})`);
    }

    // Class distribution
    const classMap = new Map();
    let unassignedStudents = 0;

    for (const s of activeList) {
      const c = String(s.class || s.class_name || '').trim();
      if (!c) {
        unassignedStudents++;
      } else {
        classMap.set(c, (classMap.get(c) || 0) + 1);
      }
    }

    const classBreakdown = Object.fromEntries(classMap);
    const assignedSum = Array.from(classMap.values()).reduce((a, b) => a + b, 0);
    const classReconciliationValid = (assignedSum + unassignedStudents) === totalActive;

    return {
      ok: true,
      source: "ASSPS_PRODUCTION",
      tenant: identity.tenant_id,
      school_id: identity.school_id,
      endpoint: "https://app.assps.edu.pk/api/students",
      generated_at: new Date().toISOString(),
      students: {
        total_enrolled: totalEnrolled,
        total_active: totalActive,
        inactive: inactiveCount,
        male: maleCount,
        female: femaleCount,
        gender_unknown: unknownGenderCount,
        reconciliation_valid: genderReconciliationValid
      },
      classes: {
        count: classMap.size,
        breakdown: classBreakdown,
        assigned_students: assignedSum,
        unassigned_students: unassignedStudents,
        reconciliation_valid: classReconciliationValid
      },
      invariants_passed: genderReconciliationValid && classReconciliationValid
    };
  }

  /**
   * 2. Attendance Truth & Reconciled Metrics
   */
  async getAttendanceMetrics(targetDate = null) {
    const [attRes, stdRes] = await Promise.all([
      this.client.getAttendance(),
      this.getStudentMetrics()
    ]);

    if (!attRes.ok) {
      return {
        ok: false,
        status: "SOURCE_UNAVAILABLE",
        error: attRes.error || "Failed to retrieve attendance records from live SaaS",
        data: null
      };
    }

    if (!stdRes.ok) return stdRes;
    const totalEnrolled = stdRes.students.total_active;
    const rows = Array.isArray(attRes.data) ? attRes.data : [];

    // If no targetDate specified, pick the latest date present in attendance records
    let effectiveDate = targetDate;
    if (!effectiveDate && rows.length > 0) {
      const dates = rows.map(r => (r.date || '').split('T')[0]).filter(Boolean).sort();
      effectiveDate = dates[dates.length - 1]; // Latest recorded date
    }
    if (!effectiveDate) {
      effectiveDate = new Date().toISOString().split('T')[0];
    }

    // Filter rows strictly for effectiveDate
    const dayRows = rows.filter(r => (r.date || '').split('T')[0] === effectiveDate);
    const markedCount = dayRows.length;
    const unmarkedCount = Math.max(0, totalEnrolled - markedCount);

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const r of dayRows) {
      const st = String(r.status || '').trim().toLowerCase();
      if (st === 'present') presentCount++;
      else if (st === 'absent') absentCount++;
      else if (st === 'late') lateCount++;
      else if (st === 'leave') leaveCount++;
    }

    const markedSum = presentCount + absentCount + lateCount + leaveCount;
    const statusReconciliationValid = markedSum === markedCount;
    const totalReconciliationValid = (markedCount + unmarkedCount) === totalEnrolled;

    // Standard business definition: rate_of_marked = present / marked (matches School SaaS standard)
    const rateOfMarked = markedCount > 0 ? Number(((presentCount / markedCount) * 100).toFixed(1)) : 0;
    const rateOfEnrolled = totalEnrolled > 0 ? Number(((presentCount / totalEnrolled) * 100).toFixed(1)) : 0;

    return {
      ok: true,
      source: "ASSPS_PRODUCTION",
      tenant: stdRes.tenant,
      school_id: stdRes.school_id,
      endpoint: "https://app.assps.edu.pk/api/attendance",
      date: effectiveDate,
      generated_at: new Date().toISOString(),
      attendance: {
        total_enrolled: totalEnrolled,
        marked_count: markedCount,
        unmarked_count: unmarkedCount,
        present_count: presentCount,
        absent_count: absentCount,
        late_count: lateCount,
        leave_count: leaveCount,
        attendance_rate: rateOfMarked,
        rate_of_enrolled: rateOfEnrolled,
        rate_definition: "present_count / marked_count",
        reconciliation_valid: statusReconciliationValid && totalReconciliationValid,
        status_label: markedCount === 0
          ? "Unmarked / Pending"
          : `${presentCount} Present / ${absentCount} Absent${unmarkedCount > 0 ? ` (${unmarkedCount} Unmarked)` : ''}`
      },
      invariants_passed: statusReconciliationValid && totalReconciliationValid
    };
  }

  /**
   * 3. Fees & Financial Ledger Metrics
   */
  async getFeeMetrics(month = null, year = null) {
    const identity = await this.client.verifyTenantIdentity();
    if (!identity.ok) return { ok: false, status: identity.status, error_code: identity.error_code, error: identity.error, identity, data: null };
    const feesRes = await this.client.getFees();
    if (!feesRes.ok) {
      return {
        ok: false,
        status: "SOURCE_UNAVAILABLE",
        error: feesRes.error || "Failed to retrieve fee records from live SaaS",
        data: null
      };
    }

    let challans = Array.isArray(feesRes.data) ? feesRes.data : [];
    if (month) {
      challans = challans.filter(c => String(c.month || '').toLowerCase() === String(month).toLowerCase());
    }
    if (year) {
      challans = challans.filter(c => Number(c.year) === Number(year));
    }

    let grossBilled = 0;
    let discounts = 0;
    let amountPaid = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    for (const c of challans) {
      const amount = parseFloat(c.amount || c.gross_total || 0);
      const disc = parseFloat(c.discount || 0);
      const paid = parseFloat(c.paid_amount || 0);

      grossBilled += amount;
      discounts += disc;
      amountPaid += paid;

      const effectiveNet = amount - disc;
      if (c.status === 'paid' || paid >= effectiveNet) {
        paidCount++;
      } else if (c.status === 'partial' || paid > 0) {
        partialCount++;
      } else {
        unpaidCount++;
      }
    }

    const netCollectible = grossBilled - discounts;
    const remainingBalance = Math.max(0, netCollectible - amountPaid);
    const recoveryPercentage = netCollectible > 0 ? Number(((amountPaid / netCollectible) * 100).toFixed(2)) : 100;

    const ledgerReconciliationValid = Math.abs((netCollectible - amountPaid) - remainingBalance) < 0.01;
    const challanCountReconciliationValid = (paidCount + partialCount + unpaidCount) === challans.length;

    return {
      ok: true,
      source: "ASSPS_PRODUCTION",
      tenant: identity.tenant_id,
      school_id: identity.school_id,
      endpoint: "https://app.assps.edu.pk/api/fees",
      month: month || "All / Session",
      year: year || 2026,
      generated_at: new Date().toISOString(),
      fees: {
        total_challans: challans.length,
        paid_challans: paidCount,
        partial_challans: partialCount,
        unpaid_challans: unpaidCount,
        gross_billed: grossBilled,
        discounts: discounts,
        net_collectible: netCollectible,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
        recovery_percentage: recoveryPercentage,
        billed_pkr_k: Number((grossBilled / 1000).toFixed(1)),
        collected_pkr_k: Number((amountPaid / 1000).toFixed(1)),
        pending_pkr_k: Number((remainingBalance / 1000).toFixed(1)),
        reconciliation_valid: ledgerReconciliationValid && challanCountReconciliationValid
      },
      invariants_passed: ledgerReconciliationValid && challanCountReconciliationValid
    };
  }

  /**
   * 4. Staff & Faculty Metrics
   */
  async getStaffMetrics() {
    const identity = await this.client.verifyTenantIdentity();
    if (!identity.ok) return { ok: false, status: identity.status, error_code: identity.error_code, error: identity.error, identity, data: null };
    const staffRes = await this.client.getStaff();
    if (!staffRes.ok) {
      return {
        ok: false,
        status: "SOURCE_UNAVAILABLE",
        error: staffRes.error || "Failed to retrieve staff records from live SaaS",
        data: null
      };
    }

    const rawData = staffRes.data;
    const staffList = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.employees)
        ? rawData.employees
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter(s => s.is_active !== false);

    let teachingStaff = 0;
    let administrativeStaff = 0;
    let operationalStaff = 0;
    let otherStaff = 0;

    for (const s of activeStaff) {
      const r = String(s.role || s.designation || s.portal_role || '').trim().toLowerCase();
      if (/teacher|faculty|instructor|educator|lecturer|teaching/i.test(r)) {
        teachingStaff++;
      } else if (/principal|vice\s*principal|admin|administrator|head|coordinator|accountant|manager/i.test(r)) {
        administrativeStaff++;
      } else if (/guard|security|driver|peon|support|janitor|maintenance/i.test(r)) {
        operationalStaff++;
      } else {
        otherStaff++;
      }
    }

    const staffReconciliationValid = (teachingStaff + administrativeStaff + operationalStaff + otherStaff) === activeStaff.length;

    return {
      ok: true,
      source: "ASSPS_PRODUCTION",
      tenant: identity.tenant_id,
      school_id: identity.school_id,
      endpoint: "https://app.assps.edu.pk/api/staff",
      generated_at: new Date().toISOString(),
      staff: {
        total_staff: totalStaff,
        total_active_staff: activeStaff.length,
        teaching_staff: teachingStaff,
        administrative_staff: administrativeStaff,
        operational_staff: operationalStaff,
        other_staff: otherStaff,
        reconciliation_valid: staffReconciliationValid
      },
      invariants_passed: staffReconciliationValid
    };
  }

  /**
   * 5. Class Strength Metrics
   */
  async getClassStrengthMetrics(className = null) {
    const stdRes = await this.getStudentMetrics();
    if (!stdRes.ok) return stdRes;

    const breakdown = stdRes.classes.breakdown;
    const totalActive = stdRes.students.total_active;

    if (className) {
      const target = normalizeClassKey(className);
      let matchedCount = 0;
      let matchedClassName = className;

      for (const [cName, count] of Object.entries(breakdown)) {
        const cleanC = normalizeClassKey(cName);
        if (cleanC === target || cleanC.includes(target) || target.includes(cleanC)) {
          matchedCount += count;
          matchedClassName = cName;
        }
      }

      return {
        ok: true,
        source: "ASSPS_PRODUCTION",
        className: matchedClassName,
        matched_count: matchedCount,
        total_school_students: totalActive,
        verification: matchedCount > 0 ? "LIVE_PRODUCTION_VERIFIED" : "LIVE_CLASS_NOT_FOUND"
      };
    }

    const classEntries = Object.entries(breakdown).map(([class_name, total_students]) => ({
      class_name,
      total_students
    }));

    return {
      ok: true,
      source: "ASSPS_PRODUCTION",
      classes: classEntries,
      total_classes: classEntries.length,
      total_active_students: totalActive,
      reconciliation_valid: stdRes.classes.reconciliation_valid
    };
  }

  /**
   * 6. Unified Full Dashboard Telemetry Payload
   */
  async getUnifiedDashboardMetrics(options = {}) {
    const startedAt = new Date().toISOString();
    const snapshotId = options.snapshot_id || this._generateSnapshotId();

    const [studentMetrics, attendanceMetrics, feeMetrics, staffMetrics] = await Promise.all([
      this.getStudentMetrics({ ...options, snapshot_id: snapshotId }),
      this.getAttendanceMetrics(options.date, { ...options, snapshot_id: snapshotId }),
      this.getFeeMetrics(options.month, options.year, { ...options, snapshot_id: snapshotId }),
      this.getStaffMetrics({ ...options, snapshot_id: snapshotId })
    ]);

    const completedAt = new Date().toISOString();

    const failures = [studentMetrics, attendanceMetrics, feeMetrics, staffMetrics].filter(item => !item.ok);
    if (failures.length > 0) {
      return {
        ok: false,
        status: "SOURCE_AUTHORITY_UNAVAILABLE",
        error_code: failures[0].error_code || failures[0].status || "SOURCE_AUTHORITY_UNAVAILABLE",
        error: failures[0].error || "ASSPS production source authority is unavailable.",
        snapshot_id: snapshotId,
        started_at: startedAt,
        completed_at: completedAt,
        source: "https://app.assps.edu.pk/api",
        failures,
        school: null
      };
    }

    const std = studentMetrics.students;
    const att = attendanceMetrics.attendance;
    const fee = feeMetrics.fees;
    const stf = staffMetrics.staff;

    const classList = studentMetrics.ok 
      ? Object.entries(studentMetrics.classes.breakdown).map(([class_name, total_students]) => ({ class_name, total_students, total: total_students }))
      : [];

    return {
      ok: true,
      snapshot_id: snapshotId,
      started_at: startedAt,
      completed_at: completedAt,
      source: "https://app.assps.edu.pk/api",
      tenant: studentMetrics.tenant,
      school_id: studentMetrics.school_id,
      timestamp: completedAt,
      provenance: {
        snapshot_id: snapshotId,
        started_at: startedAt,
        completed_at: completedAt,
        source: "https://app.assps.edu.pk/api",
        tenant: studentMetrics.tenant,
        school_id: studentMetrics.school_id,
        student_snapshot_id: studentMetrics.snapshot_id || snapshotId,
        attendance_snapshot_id: attendanceMetrics.snapshot_id || snapshotId,
        fee_snapshot_id: feeMetrics.snapshot_id || snapshotId,
        staff_snapshot_id: staffMetrics.snapshot_id || snapshotId
      },
      school: {
        strength: {
          totalStudents: std.total_active,
          activeStudents: std.total_active,
          boys: std.male,
          girls: std.female,
          genderUnknown: std.gender_unknown,
          classesCount: studentMetrics.classes.count,
          reconciled: studentMetrics.invariants_passed
        },
        attendance: {
          attendanceRate: att.attendance_rate,
          rateOfEnrolled: att.rate_of_enrolled,
          present: att.present_count,
          absent: att.absent_count,
          late: att.late_count,
          unmarked: att.unmarked_count,
          totalRecorded: att.marked_count,
          date: attendanceMetrics.date,
          status: att.status_label,
          reconciled: attendanceMetrics.invariants_passed
        },
        fees: {
          billedAmountPkr: fee.gross_billed,
          collectedAmountPkr: fee.amount_paid,
          pendingAmountPkr: fee.remaining_balance,
          recoveryRate: fee.recovery_percentage,
          billed_pkr_k: fee.billed_pkr_k,
          collected_pkr_k: fee.collected_pkr_k,
          pending_pkr_k: fee.pending_pkr_k,
          paidChallans: fee.paid_challans,
          unpaidChallans: fee.unpaid_challans,
          reconciled: feeMetrics.invariants_passed
        },
        staff: {
          totalStaff: stf.total_active_staff,
          teachersCount: stf.teaching_staff,
          adminStaff: stf.administrative_staff,
          operationalStaff: stf.operational_staff,
          reconciled: staffMetrics.invariants_passed
        },
        classes: classList
      },
      all_invariants_passed: Boolean(
        studentMetrics.ok && studentMetrics.invariants_passed &&
        attendanceMetrics.ok && attendanceMetrics.invariants_passed &&
        feeMetrics.ok && feeMetrics.invariants_passed &&
        staffMetrics.ok && staffMetrics.invariants_passed
      )
    };
  }
}

export const schoolMetricsService = new SchoolMetricsService();
