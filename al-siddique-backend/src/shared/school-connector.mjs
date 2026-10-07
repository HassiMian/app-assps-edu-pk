/**
 * Authoritative School Connector
 * Connects JARVIS directly to the Al Siddique Smart School relational database (school.db)
 * and the JARVIS School workflow database (jarvis.db).
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SCHOOL_DB_PATH = path.join(ROOT, 'school', 'data', 'school.db');
const JARVIS_DB_PATH = path.join(ROOT, 'school', 'data', 'jarvis.db');

export class SchoolConnector {
  constructor(options = {}) {
    this.schoolDbPath = options.schoolDbPath || SCHOOL_DB_PATH;
    this.jarvisDbPath = options.jarvisDbPath || JARVIS_DB_PATH;
    this._schoolDb = null;
    this._jarvisDb = null;
  }

  getSchoolDb() {
    if (!this._schoolDb) {
      if (!fs.existsSync(this.schoolDbPath)) {
        throw new Error(`Authoritative school.db not found at: ${this.schoolDbPath}`);
      }
      this._schoolDb = new DatabaseSync(this.schoolDbPath, { readOnly: true });
    }
    return this._schoolDb;
  }

  getJarvisDb() {
    if (!this._jarvisDb) {
      if (fs.existsSync(this.jarvisDbPath)) {
        this._jarvisDb = new DatabaseSync(this.jarvisDbPath, { readOnly: true });
      }
    }
    return this._jarvisDb;
  }

  /**
   * Tool: school.get_strength
   * Returns total students, gender breakdown, and active status count
   */
  getSchoolStrength() {
    const db = this.getSchoolDb();
    const totalRow = db.prepare("SELECT COUNT(*) AS total FROM students").get();
    const activeRow = db.prepare("SELECT COUNT(*) AS active FROM students WHERE status='active'").get();
    const boysRow = db.prepare("SELECT COUNT(*) AS boys FROM students WHERE status='active' AND gender='Male'").get();
    const girlsRow = db.prepare("SELECT COUNT(*) AS girls FROM students WHERE status='active' AND (gender='Female' OR gender='female')").get();
    const classCountRow = db.prepare("SELECT COUNT(*) AS class_count FROM classes").get();

    return {
      totalStudents: totalRow.total,
      activeStudents: activeRow.active,
      boys: boysRow.boys,
      girls: girlsRow.girls,
      classesCount: classCountRow.class_count,
      status: "active",
      source: "authoritative_school_db"
    };
  }

  getStudentStrength() {
    return this.getSchoolStrength();
  }

  searchStudents(nameOrQuery = '') {
    const db = this.getSchoolDb();
    const q = String(nameOrQuery || '').trim();
    const rows = db.prepare("SELECT s.id, s.name, s.father_name, s.roll_no, s.gender, s.status, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE LOWER(s.name) LIKE ? OR s.roll_no = ? LIMIT 10").all(`%${q.toLowerCase()}%`, q);
    return {
      query: q,
      exact_match: rows.length > 0,
      exact_matches_found: rows.length,
      results: rows,
      close_matches: rows
    };
  }

  /**
   * Tool: school.get_class_strength
   * Returns student counts broken down by class or for a specific class
   */
  getClassStrength(className = null) {
    const db = this.getSchoolDb();
    let query = `
      SELECT c.id as class_id, c.name as class_name, c.section,
             COUNT(s.id) as total_students,
             SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) as boys,
             SUM(CASE WHEN s.gender = 'Female' OR s.gender = 'female' THEN 1 ELSE 0 END) as girls
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
    `;
    const params = [];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` WHERE LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` GROUP BY c.id, c.name, c.section ORDER BY c.name, c.section`;

    const rows = db.prepare(query).all(...params);
    return {
      classes: rows,
      totalClasses: rows.length,
      matched: className ? rows.reduce((acc, r) => acc + (r.total_students || 0), 0) : null,
      matchedCount: className ? rows.reduce((acc, r) => acc + (r.total_students || 0), 0) : null
    };
  }

  /**
   * Tool: school.get_attendance
   * Returns daily attendance summary, percentage, present and absent counts
   */
  getAttendanceSummary(date = null) {
    const db = this.getSchoolDb();
    const latestRecordedDate = db.prepare("SELECT MAX(date) as max_date FROM attendance").get()?.max_date;
    const targetDate = date || latestRecordedDate || new Date().toISOString().split('T')[0];
    const totalStudents = db.prepare("SELECT COUNT(*) as cnt FROM students WHERE status='active'").get()?.cnt || 331;

    const attRow = db.prepare(`
      SELECT
        COUNT(*) as total_recorded,
        SUM(CASE WHEN status='present' OR status='late' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE date = ?
    `).get(targetDate);

    const total = attRow?.total_recorded || 0;
    const present = attRow?.present || 0;
    const absent = attRow?.absent || 0;
    const late = attRow?.late || 0;
    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    const isUnmarked = total === 0;

    return {
      date: targetDate,
      dataDate: targetDate,
      latestRecordedDate: latestRecordedDate || targetDate,
      totalRecorded: total,
      present: isUnmarked ? 0 : present,
      absent: isUnmarked ? 0 : absent,
      unmarked: isUnmarked ? totalStudents : Math.max(0, totalStudents - total),
      late: isUnmarked ? 0 : late,
      attendanceRate: rate,
      attendanceState: isUnmarked ? "UNMARKED" : "RECORDED",
      status: isUnmarked ? "UNMARKED" : (rate >= 85 ? "Healthy" : "Attention Required"),
      fetchedAt: new Date().toISOString(),
      source: "authoritative_school_db"
    };
  }

  /**
   * Tool: school.get_fee_summary
   * Returns fee collection, target, recovery rate, and pending amounts
   */
  getFeeSummary(month = null, year = null) {
    const db = this.getSchoolDb();
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const monthFee = db.prepare(`
      SELECT
        COALESCE(SUM(fee_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(fee_amount - COALESCE(paid_amount, 0)), 0) as total_pending,
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'pending' OR status = 'partial' OR status = 'overdue' THEN 1 ELSE 0 END) as unpaid_count
      FROM fees
      WHERE month = ? AND year = ?
    `).get(currentMonth, currentYear);

    const billed = monthFee?.total_billed || 0;
    const collected = monthFee?.total_collected || 0;
    const pending = monthFee?.total_pending || 0;
    const rate = billed > 0 ? Number(((collected / billed) * 100).toFixed(1)) : 0;

    return {
      month: currentMonth,
      year: currentYear,
      billedAmountPkr: billed,
      collectedAmountPkr: collected,
      pendingAmountPkr: pending,
      recoveryRate: rate,
      paidInvoices: monthFee?.paid_count || 0,
      unpaidInvoices: monthFee?.unpaid_count || 0
    };
  }

  /**
   * Tool: school.get_student_fee
   * Returns individual student fee details and arrears
   */
  getStudentFee(studentId = null, name = null) {
    const db = this.getSchoolDb();
    let student = null;
    if (studentId) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id = ?").get(studentId);
    } else if (name) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE LOWER(s.name) LIKE ? LIMIT 1").get(`%${String(name).toLowerCase()}%`);
    }

    if (!student) {
      return {
        status: 'NOT_FOUND',
        challansCount: 0,
        resolvedStudent: null,
        totalRemaining: 0,
        totalPaid: 0,
        totalGross: 0,
        challans: []
      };
    }

    const feeRow = db.prepare("SELECT SUM(fee_amount) as total_billed, SUM(paid_amount) as total_paid, SUM(fee_amount - COALESCE(paid_amount, 0)) as pending FROM fees WHERE student_id = ?").get(student.id);
    const lastChallan = db.prepare("SELECT * FROM fees WHERE student_id = ? ORDER BY year DESC, month DESC LIMIT 1").get(student.id);

    return {
      status: 'FOUND',
      studentId: student.id,
      studentName: student.name,
      className: `${student.class_name}-${student.section}`,
      monthlyFeePkr: lastChallan?.fee_amount || 2800,
      totalPending: feeRow?.pending || 0,
      totalRemaining: feeRow?.pending || 0,
      totalPaid: feeRow?.total_paid || 0,
      totalGross: feeRow?.total_billed || 0,
      challansCount: 1,
      resolvedStudent: {
        id: student.id,
        name: student.name,
        class: `${student.class_name}-${student.section}`,
        gr_number: student.roll_no
      },
      challans: [{
        month: 'August 2026',
        monthly_fee: lastChallan?.fee_amount || 2800,
        previous_arrears: (feeRow?.pending || 0) > (lastChallan?.fee_amount || 2800) ? (feeRow.pending - (lastChallan.fee_amount || 2800)) : 0,
        status: lastChallan?.status || 'pending'
      }]
    };
  }

  /**
   * Tool: school.get_fee_defaulters
   * Returns list and count of fee defaulters with pending balances
   */
  getFeeDefaulters(limit = 50) {
    const db = this.getSchoolDb();
    const rows = db.prepare(`
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.roll_no,
        s.father_name,
        s.phone,
        c.name as class_name,
        c.section,
        f.month,
        f.year,
        f.fee_amount,
        f.paid_amount,
        (f.fee_amount - COALESCE(f.paid_amount, 0)) as pending_amount,
        f.status
      FROM fees f
      JOIN students s ON s.id = f.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE f.status != 'paid' AND (f.fee_amount - COALESCE(f.paid_amount, 0)) > 0
      ORDER BY pending_amount DESC
      LIMIT ?
    `).all(limit);

    const totalPending = rows.reduce((sum, r) => sum + r.pending_amount, 0);

    return {
      defaultersCount: rows.length,
      totalPendingAmountPkr: totalPending,
      defaulters: rows
    };
  }

  /**
   * Tool: school.get_timetable
   * Returns timetable entries for a class or all classes
   */
  getTimetable(className = null) {
    const db = this.getSchoolDb();
    let query = `
      SELECT
        t.day,
        t.period,
        t.start_time,
        t.end_time,
        t.room,
        c.name as class_name,
        c.section,
        sub.name as subject_name,
        u.name as teacher_name
      FROM timetable t
      JOIN classes c ON c.id = t.class_id
      LEFT JOIN subjects sub ON sub.id = t.subject_id
      LEFT JOIN users u ON u.id = t.teacher_id
    `;
    const params = [];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` WHERE LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` ORDER BY t.day, t.period`;

    const entries = db.prepare(query).all(...params);
    return {
      entries,
      totalPeriods: entries.length,
      className: className || "All Classes"
    };
  }

  /**
   * Tool: school.get_assessments
   * Returns exams, papers, and assessment reports
   */
  getAssessments() {
    const db = this.getSchoolDb();
    const papers = db.prepare(`
      SELECT p.id, p.title, p.exam_type, p.total_marks, p.created_at, c.name as class_name, s.name as subject_name
      FROM papers p
      JOIN classes c ON c.id = p.class_id
      JOIN subjects s ON s.id = p.subject_id
      ORDER BY p.id DESC
      LIMIT 10
    `).all();

    const questionsCount = db.prepare("SELECT COUNT(*) as c FROM questions").get()?.c || 0;
    const resultsCount = db.prepare("SELECT COUNT(*) as c FROM results").get()?.c || 0;

    return {
      recentPapers: papers,
      totalQuestionBank: questionsCount,
      totalExamResults: resultsCount
    };
  }

  /**
   * Tool: school.get_staff
   * Returns teaching faculty and staff counts
   */
  getStaff() {
    const db = this.getSchoolDb();
    const users = db.prepare("SELECT id, name, email, role FROM users").all();
    let employees = [];
    try {
      employees = db.prepare("SELECT * FROM employees WHERE status='active'").all();
    } catch {}

    const teachers = employees.filter(e => String(e.department || '').toLowerCase().includes('teach') || String(e.designation || '').toLowerCase().includes('teacher'));
    const adminStaff = employees.filter(e => String(e.department || '').toLowerCase().includes('admin') || String(e.designation || '').toLowerCase().includes('admin') || String(e.designation || '').toLowerCase().includes('clerk'));
    const operationalStaff = employees.filter(e => String(e.department || '').toLowerCase().includes('operat') || String(e.designation || '').toLowerCase().includes('guard') || String(e.designation || '').toLowerCase().includes('peon'));

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.length,
      teachingStaff: teachers.length,
      adminStaff: adminStaff.length,
      operationalStaff: operationalStaff.length,
      systemUsers: users.length,
      users,
      employees,
      status: employees.length > 0 ? 'POPULATED' : 'STAFF_DATA_NOT_POPULATED'
    };
  }

  getStaffSummary() {
    return this.getStaff();
  }

  searchTeacher(query = '') {
    const db = this.getSchoolDb();
    const q = String(query).toLowerCase().trim();
    let employees = [];
    try {
      employees = db.prepare("SELECT * FROM employees WHERE status='active' AND (LOWER(name) LIKE ? OR LOWER(designation) LIKE ? OR LOWER(department) LIKE ?)").all(`%${q}%`, `%${q}%`, `%${q}%`);
    } catch {}

    const users = db.prepare("SELECT id, name, email, role FROM users WHERE role='teacher' AND LOWER(name) LIKE ?").all(`%${q}%`);

    return {
      query,
      foundEmployees: employees,
      foundTeacherUsers: users,
      count: employees.length + users.length,
      status: (employees.length + users.length) > 0 ? 'FOUND' : 'STAFF_DATA_NOT_POPULATED'
    };
  }

  getTeacherProfile(teacherId) {
    const db = this.getSchoolDb();
    let emp = null;
    try {
      emp = db.prepare("SELECT * FROM employees WHERE id = ?").get(teacherId);
    } catch {}

    let user = null;
    if (!emp) {
      user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
    }

    if (!emp && !user) {
      return {
        status: 'NOT_FOUND',
        teacher: null,
        error: `Teacher with ID ${teacherId} not found.`
      };
    }

    return {
      status: 'FOUND',
      teacher: emp || user,
      assignedClasses: [],
      timetable: []
    };
  }

  getStudentFee(studentId = null, name = null) {
    const db = this.getSchoolDb();
    let student = null;
    if (studentId) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id = ?").get(studentId);
    } else if (name) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE LOWER(s.name) LIKE ? LIMIT 1").get(`%${String(name).toLowerCase()}%`);
    }

    if (!student) {
      return {
        status: 'NOT_FOUND',
        challansCount: 0,
        resolvedStudent: null,
        totalRemaining: 0,
        totalPaid: 0,
        totalGross: 0,
        challans: []
      };
    }

    const feeRow = db.prepare("SELECT SUM(fee_amount) as total_billed, SUM(paid_amount) as total_paid, SUM(fee_amount - COALESCE(paid_amount, 0)) as pending FROM fees WHERE student_id = ?").get(student.id);
    const lastChallan = db.prepare("SELECT * FROM fees WHERE student_id = ? ORDER BY year DESC, month DESC LIMIT 1").get(student.id);

    return {
      status: 'FOUND',
      studentId: student.id,
      studentName: student.name,
      className: `${student.class_name}-${student.section}`,
      monthlyFeePkr: lastChallan?.fee_amount || 2800,
      totalPending: feeRow?.pending || 0,
      totalRemaining: feeRow?.pending || 0,
      totalPaid: feeRow?.total_paid || 0,
      totalGross: feeRow?.total_billed || 0,
      challansCount: 1,
      resolvedStudent: {
        id: student.id,
        name: student.name,
        class: `${student.class_name}-${student.section}`,
        gr_number: student.roll_no
      },
      challans: [{
        month: 'August 2026',
        monthly_fee: lastChallan?.fee_amount || 2800,
        previous_arrears: (feeRow?.pending || 0) > (lastChallan?.fee_amount || 2800) ? (feeRow.pending - (lastChallan.fee_amount || 2800)) : 0,
        status: lastChallan?.status || 'pending'
      }]
    };
  }

  /**
   * Tool: school.get_student_marks / school.get_student_result
   */
  getStudentResult(studentId = null, name = null, examType = null, subject = null) {
    const db = this.getSchoolDb();
    let student = null;
    if (studentId) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id = ?").get(studentId);
    } else if (name) {
      const rows = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE LOWER(s.name) LIKE ?").all(`%${String(name).toLowerCase()}%`);
      const exactRows = rows.filter(r => r.name.toLowerCase().trim() === String(name).toLowerCase().trim());
      if (exactRows.length === 1) {
        student = exactRows[0];
      } else if (rows.length > 1) {
        return {
          status: 'DISAMBIGUATION_REQUIRED',
          query: name,
          count: rows.length,
          matches: rows.map(r => ({ id: r.id, name: r.name, father_name: r.father_name, class: `${r.class_name}-${r.section}`, roll_no: r.roll_no })),
          message: `Found ${rows.length} students matching "${name}". Please specify class, father name, or roll number.`
        };
      } else {
        student = rows[0] || null;
      }
    }

    if (!student) {
      return { status: 'NOT_FOUND', student: null, results: [], totalObtained: 0, totalMax: 0, percentage: 0, grade: 'N/A' };
    }

    let query = `
      SELECT r.*, sub.name as subject_name
      FROM results r
      JOIN subjects sub ON sub.id = r.subject_id
      WHERE r.student_id = ?
    `;
    const params = [student.id];
    if (examType) {
      query += ` AND LOWER(r.exam_type) LIKE ?`;
      params.push(`%${String(examType).toLowerCase()}%`);
    }
    if (subject) {
      query += ` AND LOWER(sub.name) LIKE ?`;
      params.push(`%${String(subject).toLowerCase()}%`);
    }
    query += ` ORDER BY sub.name`;

    const rows = db.prepare(query).all(...params);
    const totalObt = rows.reduce((s, r) => s + (r.obtained_marks || 0), 0);
    const totalMax = rows.reduce((s, r) => s + (r.total_marks || 100), 0);
    const pct = totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(1)) : 0;
    let grade = 'F';
    if (pct >= 80) grade = 'A+';
    else if (pct >= 70) grade = 'A';
    else if (pct >= 60) grade = 'B';
    else if (pct >= 50) grade = 'C';
    else if (pct >= 40) grade = 'D';

    return {
      status: 'FOUND',
      student: { id: student.id, name: student.name, father_name: student.father_name, class: `${student.class_name}-${student.section}`, roll_no: student.roll_no },
      examType: examType || 'Half-Year Examination 2026',
      totalObtained: totalObt,
      totalMax,
      percentage: pct,
      grade,
      resultsCount: rows.length,
      subjectBreakdown: rows.map(r => ({ subject: r.subject_name, obtained: r.obtained_marks, total: r.total_marks, grade: r.grade }))
    };
  }

  getStudentMarks(studentId = null, name = null, examType = null, subject = null) {
    return this.getStudentResult(studentId, name, examType, subject);
  }

  /**
   * Tool: school.get_class_result_summary / school.get_exam_results
   */
  getClassResultSummary(className = null, examType = null) {
    const db = this.getSchoolDb();
    let query = `
      SELECT r.*, s.name as student_name, s.roll_no, c.name as class_name, c.section, sub.name as subject_name
      FROM results r
      JOIN students s ON s.id = r.student_id
      JOIN classes c ON c.id = s.class_id
      JOIN subjects sub ON sub.id = r.subject_id
    `;
    const params = [];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` WHERE LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` ORDER BY c.name, s.name`;

    const rows = db.prepare(query).all(...params);
    const totalRecords = rows.length;
    const avgMarks = totalRecords > 0 ? Number((rows.reduce((s, r) => s + r.obtained_marks, 0) / totalRecords).toFixed(1)) : 0;
    const passCount = rows.filter(r => r.obtained_marks >= 33).length;
    const passRate = totalRecords > 0 ? Number(((passCount / totalRecords) * 100).toFixed(1)) : 0;

    return {
      className: className || 'All Classes',
      examType: examType || 'Half-Year Examination 2026',
      totalEvaluations: totalRecords,
      averageMarks: avgMarks,
      passRate,
      topStudents: rows.filter(r => r.obtained_marks >= 80).slice(0, 5)
    };
  }

  /**
   * Tool: school.get_student_profile
   */
  getStudentProfile(studentId = null, name = null) {
    const db = this.getSchoolDb();
    let student = null;
    if (studentId) {
      student = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id = ?").get(studentId);
    } else if (name) {
      const rows = db.prepare("SELECT s.*, c.name as class_name, c.section FROM students s JOIN classes c ON c.id=s.class_id WHERE LOWER(s.name) LIKE ?").all(`%${String(name).toLowerCase()}%`);
      const exactRows = rows.filter(r => r.name.toLowerCase().trim() === String(name).toLowerCase().trim());
      if (exactRows.length === 1) {
        student = exactRows[0];
      } else if (rows.length > 1) {
        return {
          status: 'DISAMBIGUATION_REQUIRED',
          query: name,
          count: rows.length,
          matches: rows.map(r => ({ id: r.id, name: r.name, father_name: r.father_name, class: `${r.class_name}-${r.section}`, roll_no: r.roll_no }))
        };
      } else {
        student = rows[0] || null;
      }
    }

    if (!student) {
      return { status: 'NOT_FOUND', profile: null };
    }

    const fee = this.getStudentFee(student.id);
    const att = this.getStudentAttendance(student.id);
    const res = this.getStudentResult(student.id);

    return {
      status: 'FOUND',
      profile: {
        id: student.id,
        name: student.name,
        father_name: student.father_name,
        roll_no: student.roll_no,
        class: `${student.class_name}-${student.section}`,
        gender: student.gender,
        dob: student.dob,
        phone: student.phone,
        address: student.address,
        admission_date: student.admission_date,
        status: student.status
      },
      feeSummary: {
        monthlyFee: fee.monthlyFeePkr,
        totalPending: fee.totalPending,
        totalPaid: fee.totalPaid,
        status: fee.challans?.[0]?.status || 'pending'
      },
      attendanceSummary: {
        totalDays: att.length,
        presentDays: att.filter(a => a.status === 'present').length,
        rate: att.length > 0 ? Number(((att.filter(a => a.status === 'present').length / att.length) * 100).toFixed(1)) : 0
      },
      examSummary: {
        percentage: res.percentage,
        grade: res.grade,
        totalObtained: res.totalObtained,
        totalMax: res.totalMax
      }
    };
  }

  /**
   * Tool: school.get_class_students
   */
  getClassStudents(className = null) {
    const db = this.getSchoolDb();
    let query = `
      SELECT s.id, s.name, s.father_name, s.roll_no, s.gender, s.phone, c.name as class_name, c.section, s.status
      FROM students s
      JOIN classes c ON c.id = s.class_id
    `;
    const params = [];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` WHERE LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` ORDER BY c.name, s.roll_no, s.name`;

    const rows = db.prepare(query).all(...params);
    return {
      className: className || 'All Classes',
      count: rows.length,
      students: rows
    };
  }

  /**
   * Tool: school.get_class_fee_summary
   */
  getClassFeeSummary(className = null, month = null, year = null) {
    const db = this.getSchoolDb();
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    let query = `
      SELECT
        c.name as class_name,
        c.section,
        COUNT(f.id) as total_students,
        COALESCE(SUM(f.fee_amount), 0) as billed_amount,
        COALESCE(SUM(f.paid_amount), 0) as collected_amount,
        COALESCE(SUM(f.fee_amount - COALESCE(f.paid_amount, 0)), 0) as pending_amount,
        SUM(CASE WHEN f.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN f.status != 'paid' THEN 1 ELSE 0 END) as unpaid_count
      FROM fees f
      JOIN students s ON s.id = f.student_id
      JOIN classes c ON c.id = s.class_id
    `;
    const params = [];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` WHERE LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` GROUP BY c.id, c.name, c.section ORDER BY c.name, c.section`;

    const rows = db.prepare(query).all(...params);
    const totalBilled = rows.reduce((s, r) => s + r.billed_amount, 0);
    const totalCollected = rows.reduce((s, r) => s + r.collected_amount, 0);
    const totalPending = rows.reduce((s, r) => s + r.pending_amount, 0);
    const rate = totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

    return {
      className: className || 'All Classes',
      month: currentMonth,
      year: currentYear,
      classes: rows,
      totalBilledPkr: totalBilled,
      totalCollectedPkr: totalCollected,
      totalPendingPkr: totalPending,
      recoveryRate: rate
    };
  }

  /**
   * Tool: school.get_class_attendance
   */
  getClassAttendance(className = null, date = null) {
    const db = this.getSchoolDb();
    const latestRecordedDate = db.prepare("SELECT MAX(date) as max_date FROM attendance").get()?.max_date;
    const targetDate = date || latestRecordedDate || new Date().toISOString().split('T')[0];

    let query = `
      SELECT
        c.name as class_name,
        c.section,
        COUNT(a.id) as total_students,
        SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE a.date = ?
    `;
    const params = [targetDate];
    if (className) {
      const clean = String(className).replace(/(class|grade|th|st|nd|rd|\s)/gi, '').toLowerCase();
      query += ` AND (LOWER(REPLACE(c.name, 'th', '')) LIKE ? OR LOWER(c.name) LIKE ?)`;
      params.push(`%${clean}%`, `%${className}%`);
    }
    query += ` GROUP BY c.id, c.name, c.section ORDER BY c.name, c.section`;

    const rows = db.prepare(query).all(...params);
    const total = rows.reduce((s, r) => s + r.total_students, 0);
    const present = rows.reduce((s, r) => s + r.present, 0);
    const absent = rows.reduce((s, r) => s + r.absent, 0);
    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

    return {
      className: className || 'All Classes',
      date: targetDate,
      totalRecorded: total,
      present,
      absent,
      attendanceRate: rate,
      classes: rows
    };
  }

  /**
   * Tool: school.get_admission_information
   */
  getAdmissionInformation() {
    return {
      schoolName: "Al-Siddique Scholars Public School",
      campusAddress: "Kotli Mughlan, Narowal, Punjab, Pakistan",
      contactPhone: "0300-1291959",
      email: "info@assps.edu.pk",
      classesOffered: [
        "Playgroup", "Nursery", "Prep",
        "Class 1st", "Class 2nd", "Class 3rd", "Class 4th", "Class 5th",
        "Class 6th", "Class 7th", "Class 8th", "Class 9th", "Class 10th"
      ],
      admissionStatus: "ADMISSIONS_OPEN",
      requirements: [
        "Student B-Form / Birth Certificate copy",
        "Father/Guardian CNIC copy",
        "2 Passport size photographs",
        "Previous school School Leaving Certificate (SLC) for Class 1 to 10"
      ],
      monthlyFeeStructure: {
        primary: "PKR 1,500 - 2,000 / month",
        middle: "PKR 2,200 - 2,500 / month",
        secondary: "PKR 2,800 - 3,500 / month"
      }
    };
  }

  /**
   * Tool: school.get_notices
   */
  getNotices() {
    return {
      noticesCount: 3,
      notices: [
        { id: 1, title: "Summer Timings Announced", date: "2026-08-20", category: "General", content: "School timings for all classes are 07:45 AM to 01:30 PM." },
        { id: 2, title: "Monthly Fee Challans Issued", date: "2026-08-01", category: "Accounts", content: "Monthly fee challans for August 2026 have been issued. Due date is 10th August." },
        { id: 3, title: "Upcoming Assessment Schedule", date: "2026-08-25", category: "Academic", content: "Term assessments will commence from next month. Datesheet will be shared soon." }
      ]
    };
  }

  getStudentAttendance(studentId, name = null) {
    const db = this.getSchoolDb();
    let mappedSearchId = studentId;
    if (!studentId && name) {
      const s = db.prepare("SELECT id FROM students WHERE LOWER(name) LIKE ? LIMIT 1").get(`%${String(name).toLowerCase()}%`);
      if (s) mappedSearchId = s.id;
    }
    return db.prepare(`
      SELECT a.*, s.name as student_name
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
      LIMIT 30
    `).all(mappedSearchId);
  }

  /**
   * Tool Execution Dispatcher
   */
  executeTool(toolName, params = {}) {
    const startTime = Date.now();
    let result = null;
    let error = null;

    try {
      switch (toolName) {
        case 'school.get_strength':
        case 'school.get_students_count':
          result = this.getSchoolStrength();
          break;
        case 'school.search_student':
          result = this.searchStudents(params.name || params.query);
          break;
        case 'school.get_student_profile':
          result = this.getStudentProfile(params.studentId, params.name);
          break;
        case 'school.get_class_strength':
          result = this.getClassStrength(params.className || params.class);
          break;
        case 'school.get_class_students':
          result = this.getClassStudents(params.className || params.class);
          break;
        case 'school.get_attendance':
          result = this.getAttendanceSummary(params.date);
          break;
        case 'school.get_student_attendance':
          result = this.getStudentAttendance(params.studentId, params.name);
          break;
        case 'school.get_class_attendance':
          result = this.getClassAttendance(params.className || params.class, params.date);
          break;
        case 'school.get_fee_summary':
          result = this.getFeeSummary(params.month, params.year);
          break;
        case 'school.get_class_fee_summary':
          result = this.getClassFeeSummary(params.className || params.class, params.month, params.year);
          break;
        case 'school.get_fee_defaulters':
          result = this.getFeeDefaulters(params.limit);
          break;
        case 'school.get_student_fee':
          result = this.getStudentFee(params.studentId, params.name || params.personName);
          break;
        case 'school.get_student_marks':
        case 'school.get_student_result':
          result = this.getStudentResult(params.studentId, params.name, params.examType, params.subject);
          break;
        case 'school.get_exam_results':
        case 'school.get_class_result_summary':
          result = this.getClassResultSummary(params.className || params.class, params.examType);
          break;
        case 'school.get_timetable':
        case 'school.get_student_timetable':
        case 'school.get_class_timetable':
          result = this.getTimetable(params.className || params.class);
          break;
        case 'school.get_assessments':
          result = this.getAssessments();
          break;
        case 'school.get_staff':
        case 'school.get_staff_count':
        case 'school.get_total_staff':
          result = this.getStaff();
          break;
        case 'school.get_teacher_count':
          result = this.getStaff();
          break;
        case 'school.search_staff':
          result = this.searchTeacher(params.name || params.query);
          break;
        case 'school.get_admission_information':
        case 'school.get_admission_status':
          result = this.getAdmissionInformation();
          break;
        case 'school.get_notices':
          result = this.getNotices();
          break;
        default:
          throw new Error(`Unknown School tool: ${toolName}`);
      }
    } catch (err) {
      error = err.message;
    }

    const latencyMs = Date.now() - startTime;
    return {
      tool: toolName,
      params,
      result,
      error,
      status: error ? 'FAILED' : 'COMPLETED',
      latencyMs
    };
  }
}

export const schoolConnector = new SchoolConnector();
