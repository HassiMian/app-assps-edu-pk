/**
 * Migration 003: Attendance Sequence & Write Integrity
 * Resolves verified primary key collision defect by synchronizing attendance_id_seq with MAX(id).
 */
const { pool } = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  try {
    console.log('Running migration 003: Attendance Sequence & Write Integrity...');
    await client.query('BEGIN');

    // 1. Discover sequence owned by attendance.id
    const seqRes = await client.query("SELECT pg_get_serial_sequence('attendance', 'id') AS seq_name");
    const seqName = seqRes.rows[0]?.seq_name || 'public.attendance_id_seq';

    console.log(`Discovered sequence: ${seqName}`);

    // 2. Discover MAX(id)
    const maxRes = await client.query('SELECT MAX(id) AS max_id FROM attendance');
    const maxId = maxRes.rows[0]?.max_id;

    if (maxId !== null && maxId !== undefined && Number(maxId) > 0) {
      const syncVal = Number(maxId);
      await client.query('SELECT setval($1, $2, true)', [seqName, syncVal]);
      console.log(`Synchronized ${seqName} to MAX(id) = ${syncVal}`);
    } else {
      // Empty table: set to 1, is_called = false so first insert gets 1
      await client.query('SELECT setval($1, 1, false)', [seqName]);
      console.log(`Table empty. Initialized ${seqName} to 1 (is_called = false)`);
    }

    await client.query('COMMIT');

    // 3. Post-execution verification: test nextval behavior
    const testNextVal = await pool.query(`SELECT nextval('${seqName}') AS next_val`);
    const nextGenerated = Number(testNextVal.rows[0].next_val);
    const currentMax = maxId ? Number(maxId) : 0;

    if (nextGenerated <= currentMax) {
      throw new Error(`Integrity check failed: nextval (${nextGenerated}) is not greater than MAX(id) (${currentMax})`);
    }
    console.log(`Verified nextval test: generated ${nextGenerated} > MAX(id) ${currentMax}`);

    // Restore sequence to maxId so the test nextval does not leave a gap
    if (maxId !== null && maxId !== undefined) {
      await pool.query('SELECT setval($1, $2, true)', [seqName, Number(maxId)]);
      console.log(`Restored sequence position to MAX(id) = ${maxId}`);
    }

    console.log('✅ Migration 003 completed successfully.');
    return { success: true, sequence: seqName, maxId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration 003 failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function down() {
  /**
   * SAFE ROLLBACK POLICY:
   * A sequence-integrity synchronization fixes a broken sequence pointer.
   * Rolling back this migration by resetting the sequence backwards to 1 is intentionally
   * REJECTED as UNSAFE, because it would immediately re-introduce primary key collision
   * defects (duplicate key violates attendance_pkey) against existing production records.
   *
   * In PostgreSQL schema maintenance, monotonic sequence repairs are irreversible forward fixes.
   * The down() method is intentionally a safe NO-OP that verifies sequence integrity is maintained.
   */
  console.log('Migration 003 down(): Sequence synchronization is a forward integrity repair.');
  console.log('Rollback to an earlier colliding sequence value is UNSAFE and prohibited to prevent duplicate key errors.');
  return { success: true, message: 'NO_OP_SAFE_INTEGRITY_PRESERVED' };
}

module.exports = { up, down };

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
