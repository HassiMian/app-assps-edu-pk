require('dotenv').config({ path: __dirname + '/../../.env' })
const { pool } = require('./database')

async function migrateExamWorkflowV1() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_class_enrollments (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        class_name VARCHAR(120) NOT NULL,
        section VARCHAR(80) NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, exam_id, class_name, section)
      );

      CREATE TABLE IF NOT EXISTS exam_subjects (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        class_name VARCHAR(120) NOT NULL,
        section VARCHAR(80) NOT NULL DEFAULT '',
        subject VARCHAR(160) NOT NULL,
        exam_date DATE,
        paper_time VARCHAR(80),
        total_marks INTEGER,
        pass_marks INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, exam_id, class_name, section, subject)
      );

      CREATE INDEX IF NOT EXISTS idx_exam_enrollments_exam
        ON exam_class_enrollments (school_id, exam_id, class_name, section);

      CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam
        ON exam_subjects (school_id, exam_id, class_name, section, sort_order);

      ALTER TABLE exam_class_enrollments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

      CREATE INDEX IF NOT EXISTS idx_exam_subjects_date
        ON exam_subjects (school_id, exam_id, exam_date);
    `)
    await client.query('COMMIT')
    console.log('EXAM_WORKFLOW_V1_MIGRATION_OK')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  migrateExamWorkflowV1()
    .then(() => pool.end())
    .catch(error => {
      console.error('EXAM_WORKFLOW_V1_MIGRATION_FAILED=' + error.message)
      pool.end().finally(() => process.exit(1))
    })
}

module.exports = { migrateExamWorkflowV1 }
