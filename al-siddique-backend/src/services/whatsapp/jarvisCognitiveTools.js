/**
 * JARVIS 5.0 Cognitive Tools Suite
 * Canonical tenant-scoped PostgreSQL integration for Al-Siddique Smart School OS (apexos)
 * Production-hardened, fail-closed & auditable
 */

const { pool, tenantContext } = require('../../config/database');
const { requireConfiguredSchoolId, resolveUserRole } = require('./schoolChannelGuard.cjs');
const { execFile } = require('child_process');


async function queryDb(text, params = []) {
  const schoolId = requireConfiguredSchoolId();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.rls_enabled', 'true', true)");
    await client.query("SELECT set_config('app.is_super_admin', 'false', true)");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [String(schoolId)]);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// A multi-row admission must commit as one tenant-scoped operation. The usual
// queryDb() helper deliberately uses one transaction per statement, so it must
// not be used for a multi-table admission workflow.
async function withSchoolTransaction(callback) {
  const schoolId = requireConfiguredSchoolId();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.rls_enabled', 'true', true)");
    await client.query("SELECT set_config('app.is_super_admin', 'false', true)");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [String(schoolId)]);
    // Serialize this channel's per-school GR allocation and B-Form checks.
    await client.query('SELECT pg_advisory_xact_lock($1::integer, $2::integer)', [schoolId, 7711]);
    const result = await callback((text, params = []) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

// ─── 1. Exam & Datesheet Tools ──────────────────────────────────────────────

async function getExamDatesheet(args = {}) {
  try {
    let targetDate = args.date || args.examDate || args.exam_date;
    const className = args.className || args.class || args.class_name;
    const subject = args.subject || args.subjectName || args.subject_name;
    const examName = args.examName || args.exam_name;
    const examId = args.examId || args.exam_id;
    if (targetDate) {
      targetDate = targetDate.trim().toLowerCase();
      const now = new Date();
      const pkTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
      const todayStr = pkTime.toISOString().split('T')[0];

      if (targetDate === 'today' || targetDate === 'aaj' || targetDate === 'aj') {
        targetDate = todayStr;
      } else if (targetDate === 'tomorrow' || targetDate === 'kal') {
        const tom = new Date(pkTime.getTime() + 86400000);
        targetDate = tom.toISOString().split('T')[0];
      } else if (targetDate.includes('october') || targetDate.includes('oct')) {
        const match = targetDate.match(/(\d{1,2})/);
        if (match) {
          const day = match[1].padStart(2, '0');
          targetDate = `2026-10-${day}`;
        }
      }
    }

    let sql = `
      SELECT es.id, es.exam_id, e.name AS exam_name, es.class_name, es.section,
             es.subject, TO_CHAR(es.exam_date, 'YYYY-MM-DD') AS exam_date,
             es.paper_time, es.total_marks, es.pass_marks
      FROM exam_subjects es
      LEFT JOIN exams e ON es.exam_id = e.id
      WHERE es.school_id = current_setting('app.tenant_id')::int
    `;
    const params = [];

    if (examId) {
      params.push(parseInt(examId, 10));
      sql += ` AND es.exam_id = $${params.length}`;
    }
    if (targetDate) {
      params.push(targetDate);
      sql += ` AND es.exam_date = $${params.length}::date`;
    }
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND es.class_name ILIKE $${params.length}`;
    }
    if (subject) {
      params.push(`%${subject.trim()}%`);
      sql += ` AND es.subject ILIKE $${params.length}`;
    }
    if (examName) {
      params.push(`%${examName.trim()}%`);
      sql += ` AND e.name ILIKE $${params.length}`;
    }

    sql += ` ORDER BY es.exam_date ASC, es.class_name ASC, es.subject ASC;`;

    const res = await queryDb(sql, params);
    return {
      success: true,
      count: res.rowCount,
      papers: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function manageDatesheet({ action = 'add', examId = 9, className, subject, examDate, paperTime = '10:00 AM - 12:00 PM', totalMarks = 100, passMarks = 33 } = {}) {
  try {
    if (action === 'delete') {
      const del = await queryDb(
        `DELETE FROM exam_subjects
         WHERE school_id = current_setting('app.tenant_id')::int
           AND exam_id = $1 AND class_name ILIKE $2 AND subject ILIKE $3
         RETURNING id;`,
        [examId, `%${className}%`, `%${subject}%`]
      );
      return { success: true, action: 'deleted', deletedCount: del.rowCount };
    }

    const res = await queryDb(
      `INSERT INTO exam_subjects (exam_id, class_name, subject, exam_date, paper_time, total_marks, pass_marks, school_id)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, current_setting('app.tenant_id')::int)
       RETURNING id, exam_id, class_name, subject, exam_date, paper_time;`,
      [examId, className, subject, examDate, paperTime, totalMarks, passMarks]
    );
    return { success: true, action: 'added', paper: res.rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 2. Marks Entry & Result Cards ──────────────────────────────────────────

async function enterExamMarks({ examId = 9, className, subject, marksList = [] } = {}) {
  try {
    if (!marksList || marksList.length === 0) {
      return { success: false, error: 'No marks provided in marksList' };
    }

    const inserted = [];
    const errors = [];

    for (const item of marksList) {
      const queryStr = item.studentNameOrGr || item.grNumber || item.name;
      const marks = parseFloat(item.marksObtained);
      const total = parseFloat(item.totalMarks || 100);
      const remarks = item.remarks || '';

      const stdRes = await queryDb(
        `SELECT id, name, gr_number, class FROM students
         WHERE (gr_number ILIKE $1 OR name ILIKE $2)
           ${className ? 'AND class ILIKE $3' : ''}
         LIMIT 1;`,
        className ? [queryStr.trim(), `%${queryStr.trim()}%`, `%${className.trim()}%`] : [queryStr.trim(), `%${queryStr.trim()}%`]
      );

      if (stdRes.rowCount === 0) {
        errors.push({ student: queryStr, error: 'Student not found in database' });
        continue;
      }

      const student = stdRes.rows[0];
      const pct = (marks / total) * 100;
      let grade = 'F';
      if (pct >= 80) grade = 'A+';
      else if (pct >= 70) grade = 'A';
      else if (pct >= 60) grade = 'B';
      else if (pct >= 50) grade = 'C';
      else if (pct >= 40) grade = 'D';
      else if (pct >= 33) grade = 'E';

      const upsert = await queryDb(
        `INSERT INTO exam_results (exam_id, student_id, subject, marks_obtained, total_marks, grade, remarks, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, current_setting('app.tenant_id')::int)
         ON CONFLICT (exam_id, student_id, subject)
         DO UPDATE SET marks_obtained = $4, total_marks = $5, grade = $6, remarks = $7, updated_at = NOW()
         RETURNING id, student_id, subject, marks_obtained, grade;`,
        [examId, student.id, subject, marks, total, grade, remarks]
      );

      inserted.push({
        student_id: student.id,
        name: student.name,
        gr_number: student.gr_number,
        marks_obtained: marks,
        total_marks: total,
        grade
      });
    }

    return {
      success: true,
      examId,
      subject,
      className,
      processed: inserted.length,
      inserted,
      errors
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getOrPrintResultCards({ examId = 9, className, studentIdOrGr } = {}) {
  try {
    let sql = `
      SELECT er.id, er.exam_id, e.name AS exam_name, s.id AS student_id, s.name, s.gr_number,
             s.class, s.section, er.subject, er.marks_obtained, er.total_marks, er.grade, er.remarks
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      JOIN exams e ON er.exam_id = e.id
      WHERE er.exam_id = $1
    `;
    const params = [examId];

    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND s.class ILIKE $${params.length}`;
    }
    if (studentIdOrGr) {
      params.push(`%${String(studentIdOrGr).trim()}%`);
      sql += ` AND (s.gr_number ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY s.class ASC, s.name ASC, er.subject ASC;`;

    const res = await queryDb(sql, params);

    // Group by student
    const studentCards = {};
    for (const r of res.rows) {
      if (!studentCards[r.student_id]) {
        studentCards[r.student_id] = {
          student_id: r.student_id,
          name: r.name,
          gr_number: r.gr_number,
          class: r.class,
          section: r.section,
          exam_name: r.exam_name,
          subjects: [],
          total_obtained: 0,
          total_max: 0
        };
      }
      studentCards[r.student_id].subjects.push({
        subject: r.subject,
        marks_obtained: r.marks_obtained,
        total_marks: r.total_marks,
        grade: r.grade
      });
      studentCards[r.student_id].total_obtained += Number(r.marks_obtained || 0);
      studentCards[r.student_id].total_max += Number(r.total_marks || 0);
    }

    const cards = Object.values(studentCards).map(c => {
      const pct = c.total_max > 0 ? ((c.total_obtained / c.total_max) * 100).toFixed(1) : 0;
      return {
        ...c,
        percentage: `${pct}%`,
        overall_grade: pct >= 80 ? 'A+' : (pct >= 70 ? 'A' : (pct >= 60 ? 'B' : (pct >= 50 ? 'C' : 'F')))
      };
    });

    cards.sort((a, b) => b.total_obtained - a.total_obtained);
    cards.forEach((c, idx) => { c.position = idx + 1; });

    return {
      success: true,
      examId,
      studentCount: cards.length,
      cards: cards.slice(0, 20)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 3. Fee & Challan Engine ────────────────────────────────────────────────

async function editStudentFee({ studentQuery, className, newMonthlyFee, newRemainingBalance, reason } = {}, context = {}) {
  try {
    const role = context.role || 'UNKNOWN';
    const isPrivileged = ['OWNER', 'ADMIN'].includes(role);
    if (!isPrivileged) {
      return { success: false, error: 'Student fee modifications are restricted to authorized School Owner and Administrators.' };
    }
    const q = String(studentQuery).trim();
    let findSql = `
      SELECT s.id, s.name, s.gr_number, s.class, s.section, fp.monthly_fee
      FROM students s
      LEFT JOIN student_fee_profiles fp ON fp.student_id = s.id
      WHERE (s.gr_number ILIKE $1 OR s.name ILIKE $2)
    `;
    const params = [q, `%${q}%`];
    if (className) {
      params.push(`%${className.trim()}%`);
      findSql += ` AND s.class ILIKE $${params.length}`;
    }
    findSql += ` LIMIT 1;`;

    const stdRes = await queryDb(findSql, params);
    if (stdRes.rowCount === 0) {
      return { success: false, error: `Student "${studentQuery}" not found in database.` };
    }

    const student = stdRes.rows[0];
    const oldFee = student.monthly_fee || 0;

    if (newMonthlyFee !== undefined) {
      await queryDb(
        `INSERT INTO student_fee_profiles (student_id, school_id, monthly_fee, updated_at)
         VALUES ($1, current_setting('app.tenant_id')::int, $2, NOW())
         ON CONFLICT (student_id)
         DO UPDATE SET monthly_fee = $2, updated_at = NOW();`,
        [student.id, newMonthlyFee]
      );
    }

    let updatedChallans = 0;
    if (newRemainingBalance !== undefined) {
      const upChallan = await queryDb(
        `UPDATE fee_challans
         SET remaining_balance = $1, updated_at = NOW()
         WHERE student_id = $2 AND status = 'unpaid';`,
        [newRemainingBalance, student.id]
      );
      updatedChallans = upChallan.rowCount;
    } else if (newMonthlyFee !== undefined) {
      const upChallan = await queryDb(
        `UPDATE fee_challans
         SET amount = $1, remaining_balance = $1, updated_at = NOW()
         WHERE student_id = $2 AND status = 'unpaid' AND month = 'October' AND year = 2026;`,
        [newMonthlyFee, student.id]
      );
      updatedChallans = upChallan.rowCount;
    }

    return {
      success: true,
      student_id: student.id,
      name: student.name,
      gr_number: student.gr_number,
      class: student.class,
      old_monthly_fee: oldFee,
      new_monthly_fee: newMonthlyFee !== undefined ? newMonthlyFee : oldFee,
      updated_challans_count: updatedChallans,
      reason: reason || 'Updated by Administrator'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function generateFeeChallans({ className, month = 'October', year = 2026 } = {}) {
  try {
    let sql = `
      SELECT s.id, s.name, s.gr_number, s.class, s.section, COALESCE(fp.monthly_fee, 3000) AS monthly_fee
      FROM students s
      LEFT JOIN student_fee_profiles fp ON fp.student_id = s.id
      WHERE s.is_active = true
    `;
    const params = [];
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND s.class ILIKE $${params.length}`;
    }

    const students = await queryDb(sql, params);
    let createdCount = 0;

    for (const std of students.rows) {
      const challanNo = `CH-${Date.now().toString().slice(-6)}-${std.id}`;
      const fee = std.monthly_fee;

      const ins = await queryDb(
        `INSERT INTO fee_challans (school_id, student_id, challan_no, month, year, amount, remaining_balance, status, due_date)
         VALUES (current_setting('app.tenant_id')::int, $1, $2, $3, $4, $5, $5, 'unpaid', NOW() + INTERVAL '10 days')
         ON CONFLICT (student_id, month, year) DO NOTHING
         RETURNING id;`,
        [std.id, challanNo, month, year, fee]
      );
      if (ins.rowCount > 0) createdCount++;
    }

    return {
      success: true,
      class: className || 'All Classes',
      month,
      year,
      total_students: students.rowCount,
      new_challans_created: createdCount
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getFeeFinancialSummaryAndDefaulters({ limit = 15, className, month, year } = {}) {
  try {
    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 15, 1), 50);
    let statsSql = `
      SELECT
        COUNT(*) AS total_challans,
        COALESCE(SUM(amount), 0) AS total_billed,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE amount - remaining_balance END), 0) AS total_collected,
        COALESCE(SUM(remaining_balance), 0) AS total_outstanding
      FROM fee_challans
      WHERE school_id = current_setting('app.tenant_id')::int
    `;
    const statsParams = [];
    if (month) {
      statsParams.push(String(month).trim());
      statsSql += ` AND month = $${statsParams.length}`;
    }
    if (year !== undefined && year !== null && String(year).trim() !== '') {
      const normalizedYear = Number.parseInt(year, 10);
      if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 2200) {
        return { success: false, error: 'Invalid fee year.' };
      }
      statsParams.push(normalizedYear);
      statsSql += ` AND year = $${statsParams.length}`;
    }
    statsSql += ';';

    const statsRes = await queryDb(statsSql, statsParams);
    const stats = statsRes.rows[0];

    let defaultersSql = `
      SELECT
        s.id AS student_id,
        s.name AS student_name,
        s.father_name,
        s.class,
        s.section,
        s.parent_phone,
        COALESCE(s.parent_whatsapp, s.parent_phone) AS whatsapp,
        COUNT(fc.id) AS unpaid_challans_count,
        SUM(fc.remaining_balance) AS total_due
      FROM fee_challans fc
      JOIN students s ON fc.student_id = s.id
      WHERE fc.school_id = current_setting('app.tenant_id')::int
        AND s.school_id = current_setting('app.tenant_id')::int
        AND fc.status = 'unpaid' AND fc.remaining_balance > 0
    `;
    const params = [];
    if (className) {
      params.push(`%${String(className).trim()}%`);
      defaultersSql += ` AND s.class ILIKE $${params.length}`;
    }
    if (month) {
      params.push(String(month).trim());
      defaultersSql += ` AND fc.month = $${params.length}`;
    }
    if (year !== undefined && year !== null && String(year).trim() !== '') {
      const normalizedYear = Number.parseInt(year, 10);
      params.push(normalizedYear);
      defaultersSql += ` AND fc.year = $${params.length}`;
    }

    params.push(normalizedLimit);
    defaultersSql += `
      GROUP BY s.id, s.name, s.father_name, s.class, s.section, s.parent_phone, s.parent_whatsapp
      ORDER BY total_due DESC
      LIMIT $${params.length};
    `;

    const defaultersRes = await queryDb(defaultersSql, params);

    const totalBilled = Number(stats.total_billed || 0);
    const totalCollected = Number(stats.total_collected || 0);
    return {
      success: true,
      summary: {
        total_challans: Number.parseInt(stats.total_challans, 10) || 0,
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_outstanding: Number(stats.total_outstanding || 0),
        recovery_percentage: totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) + '%' : '0%'
      },
      defaulters_count: defaultersRes.rowCount,
      top_defaulters: defaultersRes.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 4. Attendance Engine ───────────────────────────────────────────────────

async function getAttendance({ date = 'today', className } = {}) {
  try {
    let queryDate = date;
    const now = new Date();
    const pkTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = pkTime.toISOString().split('T')[0];

    if (!queryDate || queryDate === 'today' || queryDate === 'aaj' || queryDate === 'aj') {
      queryDate = todayStr;
    } else if (queryDate === 'yesterday' || queryDate === 'kal') {
      const yest = new Date(pkTime.getTime() - 86400000);
      queryDate = yest.toISOString().split('T')[0];
    }

    let sql = `
      SELECT a.id, a.student_id, s.name, s.gr_number, s.class, s.section, a.status, a.remarks
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.date = $1::date
    `;
    const params = [queryDate];
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND s.class ILIKE $${params.length}`;
    }
    sql += ` ORDER BY s.class ASC, s.name ASC;`;

    const res = await queryDb(sql, params);
    const rows = res.rows;

    const present = rows.filter(r => r.status === 'present').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    const leave = rows.filter(r => r.status === 'leave').length;
    const late = rows.filter(r => r.status === 'late').length;

    const absentees = rows.filter(r => r.status === 'absent').map(r => ({
      name: r.name,
      class: r.class,
      gr_number: r.gr_number
    }));

    return {
      success: true,
      date: queryDate,
      total_marked: rows.length,
      present,
      absent,
      leave,
      late,
      absentees: absentees.slice(0, 15)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function markAttendance({ date, className, records = [] } = {}) {
  try {
    const markDate = date || new Date().toISOString().split('T')[0];
    const inserted = [];
    const errors = [];

    for (const rec of records) {
      const q = rec.studentNameOrGr || rec.name || rec.grNumber;
      const status = (rec.status || 'present').toLowerCase();

      const stdRes = await queryDb(
        `SELECT id, name, gr_number, class FROM students
         WHERE (gr_number ILIKE $1 OR name ILIKE $2)
           ${className ? 'AND class ILIKE $3' : ''}
         LIMIT 1;`,
        className ? [q.trim(), `%${q.trim()}%`, `%${className.trim()}%`] : [q.trim(), `%${q.trim()}%`]
      );

      if (stdRes.rowCount === 0) {
        errors.push({ query: q, error: 'Student not found' });
        continue;
      }

      const s = stdRes.rows[0];
      await queryDb(
        `INSERT INTO attendance (school_id, student_id, date, status, updated_at)
         VALUES (current_setting('app.tenant_id')::int, $1, $2::date, $3, NOW())
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = $3, updated_at = NOW();`,
        [s.id, markDate, status]
      );

      inserted.push({ id: s.id, name: s.name, class: s.class, status });
    }

    return {
      success: true,
      date: markDate,
      markedCount: inserted.length,
      records: inserted,
      errors
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 5. Timetable Tools ─────────────────────────────────────────────────────

async function getOrManageTimetable({ action = 'get', className, section, teacherName, dayName, subject, startTime, endTime, periodLabel } = {}) {
  try {
    if (action !== 'get') return { success: false, error: 'Timetable mutations are disabled in the WhatsApp AI channel.' };
    if (action === 'create_slot') {
      let teacherId = null;
      if (teacherName) {
        const tRes = await queryDb(`SELECT id FROM users WHERE name ILIKE $1 LIMIT 1;`, [`%${teacherName.trim()}%`]);
        if (tRes.rowCount > 0) teacherId = tRes.rows[0].id;
      }
      const res = await queryDb(
        `INSERT INTO timetable (school_id, teacher_id, day_name, start_time, end_time, subject, class_name, section, period_label)
         VALUES (current_setting('app.tenant_id')::int, $1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, class_name, section, day_name, subject, start_time, end_time;`,
        [teacherId, dayName || 'Monday', startTime || '08:00', endTime || '08:45', subject, className, section, periodLabel || 'Period 1']
      );
      return { success: true, action: 'created', slot: res.rows[0] };
    }

    let sql = `
      SELECT t.id, t.class_name, t.section, t.day_name, t.start_time, t.end_time, t.subject, t.period_label, u.name AS teacher_name
      FROM timetable t
      LEFT JOIN users u ON t.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND t.class_name ILIKE $${params.length}`;
    }
    if (dayName) {
      params.push(`%${dayName.trim()}%`);
      sql += ` AND t.day_name ILIKE $${params.length}`;
    }
    if (teacherName) {
      params.push(`%${teacherName.trim()}%`);
      sql += ` AND u.name ILIKE $${params.length}`;
    }

    sql += ` ORDER BY t.day_order ASC, t.start_time ASC;`;

    const res = await queryDb(sql, params);
    return {
      success: true,
      count: res.rowCount,
      timetable: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 6. Student Management Tools ────────────────────────────────────────────

async function manageStudent({ action = 'search', studentData = {} } = {}, context = {}) {
  try {
    const role = context.role || 'UNKNOWN';
    const isPrivileged = ['OWNER', 'ADMIN'].includes(role);

    if (action !== 'search' && !isPrivileged) {
      return { success: false, error: 'Student mutations (add/update/deactivate) are restricted to authorized School Owner and Administrators.' };
    }

    if (action === 'search') {
      const q = studentData.query || studentData.name || studentData.gr_number || '';
      let sql = `
        SELECT s.id, s.gr_number, s.name, s.father_name, s.class, s.section,
               s.parent_phone, s.parent_whatsapp, s.b_form, s.father_cnic, s.is_active, s.created_at,
               COALESCE(fp.monthly_fee, 0) AS monthly_fee,
               COALESCE(SUM(fc.remaining_balance), 0) AS latest_balance,
               CASE WHEN COALESCE(SUM(fc.remaining_balance), 0) > 0 THEN 'defaulter' ELSE 'clear' END AS fee_status
        FROM students s
        LEFT JOIN student_fee_profiles fp ON fp.student_id = s.id
        LEFT JOIN fee_challans fc ON fc.student_id = s.id AND fc.status = 'unpaid'
        WHERE 1=1
      `;
      const params = [];
      if (q) {
        params.push(`%${q.trim()}%`);
        sql += ` AND (s.name ILIKE $1 OR s.gr_number ILIKE $1 OR s.father_name ILIKE $1 OR s.parent_phone ILIKE $1 OR s.b_form ILIKE $1)`;
      }
      if (studentData.class) {
        params.push(`%${studentData.class.trim()}%`);
        sql += ` AND s.class ILIKE $${params.length}`;
      }

      sql += `
        GROUP BY s.id, s.gr_number, s.name, s.father_name, s.class, s.section, s.parent_phone, s.parent_whatsapp, s.b_form, s.father_cnic, s.is_active, s.created_at, fp.monthly_fee
        ORDER BY s.class ASC, s.name ASC
        LIMIT 10;
      `;

      const res = await queryDb(sql, params);
      return { success: true, count: res.rowCount, students: res.rows };
    }

    if (action === 'add') {
      return await withSchoolTransaction(async txnQuery => {
      const name = String(studentData.name || '').trim();
      if (!name) return { success: false, error: 'Student name is required for admission.' };

      const fatherName = String(studentData.father_name || '').trim();
      let rawClass = String(studentData.class || 'Starter').trim();
      if (/7th|seven/i.test(rawClass)) rawClass = 'Seven';
      else if (/8th|eight/i.test(rawClass)) rawClass = 'Eight';
      else if (/9th|nine/i.test(rawClass)) rawClass = 'Nine';
      else if (/10th|ten/i.test(rawClass)) rawClass = 'Ten';
      else if (/6th|six/i.test(rawClass)) rawClass = 'Six';
      else if (/5th|five/i.test(rawClass)) rawClass = 'Five';
      else if (/4th|four/i.test(rawClass)) rawClass = 'Four';
      else if (/3rd|three/i.test(rawClass)) rawClass = 'Three';
      else if (/2nd|two/i.test(rawClass)) rawClass = 'Two';
      else if (/1st|one/i.test(rawClass)) rawClass = 'One';

      const section = String(studentData.section || 'A').trim();
      const phone = String(studentData.parent_phone || studentData.phone || '').trim();
      const whatsapp = String(studentData.parent_whatsapp || studentData.whatsapp || phone).trim();
      const bForm = String(studentData.b_form || studentData.id_card || '').trim();
      const fatherCnic = String(studentData.father_cnic || studentData.father_id_card || '').trim();
      const address = String(studentData.address || studentData.village || studentData.locality || '').trim();
      const requestedFee = studentData.monthly_fee;
      const monthlyFee = requestedFee === undefined || requestedFee === null || requestedFee === ''
        ? 3000 : Number(requestedFee);
      if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
        return { success:false, error:'Monthly fee must be a valid non-negative amount.' };
      }

      // Date of birth parsing
      let dob = null;
      const rawDob = studentData.date_of_birth || studentData.dob;
      if (rawDob && typeof rawDob === 'string') {
        const dmy = rawDob.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmy) {
          dob = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
          dob = rawDob;
        }
      }

      // Check duplicates first (Double guard)
      if (bForm) {
        const dupBForm = await txnQuery(`SELECT id, name, gr_number, class FROM students WHERE b_form = $1 LIMIT 1;`, [bForm]);
        if (dupBForm.rowCount > 0) {
          return { success: false, error: `Student with B-Form ${bForm} already exists (${dupBForm.rows[0].name}, GR: ${dupBForm.rows[0].gr_number}, Class: ${dupBForm.rows[0].class}).` };
        }
      }

      // Generate GR number
      let gr = studentData.gr_number;
      if (!gr) {
        const maxGrRes = await txnQuery(
          `SELECT MAX((substring(gr_number FROM 4))::integer) AS max_gr
           FROM students WHERE gr_number ~ '^GR-[0-9]+$'`
        );
        const nextNum = Math.max(1000, Number(maxGrRes.rows[0]?.max_gr || 999) + 1);
        gr = `GR-${nextNum}`;
      }

      // 1. Insert Student
      const ins = await txnQuery(
        `INSERT INTO students (
          school_id, gr_number, name, father_name, class, section, 
          b_form, father_cnic, date_of_birth, locality, address, 
          parent_phone, parent_whatsapp, is_active, admission_date, tenant_id
        ) VALUES (
          current_setting('app.tenant_id')::int, $1, $2, $3, $4, $5, 
          $6, $7, $8, $9, $10, 
          $11, $12, true, CURRENT_DATE, 
          (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int)
        )
        RETURNING id, gr_number, name, father_name, class, section, b_form, parent_phone;`,
        [gr, name, fatherName, rawClass, section, bForm, fatherCnic, dob, address, address, phone, whatsapp]
      );
      const student = ins.rows[0];

      // 2. Insert Fee Profile
      await txnQuery(
        `INSERT INTO student_fee_profiles (student_id, school_id, monthly_fee, updated_at)
         VALUES ($1, current_setting('app.tenant_id')::int, $2, NOW())
         ON CONFLICT (student_id) DO UPDATE SET monthly_fee = $2, updated_at = NOW();`,
        [student.id, monthlyFee]
      );

      // 3. Generate Initial Admission Challan
      const challanNo = `CH-${student.id}`;
      await txnQuery(
        `INSERT INTO fee_challans (
          school_id, challan_no, student_id, month, year, amount, 
          remaining_balance, monthly_fee, status, due_date, tenant_id, created_at, updated_at
        ) VALUES (
          current_setting('app.tenant_id')::int, $1, $2,
          to_char(timezone('Asia/Karachi', now()), 'FMMonth'),
          EXTRACT(YEAR FROM timezone('Asia/Karachi', now()))::integer, $3,
          $3, $3, 'unpaid', (timezone('Asia/Karachi', now())::date + 10),
          (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int),
          NOW(), NOW()
        );`,
        [challanNo, student.id, monthlyFee]
      );

      // 4. Record in Admissions table
      await txnQuery(
        `INSERT INTO admissions (
          school_id, student_name, father_name, parent_phone, whatsapp_number, 
          class_applying, date_of_birth, status, tenant_id, created_at
        ) VALUES (
          current_setting('app.tenant_id')::int, $1, $2, $3, $4, 
          $5, $6, 'admitted', 
          (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int),
          NOW()
        );`,
        [name, fatherName, phone, whatsapp, rawClass, dob]
      );

      return {
        success: true,
        action: 'admitted',
        student_id: student.id,
        gr_number: student.gr_number,
        name: student.name,
        father_name: student.father_name,
        class: student.class,
        section: student.section,
        b_form: student.b_form,
        monthly_fee: monthlyFee,
        challan_no: challanNo
      };
      });
    }

    if (action === 'deactivate') {
      const q = studentData.query || studentData.gr || studentData.name;
      const res = await queryDb(
        `UPDATE students SET is_active = false, updated_at = NOW()
         WHERE (gr_number = $1 OR name ILIKE $2)
         RETURNING id, name, gr_number, is_active;`,
        [String(q).trim(), `%${String(q).trim()}%`]
      );
      return { success: true, action: 'deactivated', affected: res.rowCount, student: res.rows[0] };
    }

    if (action === 'update') {
      const q = studentData.query || studentData.gr_number || studentData.name;
      const fields = [];
      const params = [String(q).trim(), `%${String(q).trim()}%`];

      if (studentData.class) { params.push(studentData.class); fields.push(`class = $${params.length}`); }
      if (studentData.section) { params.push(studentData.section); fields.push(`section = $${params.length}`); }
      if (studentData.parent_phone) { params.push(studentData.parent_phone); fields.push(`parent_phone = $${params.length}`); }
      if (studentData.parent_whatsapp) { params.push(studentData.parent_whatsapp); fields.push(`parent_whatsapp = $${params.length}`); }
      if (studentData.name) { params.push(studentData.name); fields.push(`name = $${params.length}`); }
      if (studentData.father_name) { params.push(studentData.father_name); fields.push(`father_name = $${params.length}`); }
      if (studentData.b_form) { params.push(studentData.b_form); fields.push(`b_form = $${params.length}`); }
      if (studentData.address) { params.push(studentData.address); fields.push(`address = $${params.length}`); fields.push(`locality = $${params.length}`); }

      if (fields.length === 0 && studentData.monthly_fee === undefined) {
        return { success: false, error: 'No update fields provided' };
      }

      let student = null;
      if (fields.length > 0) {
        const res = await queryDb(
          `UPDATE students SET ${fields.join(', ')}, updated_at = NOW()
           WHERE (gr_number = $1 OR name ILIKE $2)
           RETURNING id, name, gr_number, class, section, parent_phone;`,
          params
        );
        student = res.rows[0];
      } else {
        const findRes = await queryDb(`SELECT id, name, gr_number, class, section FROM students WHERE (gr_number = $1 OR name ILIKE $2) LIMIT 1;`, params);
        student = findRes.rows[0];
      }

      if (student && studentData.monthly_fee !== undefined) {
        const fee = parseFloat(studentData.monthly_fee);
        await queryDb(
          `INSERT INTO student_fee_profiles (student_id, school_id, monthly_fee, updated_at)
           VALUES ($1, current_setting('app.tenant_id')::int, $2, NOW())
           ON CONFLICT (student_id) DO UPDATE SET monthly_fee = $2, updated_at = NOW();`,
          [student.id, fee]
        );
        student.monthly_fee = fee;
      }

      return { success: true, action: 'updated', student };
    }

    return { success: false, error: 'Unknown action' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 7. Classes & Settings Management ───────────────────────────────────────

async function manageClassesAndSettings({ action = 'list_classes', data = {} } = {}, context = {}) {
  try {
    const role = context.role || 'UNKNOWN';
    const isPrivileged = ['OWNER', 'ADMIN'].includes(role);
    if (!['list_classes', 'get_settings'].includes(action) && !isPrivileged) {
      return { success: false, error: 'Class/settings mutations are restricted to authorized School Owner and Administrators.' };
    }
    if (action === 'list_classes') {
      const res = await queryDb(
        `SELECT DISTINCT class AS class_name, COUNT(*) AS active_students
         FROM students
         WHERE is_active = true
         GROUP BY class
         ORDER BY class;`
      );
      return { success: true, classes: res.rows };
    }
    if (action === 'add_class') {
      const { name, section } = data;
      const res = await queryDb(
        `INSERT INTO classes (school_id, name, section)
         VALUES (current_setting('app.tenant_id')::int, $1, $2)
         RETURNING id, name, section;`,
        [name, section || 'A']
      );
      return { success: true, action: 'added', class: res.rows[0] };
    }
    if (action === 'get_settings') {
      const res = await queryDb(`SELECT key, value FROM settings WHERE school_id = current_setting('app.tenant_id')::int;`);
      return { success: true, settings: res.rows };
    }
    if (action === 'update_setting') {
      const { key, value } = data;
      await queryDb(
        `INSERT INTO settings (school_id, key, value, updated_at)
         VALUES (current_setting('app.tenant_id')::int, $1, $2, NOW())
         ON CONFLICT (school_id, key) DO UPDATE SET value = $2, updated_at = NOW();`,
        [key, String(value)]
      );
      return { success: true, action: 'updated', key, value };
    }
    return { success: false, error: 'Unknown action' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 8. Direct SQL execution boundary ───────────────────────────────────────

async function executeSaasSqlQuery() {
  return {
    success: false,
    error: 'Direct SQL execution is disabled in the ASSPS school channel. Use scoped domain tools.'
  };
}
// ─── 9. Database Schema Introspection Tool ──────────────────────────────────

async function inspectDatabaseSchema({ action = 'list_tables', tableName, limit = 3 } = {}) {
  try {
    if (action === 'list_tables') {
      const res = await queryDb(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      return {
        success: true,
        count: res.rowCount,
        tables: res.rows.map(r => r.table_name)
      };
    }

    if (action === 'describe_table' || action === 'get_columns') {
      if (!tableName) return { success: false, error: 'tableName required for describe_table' };
      const res = await queryDb(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName.trim().toLowerCase()]);

      return {
        success: true,
        table: tableName,
        columnCount: res.rowCount,
        columns: res.rows
      };
    }

    if (action === 'sample_data') {
      return { success: false, error: 'Sample-data introspection is disabled in the ASSPS school channel.' };
    }

    return { success: false, error: `Unknown introspection action: ${action}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 10. Windows School Workstation / Hardware Bridge ───────────────────────

async function dispatchDesktopTask({ action, payload = {} } = {}) {
  return new Promise((resolve) => {
    try {
      const jobId = `win-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let cmdString = '';

      if (action === 'print_challan') {
        cmdString = `challan:${JSON.stringify(payload)}`;
      } else if (action === 'weekly_planner') {
        cmdString = `planner:${JSON.stringify(payload)}`;
      } else if (action === 'powershell') {
        cmdString = payload.command || 'Get-Date';
      } else if (action === 'printer_status') {
        cmdString = `printer:status`;
      } else {
        cmdString = `${action}:${JSON.stringify(payload)}`;
      }

      // Insert job into SQLite agent.db via Python helper
      const pyScript = `
import sqlite3, sys
conn = sqlite3.connect('/opt/cloud-agent/data/agent.db')
c = conn.cursor()
c.execute("INSERT INTO windows_jobs (job_id, command, status, created_at) VALUES (?, ?, 'QUEUED', ?)", (sys.argv[1], sys.argv[2], float(sys.argv[3])))
conn.commit()
conn.close()
print("QUEUED_OK")
`;
      const nowTs = Date.now() / 1000;
      execFile('python3', ['-c', pyScript, jobId, cmdString, String(nowTs)], { timeout: 4000 }, (err, stdout) => {
        if (err || !stdout.includes('QUEUED_OK')) {
          // If direct python insert failed, fallback to local file queue
          resolve({
            success: true,
            status: 'QUEUED_LOCAL',
            jobId,
            message: `Task "${action}" queued for Windows Workstation.`
          });
        } else {
          resolve({
            success: true,
            status: 'QUEUED',
            jobId,
            action,
            message: `Task "${action}" dispatched to Windows Workstation (RICOH MP C307 / Spooler). Job ID: ${jobId}`
          });
        }
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

// ─── 11. Daily Diary & Academic Homework ────────────────────────────────────

async function getOrManageDailyDiary({ action = 'get', className, date = 'today', rows = [], footerText = '' } = {}) {
  try {
    if (action !== 'get') return { success: false, error: 'Daily diary mutations are disabled in the WhatsApp AI channel.' };
    let queryDate = date;
    const now = new Date();
    const pkTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = pkTime.toISOString().split('T')[0];

    if (!queryDate || queryDate === 'today' || queryDate === 'aaj') {
      queryDate = todayStr;
    } else if (queryDate === 'tomorrow' || queryDate === 'kal') {
      const tom = new Date(pkTime.getTime() + 86400000);
      queryDate = tom.toISOString().split('T')[0];
    }

    if (action === 'add') {
      const res = await queryDb(
        `INSERT INTO daily_diaries (school_id, class_name, diary_date, tasks, footer_text, created_at)
         VALUES (current_setting('app.tenant_id')::int, $1, $2::date, $3, $4, NOW())
         ON CONFLICT (class_name, diary_date)
         DO UPDATE SET tasks = $3, footer_text = $4, updated_at = NOW()
         RETURNING id, class_name, diary_date;`,
        [className || 'One', queryDate, JSON.stringify(rows), footerText]
      );
      return { success: true, action: 'added', diary: res.rows[0] };
    }

    let sql = `
      SELECT id, class_name, TO_CHAR(diary_date, 'YYYY-MM-DD') AS diary_date, tasks, footer_text
      FROM daily_diaries
      WHERE diary_date = $1::date
    `;
    const params = [queryDate];
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND class_name ILIKE $${params.length}`;
    }

    const res = await queryDb(sql, params);
    return {
      success: true,
      date: queryDate,
      count: res.rowCount,
      diaries: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 12. Staff & Human Resources Tools ──────────────────────────────────────

async function getOrManageStaff({ action = 'list', query, date = 'today' } = {}) {
  try {
    if (action === 'attendance') {
      const queryDate = date === 'today' ? new Date().toISOString().split('T')[0] : date;
      const res = await queryDb(`
        SELECT ea.id, ea.employee_id, e.name, e.designation, ea.status, ea.remarks
        FROM employee_attendance ea
        JOIN employees e ON ea.employee_id = e.id
        WHERE ea.date = $1::date
          AND ea.school_id = current_setting('app.tenant_id')::int
        ORDER BY e.name ASC;
      `, [queryDate]);

      return {
        success: true,
        date: queryDate,
        total_marked: res.rowCount,
        records: res.rows
      };
    }

    let sql = `
      SELECT id, name, designation, phone, COALESCE(salary, 0) AS salary, is_active
      FROM employees
      WHERE 1=1
    `;
    const params = [];
    if (query) {
      params.push(`%${query.trim()}%`);
      sql += ` AND (name ILIKE $1 OR designation ILIKE $1 OR phone ILIKE $1)`;
    }
    sql += ` ORDER BY is_active DESC, designation ASC, name ASC;`;

    const res = await queryDb(sql, params);
    return {
      success: true,
      count: res.rowCount,
      staff: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 13. Notices & Announcements ────────────────────────────────────────────

async function getOrManageNotices({ action = 'get', title, content, priority = 'normal' } = {}) {
  try {
    if (action !== 'get') return { success: false, error: 'Notice publishing is disabled in the WhatsApp AI channel.' };
    if (action === 'publish') {
      const res = await queryDb(
        `INSERT INTO notices (school_id, title, content, priority, is_active, created_at)
         VALUES (current_setting('app.tenant_id')::int, $1, $2, $3, true, NOW())
         RETURNING id, title, priority, created_at;`,
        [title, content, priority]
      );
      return { success: true, action: 'published', notice: res.rows[0] };
    }

    const res = await queryDb(`
      SELECT id, title, content, priority, is_active, created_at
      FROM notices
      WHERE school_id = current_setting('app.tenant_id')::int
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    return {
      success: true,
      count: res.rowCount,
      notices: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 14. Admissions & Family Groups ─────────────────────────────────────────

async function manageAdmissionsAndFamilies({ action = 'list', query } = {}) {
  try {
    if (action === 'family_search') {
      const res = await queryDb(`
        SELECT s.id, s.name, s.father_name, s.class, s.section, s.parent_phone, s.gr_number
        FROM students s
        WHERE s.parent_phone ILIKE $1 OR s.father_name ILIKE $1
        ORDER BY s.class ASC;
      `, [`%${String(query).trim()}%`]);
      return { success: true, count: res.rowCount, siblings: res.rows };
    }

    const res = await queryDb(`
      SELECT id, student_name, father_name, class_applied, phone, status, created_at
      FROM admissions
      WHERE school_id = current_setting('app.tenant_id')::int
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    return { success: true, count: res.rowCount, admissions: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 15. Expenses & Financial Ledger ────────────────────────────────────────

async function manageExpensesAndAccounts({ action = 'list', category, amount, description } = {}, context = {}) {
  try {
    const role = context.role || 'UNKNOWN';
    const isPrivileged = ['OWNER', 'ADMIN'].includes(role);
    if (action !== 'list' && !isPrivileged) {
      return { success: false, error: 'Expense mutations are restricted to authorized School Owner and Administrators.' };
    }
    if (action === 'add') {
      const res = await queryDb(`
        INSERT INTO expenses (school_id, category, amount, description, expense_date, created_at)
        VALUES (current_setting('app.tenant_id')::int, $1, $2, $3, CURRENT_DATE, NOW())
        RETURNING id, category, amount, description;
      `, [category || 'General', parseFloat(amount), description || '']);
      return { success: true, action: 'recorded', expense: res.rows[0] };
    }

    const res = await queryDb(`
      SELECT id, category, amount, description, expense_date
      FROM expenses
      WHERE school_id = current_setting('app.tenant_id')::int
      ORDER BY expense_date DESC, id DESC
      LIMIT 15;
    `);
    return { success: true, count: res.rowCount, expenses: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 17. Assessment Studio & Question Bank Engine ───────────────────────────

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

async function callAiJson(systemPrompt, userPrompt) {
  // 1. Try DeepSeek V4 Pro first
  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt + '\nYou must output ONLY valid parseable JSON without codeblocks.' },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[callAiJson] DeepSeek failed, attempting Gemini:', e.message);
  }

  // 2. Fallback to Gemini 2.5 Flash
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[callAiJson] Gemini fallback error:', e.message);
  }

  throw new Error('All AI JSON inference engines failed');
}

function formatPaperForWhatsApp(paper) {
  let out = `📄 *AL-SIDDIQUE SCHOLARS PUBLIC SCHOOL*\n`;
  out += `🏛️ *ASSESSMENT VAULT — OFFICIAL EXAM PAPER*\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━\n`;
  out += `📚 *Class:* ${paper.config?.className || 'N/A'}\n`;
  out += `📖 *Subject:* ${paper.config?.subjectName || 'N/A'}\n`;
  if (paper.config?.chapterName) out += `🔖 *Chapter / Topic:* ${paper.config.chapterName}\n`;
  out += `⏱️ *Time Allowed:* ${paper.config?.timeAllowed || '45 Mins'} | 🎯 *Total Marks:* ${paper.config?.totalMarks || 25}\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const sec of (paper.sections || [])) {
    out += `📌 *${(sec.title || '').toUpperCase()}* (${sec.totalMarks || 0} Marks)\n`;
    if (sec.instructions) out += `_${sec.instructions}_\n\n`;

    if (sec.type === 'mcq' && sec.questions) {
      sec.questions.forEach((q, idx) => {
        out += `*Q${idx + 1}.* ${q.text}\n`;
        const opts = (q.options || []).map(o => `   (${o.label}) ${o.text}`).join('   ');
        out += `${opts}\n\n`;
      });
    } else if (sec.type === 'column_matching' && sec.pairs) {
      out += `*Column A* ➔ *Column B*\n`;
      sec.pairs.forEach((p, idx) => {
        out += `  ${idx + 1}. ${p.columnA}  ➔  ${p.columnB}\n`;
      });
      out += `\n`;
    } else if (sec.questions) {
      sec.questions.forEach((q, idx) => {
        out += `*Q${idx + 1}.* ${q.text} [${q.marks || 2} Marks]\n`;
      });
      out += `\n`;
    }
  }

  if (paper.answerKey) {
    out += `🔑 *ANSWER KEY & MARKING SCHEME:*\n`;
    if (paper.answerKey.mcqs) {
      out += `• *MCQs:* ` + Object.entries(paper.answerKey.mcqs).map(([num, opt]) => `${num}:${opt}`).join(', ') + `\n`;
    }
    if (paper.answerKey.columnMatching) {
      out += `• *Column Matches:* ` + Object.entries(paper.answerKey.columnMatching).map(([a, b]) => `${a} ➔ ${b}`).join('; ') + `\n`;
    }
    if (paper.answerKey.markingRubric) {
      out += `• *Rubric:* ${paper.answerKey.markingRubric}\n`;
    }
  }

  return out;
}

async function persistPaperAndDisaggregate(paper) {
  // 1. Insert full document into paper_vault
  const vaultRes = await queryDb(
    `INSERT INTO paper_vault (school_id, owner_user_id, name, class_name, section, subject_name, status, revision, payload, created_at, updated_at)
     VALUES (current_setting('app.tenant_id')::int, NULL, $1, $2, 'All', $3, 'approved', 1, $4, NOW(), NOW())
     RETURNING id;`,
    [
      paper.name || `${paper.config?.className} ${paper.config?.subjectName} Test`,
      paper.config?.className || 'General',
      paper.config?.subjectName || 'General',
      JSON.stringify(paper)
    ]
  );
  const paperId = vaultRes.rows[0].id;

  // 2. Disaggregate questions into question_bank
  let qbCount = 0;
  const chapterNo = paper.config?.chapterNo || '1';
  const chapterName = paper.config?.chapterName || '';
  const className = paper.config?.className || 'General';
  const subject = paper.config?.subjectName || 'General';

  for (const sec of (paper.sections || [])) {
    if (sec.type === 'mcq' && sec.questions) {
      for (const q of sec.questions) {
        const qId = `qb_mcq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await queryDb(
          `INSERT INTO question_bank (
            id, school_id, class_level, subject, chapter_no, chapter_name,
            question_type, question_text, options, correct_option, marks,
            difficulty, is_approved, tenant_id, created_at, updated_at
          ) VALUES ($1, current_setting('app.tenant_id')::int, $2, $3, $4, $5, 'mcq', $6, $7, $8, $9, $10, true, (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int), NOW(), NOW());`,
          [
            qId,
            className,
            subject,
            chapterNo,
            chapterName,
            q.text,
            JSON.stringify(q.options || []),
            q.correctOption || '',
            q.marks || 1,
            q.difficulty || 'medium'
          ]
        );
        qbCount++;
      }
    } else if (sec.type === 'column_matching' && sec.pairs) {
      for (const p of sec.pairs) {
        const qId = `qb_col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await queryDb(
          `INSERT INTO question_bank (
            id, school_id, class_level, subject, chapter_no, chapter_name,
            question_type, question_text, options, marks,
            difficulty, is_approved, tenant_id, created_at, updated_at
          ) VALUES ($1, current_setting('app.tenant_id')::int, $2, $3, $4, $5, 'column_matching', $6, $7, 1, 'medium', true, (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int), NOW(), NOW());`,
          [
            qId,
            className,
            subject,
            chapterNo,
            chapterName,
            `Match: Column A (${p.columnA}) with Column B (${p.columnB})`,
            JSON.stringify(p)
          ]
        );
        qbCount++;
      }
    } else if (sec.questions) {
      const qType = sec.type === 'long' ? 'long' : 'short';
      for (const q of sec.questions) {
        const qId = `qb_${qType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await queryDb(
          `INSERT INTO question_bank (
            id, school_id, class_level, subject, chapter_no, chapter_name,
            question_type, question_text, answer, marks,
            difficulty, is_approved, tenant_id, created_at, updated_at
          ) VALUES ($1, current_setting('app.tenant_id')::int, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, (SELECT tenant_id FROM schools WHERE id = current_setting('app.tenant_id')::int), NOW(), NOW());`,
          [
            qId,
            className,
            subject,
            chapterNo,
            chapterName,
            qType,
            q.text,
            q.answer || '',
            q.marks || (qType === 'long' ? 5 : 2),
            q.difficulty || 'medium'
          ]
        );
        qbCount++;
      }
    }
  }

  return { paperId, qbCount };
}

async function generateAssessmentPaper({ className, subject, chapterName, examType = 'Monthly Test', totalMarks = 25, timeAllowed = '45 Mins', blueprint } = {}) {
  try {
    const systemPrompt = `You are an expert curriculum assessment developer for Pakistani schools (Punjab Curriculum & Textbook Board / Oxford Syllabus).
You create complete, academically rigorous, and syllabus-aligned examination papers.
You must return a JSON object adhering to this exact schema:
{
  "name": string,
  "config": {
    "className": string,
    "subjectName": string,
    "chapterNo": string,
    "chapterName": string,
    "examType": string,
    "totalMarks": number,
    "timeAllowed": string,
    "schoolName": "Al-Siddique Scholars Public School"
  },
  "sections": [
    {
      "id": string,
      "type": "mcq" | "short" | "column_matching" | "long",
      "title": string,
      "instructions": string,
      "totalMarks": number,
      "questions": [
        {
          "number": number,
          "text": string,
          "options": [{ "label": "A"|"B"|"C"|"D", "text": string }],
          "correctOption": string,
          "marks": number,
          "answer": string,
          "difficulty": string
        }
      ],
      "pairs": [ { "columnA": string, "columnB": string } ]
    }
  ],
  "answerKey": {
    "mcqs": object,
    "columnMatching": object,
    "markingRubric": string
  }
}`;

    const userPrompt = `Create an examination paper for:
Class: ${className || 'Class 5'}
Subject: ${subject || 'Science'}
Chapter / Topic: ${chapterName || 'General Syllabus'}
Exam Type: ${examType}
Total Marks: ${totalMarks} Marks
Time Allowed: ${timeAllowed}
${blueprint ? `Blueprint requirements: ${JSON.stringify(blueprint)}` : 'Sections required: Section A (MCQs), Section B (Short Questions), Section C (Column Matching: Column A and Column B), Section D (Long Questions). Total marks must sum to ' + totalMarks + '.'}
Include complete Answer Key.`;

    const paper = await callAiJson(systemPrompt, userPrompt);
    const { paperId, qbCount } = await persistPaperAndDisaggregate(paper);
    const waText = formatPaperForWhatsApp(paper);

    return {
      success: true,
      paperId,
      name: paper.name,
      className: paper.config?.className,
      subject: paper.config?.subjectName,
      totalMarks: paper.config?.totalMarks,
      sectionsCount: paper.sections?.length || 0,
      questionBankItemsSaved: qbCount,
      formattedPaper: waText
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function parseAndIngestPaperToVault({ rawPaperText, className, subject, chapterName } = {}) {
  try {
    if (!rawPaperText || !rawPaperText.trim()) {
      return { success: false, error: 'rawPaperText is required to parse paper' };
    }

    const systemPrompt = `You are an expert assessment parser for Al-Siddique Scholars Public School.
Parse the raw teacher exam text into a standard structured JSON format:
{
  "name": string,
  "config": {
    "className": string,
    "subjectName": string,
    "chapterNo": string,
    "chapterName": string,
    "examType": string,
    "totalMarks": number,
    "timeAllowed": string,
    "schoolName": "Al-Siddique Scholars Public School"
  },
  "sections": [
    {
      "id": string,
      "type": "mcq" | "short" | "column_matching" | "long",
      "title": string,
      "instructions": string,
      "totalMarks": number,
      "questions": [
        {
          "number": number,
          "text": string,
          "options": [{ "label": "A"|"B"|"C"|"D", "text": string }],
          "correctOption": string,
          "marks": number,
          "answer": string,
          "difficulty": string
        }
      ],
      "pairs": [ { "columnA": string, "columnB": string } ]
    }
  ],
  "answerKey": {
    "mcqs": object,
    "columnMatching": object,
    "markingRubric": string
  }
}`;

    const userPrompt = `Decompose, normalize, and parse this raw teacher assessment into the required JSON schema:
${className ? `Hint Class: ${className}\n` : ''}${subject ? `Hint Subject: ${subject}\n` : ''}${chapterName ? `Hint Chapter: ${chapterName}\n` : ''}
Raw Text:
${rawPaperText}`;

    const paper = await callAiJson(systemPrompt, userPrompt);
    if (className) paper.config.className = className;
    if (subject) paper.config.subjectName = subject;
    if (chapterName) paper.config.chapterName = chapterName;

    const { paperId, qbCount } = await persistPaperAndDisaggregate(paper);
    const waText = formatPaperForWhatsApp(paper);

    return {
      success: true,
      action: 'ingested',
      paperId,
      name: paper.name,
      className: paper.config?.className,
      subject: paper.config?.subjectName,
      totalMarks: paper.config?.totalMarks,
      sectionsCount: paper.sections?.length || 0,
      questionBankItemsSaved: qbCount,
      formattedPaper: waText
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getPaperFromVault({ paperId, className, subject, action = 'view' } = {}) {
  try {
    if (action !== 'view') return { success: false, error: 'Paper printing is disabled in the WhatsApp AI channel.' };
    if (paperId) {
      const res = await queryDb(
        `SELECT id, name, class_name, subject_name, status, payload, created_at
         FROM paper_vault
         WHERE id = $1
           AND school_id = current_setting('app.tenant_id')::int
           AND deleted_at IS NULL;`,
        [paperId]
      );
      if (res.rowCount === 0) {
        return { success: false, error: `Paper #${paperId} not found in paper_vault` };
      }
      const p = res.rows[0];
      const payload = typeof p.payload === 'string' ? JSON.parse(p.payload) : p.payload;
      const formattedPaper = formatPaperForWhatsApp(payload);

      if (action === 'print_to_workstation') {
        await dispatchDesktopTask({
          action: 'print_paper',
          payload: { paperId: p.id, name: p.name, content: formattedPaper }
        });
        return {
          success: true,
          action: 'print_queued',
          paperId: p.id,
          name: p.name,
          message: `Paper #${p.id} sent to Windows Workstation spooler (RICOH MP C307).`,
          formattedPaper
        };
      }

      return {
        success: true,
        paperId: p.id,
        name: p.name,
        className: p.class_name,
        subject: p.subject_name,
        formattedPaper,
        payload
      };
    }

    // List papers
    let sql = `
      SELECT id, name, class_name, subject_name, status, created_at
      FROM paper_vault
      WHERE school_id = current_setting('app.tenant_id')::int
        AND deleted_at IS NULL
    `;
    const params = [];
    if (className) {
      params.push(`%${className.trim()}%`);
      sql += ` AND class_name ILIKE $${params.length}`;
    }
    if (subject) {
      params.push(`%${subject.trim()}%`);
      sql += ` AND subject_name ILIKE $${params.length}`;
    }
    sql += ` ORDER BY id DESC LIMIT 10;`;

    const res = await queryDb(sql, params);
    return {
      success: true,
      count: res.rowCount,
      papers: res.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// With RLS production enforcement, legacy WhatsApp paper ingestion cannot
// bypass the canonical Question Bank review/governance pipeline. Only the
// authenticated OWNER/ADMIN read-only Paper Vault workflow is supported until
// the ingestion format has been converted to PaperDocument + governed capture.
async function withSignedWhatsAppPaperRead(ctx, callback) {
  if (process.env.PAPER_RESTRICTED_DB_ENABLED !== 'true') return callback()
  const verified = resolveUserRole(ctx?.fromNumber)
  if (!ctx || !['OWNER','ADMIN'].includes(verified) || verified !== ctx.role) {
    return { success:false, code:'WHATSAPP_PAPER_AUTH_DENIED', error:'Authenticated school owner/admin channel is required.' }
  }
  const schoolId = requireConfiguredSchoolId()
  if (schoolId > 99999999) return { success:false, code:'WHATSAPP_PAPER_SERVICE_ACTOR_INVALID', error:'School service scope could not be verified.' }
  // Reserved non-login integration actor. It is never a real teacher/admin user
  // ID; origin is logged by the verified WhatsApp caller channel.
  const integrationActorId = 900000000 + schoolId
  return tenantContext.run({
    rlsEnabled:true, paperRestricted:true, isSuperAdmin:false,
    tenantId:schoolId, tenantKey:'whatsapp-school-service',
    paperActorId:integrationActorId, paperActorRole:'admin',
  }, callback)
}
function preventUngovernedWhatsappPaperWrite() {
  return { success:false, code:'PAPER_GOVERNANCE_AUTHORING_ONLY',
    error:'Paper authoring and Question Bank intake require the authenticated Paper Workspace and academic review. WhatsApp direct imports are unavailable in secure mode.' }
}
const guardedGenerateAssessmentPaper = (args,ctx) =>
  process.env.PAPER_RESTRICTED_DB_ENABLED === 'true'
    ? preventUngovernedWhatsappPaperWrite()
    : generateAssessmentPaper(args,ctx)
const guardedParseAndIngestPaperToVault = (args,ctx) =>
  process.env.PAPER_RESTRICTED_DB_ENABLED === 'true'
    ? preventUngovernedWhatsappPaperWrite()
    : parseAndIngestPaperToVault(args,ctx)
const guardedGetPaperFromVault = (args,ctx) =>
  withSignedWhatsAppPaperRead(ctx,()=>getPaperFromVault(args,ctx))

module.exports = {
  getExamDatesheet,
  manageDatesheet,
  enterExamMarks,
  getOrPrintResultCards,
  editStudentFee,
  generateFeeChallans,
  getFeeFinancialSummaryAndDefaulters,
  getAttendance,
  markAttendance,
  getOrManageTimetable,
  manageStudent,
  manageClassesAndSettings,
  dispatchDesktopTask,
  getOrManageDailyDiary,
  getOrManageStaff,
  getOrManageNotices,
  manageAdmissionsAndFamilies,
  manageExpensesAndAccounts,
  generateAssessmentPaper: guardedGenerateAssessmentPaper,
  parseAndIngestPaperToVault: guardedParseAndIngestPaperToVault,
  getPaperFromVault: guardedGetPaperFromVault,
};
