// al-siddique-backend/src/tests/migration-003-safety.test.js
// Regression test suite for Migration 003 Monotonic Sequence Safety

const assert = require('assert');
const { pool } = require('../config/database');
const { up, computeNextVal } = require('../../migrations/003_attendance_sequence_and_write_integrity');

const TEST_TABLE = 'test_attendance_seq_sandbox';

async function resetTestTable(client) {
  await client.query(`DROP TABLE IF EXISTS "${TEST_TABLE}" CASCADE;`);
  await client.query(`
    CREATE TABLE "${TEST_TABLE}" (
      id SERIAL PRIMARY KEY,
      note TEXT
    );
  `);
}

async function getSeqState(client, seqName) {
  const res = await client.query(`SELECT last_value, is_called FROM ${seqName}`);
  return {
    lastValue: Number(res.rows[0].last_value),
    isCalled: Boolean(res.rows[0].is_called),
  };
}

async function runTests() {
  console.log('🧪 Starting Migration 003 Monotonic Safety Regression Suite...\n');
  const client = await pool.connect();

  try {
    const seqName = `public.${TEST_TABLE}_id_seq`;

    // -------------------------------------------------------------
    // CASE 1: MAX(id)=100, sequence last_value=1
    // Expectation: Migration moves sequence forward safely to >= 100
    // -------------------------------------------------------------
    console.log('--- CASE 1: MAX(id)=100, sequence behind (last_value=1) ---');
    await resetTestTable(client);
    await client.query(`INSERT INTO "${TEST_TABLE}" (id, note) VALUES (100, 'seeded max id');`);
    await client.query(`SELECT setval($1, 1, true);`, [seqName]);

    let res = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mutated, true, 'Migration should have advanced the sequence');
    assert.strictEqual(res.verifiedLastVal, 100);
    assert.strictEqual(res.verifiedNextVal, 101, 'Next generated ID must be 101 > 100');

    // Test actual insert with auto-generated ID
    const insertRes1 = await client.query(`INSERT INTO "${TEST_TABLE}" (note) VALUES ('auto insert') RETURNING id;`);
    assert.strictEqual(insertRes1.rows[0].id, 101, 'Insert must succeed with generated id = 101');
    console.log('✅ CASE 1 passed: sequence safely moved forward to 100, next insert got 101.\n');

    // -------------------------------------------------------------
    // CASE 2: MAX(id)=100, sequence last_value=100, is_called=true
    // Expectation: Sequence is already safe (next is 101). No mutation required.
    // -------------------------------------------------------------
    console.log('--- CASE 2: MAX(id)=100, sequence last_value=100, is_called=true ---');
    await resetTestTable(client);
    await client.query(`INSERT INTO "${TEST_TABLE}" (id, note) VALUES (100, 'seeded max id');`);
    await client.query(`SELECT setval($1, 100, true);`, [seqName]);

    const stateBeforeCase2 = await getSeqState(client, seqName);
    assert.strictEqual(stateBeforeCase2.lastValue, 100);
    assert.strictEqual(stateBeforeCase2.isCalled, true);

    res = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mutated, false, 'No mutation should occur when sequence is already safe');

    const stateAfterCase2 = await getSeqState(client, seqName);
    assert.strictEqual(stateAfterCase2.lastValue, 100);
    assert.strictEqual(stateAfterCase2.isCalled, true);
    console.log('✅ CASE 2 passed: sequence already safe, zero mutation performed.\n');

    // -------------------------------------------------------------
    // CASE 3: MAX(id)=100, sequence last_value=150
    // Expectation: Migration MUST NOT move sequence backwards to 100.
    // -------------------------------------------------------------
    console.log('--- CASE 3: MAX(id)=100, sequence ahead (last_value=150) ---');
    await resetTestTable(client);
    await client.query(`INSERT INTO "${TEST_TABLE}" (id, note) VALUES (100, 'seeded max id');`);
    await client.query(`SELECT setval($1, 150, true);`, [seqName]);

    res = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mutated, false, 'Migration must not touch already higher sequence');
    assert.strictEqual(res.verifiedLastVal, 150, 'Sequence last_value must remain 150 (never reduced)');
    assert.strictEqual(res.verifiedNextVal, 151, 'Next generated ID must be 151');

    const insertRes3 = await client.query(`INSERT INTO "${TEST_TABLE}" (note) VALUES ('auto insert 151') RETURNING id;`);
    assert.strictEqual(insertRes3.rows[0].id, 151);
    console.log('✅ CASE 3 passed: sequence remained at 150, did not rewind to 100.\n');

    // -------------------------------------------------------------
    // CASE 4: Empty table
    // Expectation: First generated ID remains valid (>= 1)
    // -------------------------------------------------------------
    console.log('--- CASE 4: Empty table ---');
    await resetTestTable(client);
    // Sequence fresh: 1, is_called = false
    res = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mutated, false, 'Fresh empty table sequence is already safe');
    assert.strictEqual(res.verifiedNextVal, 1, 'First generated ID must be 1');

    const insertRes4 = await client.query(`INSERT INTO "${TEST_TABLE}" (note) VALUES ('first record') RETURNING id;`);
    assert.strictEqual(insertRes4.rows[0].id, 1, 'First row got id 1');
    console.log('✅ CASE 4 passed: empty table generates valid initial ID.\n');

    // -------------------------------------------------------------
    // CASE 5: Migration run twice (Idempotency)
    // Expectation: Second run changes nothing and preserves exact state
    // -------------------------------------------------------------
    console.log('--- CASE 5: Idempotency (run twice) ---');
    await resetTestTable(client);
    await client.query(`INSERT INTO "${TEST_TABLE}" (id, note) VALUES (50, 'seeded');`);
    await client.query(`SELECT setval($1, 10, true);`, [seqName]); // behind

    const run1 = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(run1.mutated, true);
    assert.strictEqual(run1.verifiedLastVal, 50);

    const run2 = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    assert.strictEqual(run2.mutated, false, 'Second run must do nothing');
    assert.strictEqual(run2.verifiedLastVal, 50, 'Second run preserves exact sequence');
    assert.strictEqual(run2.verifiedNextVal, 51);
    console.log('✅ CASE 5 passed: second execution is a clean no-op.\n');

    // -------------------------------------------------------------
    // CASE 6: No verification nextval() side effect
    // Expectation: Calling migration does NOT consume an ID from the sequence
    // -------------------------------------------------------------
    console.log('--- CASE 6: No verification nextval() side effect ---');
    await resetTestTable(client);
    await client.query(`INSERT INTO "${TEST_TABLE}" (id, note) VALUES (200, 'seeded 200');`);
    await client.query(`SELECT setval($1, 200, true);`, [seqName]);

    const stateBeforeCase6 = await getSeqState(client, seqName);
    res = await up({ pool, tableName: TEST_TABLE, columnName: 'id' });
    const stateAfterCase6 = await getSeqState(client, seqName);

    assert.strictEqual(stateBeforeCase6.lastValue, stateAfterCase6.lastValue, 'last_value must NOT change during verification');
    assert.strictEqual(stateBeforeCase6.isCalled, stateAfterCase6.isCalled, 'is_called must NOT change during verification');
    console.log('✅ CASE 6 passed: zero nextval() side effects during verification.\n');

    console.log('========================================================');
    console.log('🎉 ALL 6 MIGRATION 003 REGRESSION TESTS PASSED!');
    console.log('========================================================\n');
  } finally {
    await client.query(`DROP TABLE IF EXISTS "${TEST_TABLE}" CASCADE;`).catch(() => {});
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failure:', err);
      process.exit(1);
    });
}

module.exports = { runTests };
