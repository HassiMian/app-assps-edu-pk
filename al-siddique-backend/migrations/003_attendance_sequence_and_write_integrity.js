/**
 * Migration 003: Attendance Sequence & Write Integrity (Monotonic Safe)
 *
 * Enforces monotonic sequence integrity on attendance_id_seq:
 * - Discovers sequence via pg_get_serial_sequence.
 * - Inspects MAX(id) and current (last_value, is_called).
 * - Determines if the next generated ID is already strictly greater than MAX(id).
 * - Moves the sequence FORWARD only when behind or collision-prone.
 * - NEVER moves the sequence backwards.
 * - Verification is strictly read-only: NEVER calls nextval().
 * - Safe on empty tables, concurrent-safe, idempotent.
 */

const { pool } = require('../src/config/database');

/**
 * Computes next value that PostgreSQL sequence will generate given last_value and is_called.
 * When is_called is true, nextval() will return last_value + 1.
 * When is_called is false, nextval() will return last_value.
 */
function computeNextVal(lastValue, isCalled) {
  const num = Number(lastValue);
  return isCalled ? num + 1 : num;
}

async function up(options = {}) {
  const dbPool = options.pool || pool;
  const tableName = options.tableName || 'attendance';
  const columnName = options.columnName || 'id';

  const client = await dbPool.connect();
  try {
    console.log(`Running migration 003 (monotonic): ${tableName}.${columnName} sequence integrity...`);
    await client.query('BEGIN');

    // 1. Discover sequence owned by table.column
    const seqRes = await client.query(
      "SELECT pg_get_serial_sequence($1, $2) AS seq_name",
      [tableName, columnName]
    );
    let seqName = seqRes.rows[0]?.seq_name;
    if (!seqName) {
      seqName = `public.${tableName}_${columnName}_seq`;
    }

    console.log(`Discovered sequence: ${seqName}`);

    // 2. Discover MAX(id)
    const maxRes = await client.query(`SELECT MAX("${columnName}") AS max_id FROM "${tableName}"`);
    const rawMaxId = maxRes.rows[0]?.max_id;
    const maxId = (rawMaxId !== null && rawMaxId !== undefined) ? Number(rawMaxId) : null;
    const threshold = (maxId !== null && maxId > 0) ? maxId : 0;

    // 3. Read current sequence status
    const seqStatusRes = await client.query(`SELECT last_value, is_called FROM ${seqName}`);
    if (seqStatusRes.rows.length === 0) {
      throw new Error(`Sequence ${seqName} could not be read`);
    }
    const currentLastVal = Number(seqStatusRes.rows[0].last_value);
    const currentIsCalled = Boolean(seqStatusRes.rows[0].is_called);
    const currentNextVal = computeNextVal(currentLastVal, currentIsCalled);

    console.log(`Current state: MAX(${columnName}) = ${maxId !== null ? maxId : 'NULL (empty table)'}, sequence last_value = ${currentLastVal}, is_called = ${currentIsCalled}, next_generated = ${currentNextVal}`);

    let mutated = false;

    // 4. Assess safety: next generated ID must be > threshold
    if (maxId === null || maxId === 0) {
      // Empty table: safe as long as next generated ID >= 1
      if (currentNextVal < 1) {
        console.log(`Empty table with uninitialized sequence. Setting ${seqName} to 1 (is_called = false)`);
        await client.query('SELECT setval($1, 1, false)', [seqName]);
        mutated = true;
      } else {
        console.log(`Empty table: sequence is already safe (next generated = ${currentNextVal} >= 1). No change.`);
      }
    } else {
      // Populated table
      if (currentNextVal > maxId) {
        console.log(`Sequence ${seqName} is ALREADY SAFE: next generated ID (${currentNextVal}) > MAX(${columnName}) (${maxId}). No change needed.`);
      } else {
        // Sequence is behind or collision-prone: advance forward only!
        const targetVal = Math.max(currentLastVal, maxId);
        console.log(`Advancing sequence ${seqName} forward: last_value set to ${targetVal} (is_called = true)`);
        await client.query('SELECT setval($1, $2, true)', [seqName, targetVal]);
        mutated = true;
      }
    }

    await client.query('COMMIT');

    // 5. Read-only verification: NO nextval() call!
    const verifyRes = await dbPool.query(`SELECT last_value, is_called FROM ${seqName}`);
    const verifiedLastVal = Number(verifyRes.rows[0].last_value);
    const verifiedIsCalled = Boolean(verifyRes.rows[0].is_called);
    const verifiedNextVal = computeNextVal(verifiedLastVal, verifiedIsCalled);

    // Mathematical invariant proof:
    // a) Next generated ID must be strictly greater than MAX(id) (or >= 1 if empty)
    if (maxId !== null && maxId > 0) {
      if (verifiedNextVal <= maxId) {
        throw new Error(`Integrity check failed: next generated ID (${verifiedNextVal}) is not strictly greater than MAX(${columnName}) (${maxId})`);
      }
    } else {
      if (verifiedNextVal < 1) {
        throw new Error(`Integrity check failed: next generated ID (${verifiedNextVal}) is less than 1 on empty table`);
      }
    }

    // b) Monotonicity: sequence last_value must NEVER have moved backwards
    if (verifiedLastVal < currentLastVal && (maxId !== null && maxId > 0)) {
      throw new Error(`Monotonicity invariant violation: sequence last_value moved backwards from ${currentLastVal} to ${verifiedLastVal}`);
    }

    console.log(`✅ Migration 003 completed successfully. Verified safe next generated ID: ${verifiedNextVal} > threshold ${threshold} (mutated: ${mutated})`);
    return {
      success: true,
      sequence: seqName,
      maxId,
      mutated,
      previousLastVal: currentLastVal,
      verifiedLastVal,
      verifiedNextVal,
    };
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
   * A monotonic sequence repair is an irreversible forward fix.
   * Decreasing a sequence backwards in production creates immediate primary key collisions
   * against newly created or existing records.
   * down() is intentionally a safe NO-OP.
   */
  console.log('Migration 003 down(): Monotonic sequence synchronization is forward-only. Rollback is a safe NO-OP to preserve primary key uniqueness.');
  return { success: true, message: 'NO_OP_MONOTONIC_INTEGRITY_PRESERVED' };
}

module.exports = { up, down, computeNextVal };

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
