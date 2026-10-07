/**
 * Normalized School SaaS Adapter
 * Authoritative integration bridge connecting JARVIS and School OS directly
 * to the School SaaS data layer.
 */

import { schoolConnector } from './school-connector.mjs';

export class SchoolSaaSAdapter {
  constructor(connector = schoolConnector) {
    this.connector = connector;
  }

  get_total_students() {
    const strength = this.connector.getSchoolStrength();
    return strength.totalStudents || 0;
  }

  get_active_students() {
    const strength = this.connector.getSchoolStrength();
    return strength.activeStudents || 0;
  }

  get_gender_breakdown() {
    const strength = this.connector.getSchoolStrength();
    return {
      total: strength.activeStudents || 0,
      boys: strength.boys || 0,
      girls: strength.girls || 0,
      gender_unknown: strength.gender_unknown || 0
    };
  }

  get_class_strength(className = null) {
    return this.connector.getClassStrength(className);
  }

  get_student(studentId) {
    const db = this.connector.getSchoolDb();
    const student = db.prepare(`
      SELECT s.*, c.name as class_name, c.section
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = ? OR s.roll_no = ?
    `).get(studentId, String(studentId));
    return student || null;
  }

  find_student_by_name(name) {
    const db = this.connector.getSchoolDb();
    return db.prepare(`
      SELECT s.*, c.name as class_name, c.section
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.name LIKE ?
    `).all(`%${name}%`);
  }

  get_attendance_summary(date = null) {
    return this.connector.getAttendanceSummary(date);
  }

  get_fee_summary(month = null, year = null) {
    return this.connector.getFeeSummary(month, year);
  }

  get_fee_status(studentId) {
    const db = this.connector.getSchoolDb();
    const rows = db.prepare(`
      SELECT f.*, s.name as student_name
      FROM fees f
      JOIN students s ON s.id = f.student_id
      WHERE s.id = ? OR s.roll_no = ?
      ORDER BY f.year DESC, f.month DESC
    `).all(studentId, String(studentId));
    return rows;
  }

  get_teacher_data() {
    return this.connector.getStaff();
  }

  get_timetable(className = null) {
    return this.connector.getTimetable(className);
  }

  get_assessments() {
    return this.connector.getAssessments();
  }

  get_results(studentId = null) {
    const db = this.connector.getSchoolDb();
    let query = `
      SELECT r.*, s.name as student_name, sub.name as subject_name
      FROM results r
      JOIN students s ON s.id = r.student_id
      JOIN subjects sub ON sub.id = r.subject_id
    `;
    const params = [];
    if (studentId) {
      query += ` WHERE s.id = ? OR s.roll_no = ?`;
      params.push(studentId, String(studentId));
    }
    query += ` ORDER BY r.created_at DESC LIMIT 50`;
    return db.prepare(query).all(...params);
  }

  get_admissions(limit = 10) {
    const db = this.connector.getSchoolDb();
    return db.prepare(`
      SELECT s.id, s.name, s.roll_no, s.admission_date, c.name as class_name, c.section
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active'
      ORDER BY s.id DESC
      LIMIT ?
    `).all(limit);
  }
}

export const schoolSaaSAdapter = new SchoolSaaSAdapter();
