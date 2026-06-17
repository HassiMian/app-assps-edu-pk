// src/config/migrate.js
// Al Siddique Smart School OS - Database Migration
// Run: node src/config/migrate.js

require('dotenv').config({ path: __dirname + '/../../.env' })
const bcrypt = require('bcryptjs')
const { pool } = require('./database')

async function migrate() {
  console.log('\nRunning database migration...\n')

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(150) NOT NULL,
        code              VARCHAR(50) UNIQUE,
        status            VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','trial','suspended','closed')),
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        feature_flags     JSONB DEFAULT '[]'::jsonb,
        created_at        TIMESTAMP DEFAULT NOW(),
        updated_at        TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO schools (id, name, code)
      VALUES (1, 'Al Siddique Scholars Public School', 'default')
      ON CONFLICT (id) DO NOTHING;
    `)
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic';`)
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '[]'::jsonb;`)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(100) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('super_admin','admin','principal','teacher','accountant','parent','student')),
        designation VARCHAR(100),
        phone       VARCHAR(20),
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      DROP INDEX IF EXISTS idx_users_email;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `).catch(() => {})
    await pool.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','admin','principal','teacher','accountant','parent','student'));
    `).catch(() => {})
    console.log('users table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id              SERIAL PRIMARY KEY,
        school_id       INTEGER REFERENCES schools(id) DEFAULT 1,
        gr_number       VARCHAR(20) UNIQUE NOT NULL,
        name            VARCHAR(100) NOT NULL,
        father_name     VARCHAR(100),
        mother_name     VARCHAR(100),
        class           VARCHAR(10) NOT NULL,
        section         VARCHAR(5) DEFAULT 'A',
        roll_number     VARCHAR(10),
        date_of_birth   DATE,
        gender          VARCHAR(10) CHECK (gender IN ('male','female')),
        address         TEXT,
        parent_phone    VARCHAR(20),
        parent_whatsapp  VARCHAR(20),
        photo           TEXT,
        admission_date  DATE DEFAULT CURRENT_DATE,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class);
      CREATE INDEX IF NOT EXISTS idx_students_school_active ON students(school_id, is_active);
    `).catch(() => {})
    console.log('students table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        status      VARCHAR(10) CHECK (status IN ('present','absent','late','leave')),
        marked_by   INTEGER REFERENCES users(id),
        note        TEXT,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, date)
      );
    `)
    await pool.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      UPDATE attendance a
      SET school_id = COALESCE((SELECT s.school_id FROM students s WHERE s.id = a.student_id), 1)
      WHERE a.school_id IS NULL OR a.school_id = 1;
      CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    `).catch(() => {})
    console.log('attendance table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fee_challans (
        id            SERIAL PRIMARY KEY,
        school_id     INTEGER REFERENCES schools(id) DEFAULT 1,
        challan_no    VARCHAR(20) UNIQUE NOT NULL,
        student_id    INTEGER REFERENCES students(id) ON DELETE CASCADE,
        month         VARCHAR(20) NOT NULL,
        year          INTEGER NOT NULL,
        amount        DECIMAL(10,2) NOT NULL,
        paid_amount   DECIMAL(10,2) DEFAULT 0,
        discount      DECIMAL(10,2) DEFAULT 0,
        status        VARCHAR(10) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','partial','overdue')),
        due_date      DATE,
        paid_date     DATE,
        payment_mode  VARCHAR(20) CHECK (payment_mode IN ('cash','online','jazzcash','easypaisa')),
        proof_status  VARCHAR(20) DEFAULT 'none' CHECK (proof_status IN ('none','pending','approved','rejected')),
        proof_image   TEXT,
        proof_amount  DECIMAL(10,2),
        proof_method  VARCHAR(20),
        proof_reviewed_by INTEGER REFERENCES users(id),
        proof_reviewed_at TIMESTAMP,
        proof_notes   TEXT,
        created_by    INTEGER REFERENCES users(id),
        payment_note  TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE fee_challans ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_fee_challans_school_id ON fee_challans(school_id);
      CREATE INDEX IF NOT EXISTS idx_fee_challans_student_status ON fee_challans(student_id, status);
    `).catch(() => {})
    console.log('fee_challans table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        name        VARCHAR(100) NOT NULL,
        type        VARCHAR(20) CHECK (type IN ('TE','AS','monthly','weekly')),
        class       VARCHAR(50) NOT NULL,
        session     VARCHAR(20),
        start_date  DATE,
        end_date    DATE,
        total_marks INTEGER DEFAULT 100,
        pass_marks  INTEGER DEFAULT 33,
        created_by  INTEGER REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      ALTER TABLE exams ALTER COLUMN class TYPE VARCHAR(50);
      CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
      CREATE INDEX IF NOT EXISTS idx_exams_school_class ON exams(school_id, class);
    `).catch(() => {})
    console.log('exams table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_results (
        id             SERIAL PRIMARY KEY,
        school_id      INTEGER REFERENCES schools(id) DEFAULT 1,
        exam_id        INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        student_id     INTEGER REFERENCES students(id) ON DELETE CASCADE,
        subject        VARCHAR(50),
        marks_obtained DECIMAL(6,2) DEFAULT 0,
        total_marks    INTEGER DEFAULT 100,
        grade          VARCHAR(5),
        remarks        TEXT,
        created_at     TIMESTAMP DEFAULT NOW(),
        UNIQUE(exam_id, student_id, subject)
      );
    `)
    await pool.query(`
      ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      UPDATE exam_results er
      SET school_id = COALESCE(
        (SELECT e.school_id FROM exams e WHERE e.id = er.exam_id),
        (SELECT s.school_id FROM students s WHERE s.id = er.student_id),
        1
      )
      WHERE er.school_id IS NULL OR er.school_id = 1;
      CREATE INDEX IF NOT EXISTS idx_exam_results_school_id ON exam_results(school_id);
      CREATE INDEX IF NOT EXISTS idx_exam_results_exam_student ON exam_results(exam_id, student_id);
    `).catch(() => {})
    console.log('exam_results table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id            SERIAL PRIMARY KEY,
        school_id     INTEGER REFERENCES schools(id) DEFAULT 1,
        emp_id        VARCHAR(20) UNIQUE NOT NULL,
        name          VARCHAR(100) NOT NULL,
        designation   VARCHAR(100),
        department    VARCHAR(50),
        phone         VARCHAR(20),
        email         VARCHAR(100),
        salary        DECIMAL(10,2),
        join_date     DATE DEFAULT CURRENT_DATE,
        is_active     BOOLEAN DEFAULT true,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_employees_school_id ON employees(school_id);
    `).catch(() => {})
    console.log('employees table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        student_id  INTEGER REFERENCES students(id),
        recipient_role VARCHAR(20),
        title       VARCHAR(255),
        type        VARCHAR(20),
        channel     VARCHAR(20) CHECK (channel IN ('sms','whatsapp','both')),
        phone       VARCHAR(20),
        message     TEXT,
        metadata    JSONB DEFAULT '{}'::jsonb,
        read_at     TIMESTAMP,
        status      VARCHAR(10) DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
        sent_by     INTEGER REFERENCES users(id),
        sent_at     TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS title VARCHAR(255);
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_notification_log_school_id ON notification_log(school_id);
      CREATE INDEX IF NOT EXISTS idx_notification_log_school_role_sent ON notification_log(school_id, recipient_role, sent_at DESC);
    `).catch(() => {})
    console.log('notification_log table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_bank (
        id              TEXT PRIMARY KEY,
        school_id       INTEGER REFERENCES schools(id) DEFAULT 1,
        class_level     VARCHAR(20),
        subject         VARCHAR(100),
        medium          VARCHAR(20) DEFAULT 'english',
        board           VARCHAR(50) DEFAULT 'Punjab Board',
        chapter_no      VARCHAR(20),
        chapter_name    VARCHAR(200),
        topic_name      VARCHAR(200),
        question_type   VARCHAR(50),
        question_subtype VARCHAR(50),
        question_text   TEXT,
        question_text_urdu TEXT,
        question_text_english TEXT,
        options         JSONB DEFAULT '[]',
        correct_option  VARCHAR(10),
        answer          TEXT,
        explanation     TEXT,
        marks           INTEGER DEFAULT 1,
        difficulty      VARCHAR(20) DEFAULT 'medium',
        priority        VARCHAR(20) DEFAULT 'exercise',
        source_type     VARCHAR(50),
        source_file_id  TEXT,
        source_page_no  INTEGER,
        tags            TEXT[] DEFAULT '{}',
        metadata        JSONB DEFAULT '{}',
        is_approved     BOOLEAN DEFAULT false,
        is_duplicate    BOOLEAN DEFAULT false,
        confidence      INTEGER DEFAULT 0,
        created_by      INTEGER REFERENCES users(id),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_qbank_school ON question_bank(school_id);
      CREATE INDEX IF NOT EXISTS idx_qbank_subject ON question_bank(school_id, subject, class_level);
      CREATE INDEX IF NOT EXISTS idx_qbank_chapter ON question_bank(school_id, subject, chapter_name);
      CREATE INDEX IF NOT EXISTS idx_qbank_type ON question_bank(school_id, question_type);
      CREATE INDEX IF NOT EXISTS idx_qbank_approved ON question_bank(school_id, is_approved);
    `).catch(() => {})
    console.log('question_bank table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_bank_imports (
        id              TEXT PRIMARY KEY,
        school_id       INTEGER REFERENCES schools(id) DEFAULT 1,
        ai_job_id       TEXT,
        file_name       TEXT,
        file_size       BIGINT,
        subject         VARCHAR(100),
        class_level     VARCHAR(20),
        medium          VARCHAR(20),
        chapter_no      VARCHAR(20),
        chapter_name    VARCHAR(200),
        source_type     VARCHAR(50),
        status          VARCHAR(30) DEFAULT 'pending',
        total_pages     INTEGER DEFAULT 0,
        pages_processed INTEGER DEFAULT 0,
        questions_found INTEGER DEFAULT 0,
        questions_approved INTEGER DEFAULT 0,
        error_message   TEXT,
        diagnostics     JSONB DEFAULT '{}',
        created_by      INTEGER REFERENCES users(id),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('question_bank_imports table ready')

      await pool.query(`
      CREATE TABLE IF NOT EXISTS online_classes (
        id            SERIAL PRIMARY KEY,
        school_id     INTEGER REFERENCES schools(id) DEFAULT 1,
        teacher_id    INTEGER REFERENCES users(id),
        class_name    VARCHAR(50) NOT NULL,
        section       VARCHAR(20),
        subject       VARCHAR(100) NOT NULL,
        title         VARCHAR(255) NOT NULL,
        class_date    DATE NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        meeting_link  TEXT NOT NULL,
        description   TEXT,
        timezone      VARCHAR(64) DEFAULT 'Asia/Karachi',
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Karachi';
      CREATE INDEX IF NOT EXISTS idx_online_classes_school_date ON online_classes(school_id, class_date);
      CREATE INDEX IF NOT EXISTS idx_online_classes_teacher_date ON online_classes(teacher_id, class_date);
      `).catch(() => {})
      console.log('online_classes table ready')

      await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable (
        id            SERIAL PRIMARY KEY,
        school_id     INTEGER REFERENCES schools(id) DEFAULT 1,
        teacher_id    INTEGER REFERENCES users(id),
        day_order     INTEGER NOT NULL DEFAULT 0,
        day_name      VARCHAR(20) NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        subject       VARCHAR(120) NOT NULL,
        class_name    VARCHAR(50) NOT NULL,
        section       VARCHAR(20) DEFAULT '',
        room          VARCHAR(80) DEFAULT '',
        period_label   VARCHAR(120) DEFAULT '',
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {})
      await pool.query(`
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS day_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS day_name VARCHAR(20) NOT NULL DEFAULT 'Monday';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '08:00';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '08:45';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS subject VARCHAR(120) NOT NULL DEFAULT 'General';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS class_name VARCHAR(50) NOT NULL DEFAULT 'Class 1';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS section VARCHAR(20) DEFAULT '';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS room VARCHAR(80) DEFAULT '';
        ALTER TABLE timetable ADD COLUMN IF NOT EXISTS period_label VARCHAR(120) DEFAULT '';
        CREATE INDEX IF NOT EXISTS idx_timetable_school_teacher_day ON timetable(school_id, teacher_id, day_order, start_time);
      `).catch(() => {})
      console.log('timetable table ready')

      await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        title       TEXT NOT NULL,
        description TEXT,
        event_date  DATE NOT NULL,
        event_type  TEXT DEFAULT 'general',
        color       TEXT DEFAULT 'gold',
        created_by  INTEGER,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      UPDATE events SET school_id = 1 WHERE school_id IS NULL OR school_id = 0;
      CREATE INDEX IF NOT EXISTS idx_events_school_date ON events(school_id, event_date);
    `).catch(() => {})
    console.log('events table ready')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER REFERENCES schools(id) DEFAULT 1,
        type        VARCHAR(20) CHECK (type IN ('student_id','fee_receipt','result_card')),
        student_id  INTEGER REFERENCES students(id),
        card_data   JSONB NOT NULL,
        template    VARCHAR(50) DEFAULT 'default',
        status      VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated','printed','cancelled')),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `)
    await pool.query(`
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_cards_school_id ON cards(school_id);
    `).catch(() => {})
    console.log('cards table ready')

    const adminHash = await bcrypt.hash('admin123', 10)
    await pool.query(`
      INSERT INTO users (name, email, password, role, designation, school_id)
      VALUES ('Muhammad Haseeb Arshad', 'admin@alsiddique.edu.pk', $1, 'admin', 'Principal', 1)
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash])
    console.log('admin user ready')

    const teacherHash = await bcrypt.hash('teacher123', 10)
    await pool.query(`
      INSERT INTO users (name, email, password, role, designation, school_id)
      VALUES ('Teacher Account', 'teacher@alsiddique.edu.pk', $1, 'teacher', 'Class Teacher', 1)
      ON CONFLICT (email) DO NOTHING;
    `, [teacherHash])
    console.log('teacher user ready')

    try {
      const rlsMigration = require('./migrations/005_rls_policies')
      await rlsMigration.up()
    } catch (err) {
      console.error('RLS Migration Error:', err.message)
      // Non-fatal, let the app start but log heavily
    }

    console.log('\nMigration complete.\n')
    return true
  } catch (err) {
    console.error('\nMigration failed:', err.message)
    throw err
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { migrate }
