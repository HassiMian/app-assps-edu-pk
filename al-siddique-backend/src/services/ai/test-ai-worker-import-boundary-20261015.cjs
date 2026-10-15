'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const target = require.resolve('./aiQueueWorkerDatabase');

async function isolated(mode, probe) {
  const oldFlag = process.env.DB_SIGNED_TENANT_RLS_ENABLED;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldLoader = Module._load;
  let imports = 0;
  let calls = 0;
  try {
    process.env.DB_SIGNED_TENANT_RLS_ENABLED = mode;
    process.env.NODE_ENV = 'test';
    Module._load = function(request, parent, isMain) {
      if (request === '../../config/database') {
        imports++;
        if (mode === 'true') throw Error('Green loaded the canonical tenant database');
        return { query: async () => { calls++; return {rows:[{approved:1}]}; } };
      }
      return oldLoader.apply(this, arguments);
    };
    delete require.cache[target];
    const worker = require(target);
    await probe(worker, () => ({imports,calls}));
  } finally {
    Module._load = oldLoader;
    delete require.cache[target];
    if (oldFlag === undefined) delete process.env.DB_SIGNED_TENANT_RLS_ENABLED;
    else process.env.DB_SIGNED_TENANT_RLS_ENABLED = oldFlag;
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
  }
}

test('signed Green module import never touches canonical tenant DB loader', async () => {
  await isolated('true', async (worker, counters) => {
    assert.equal(typeof worker.query,'function');
    assert.deepEqual(counters(),{imports:0,calls:0});
    assert.throws(() => worker.__test.validatedConfig({}), /AI_QUEUE_WORKER_SEPARATE_IDENTITY_REQUIRED/);
    const sample={DB_AI_WORKER_HOST:'127.0.0.1',DB_AI_WORKER_PORT:'5432',DB_AI_WORKER_NAME:'test',
      DB_AI_WORKER_USER:'apexos_user',DB_AI_WORKER_PASSWORD:'dummy',DB_AI_WORKER_ROLE:'assps_core_ai_worker'};
    assert.throws(() => worker.__test.validatedConfig(sample), /AI_QUEUE_WORKER_IDENTITY_MUST_BE_SEPARATE/);
    assert.deepEqual(counters(),{imports:0,calls:0});
  });
});

test('Blue fallback calls canonical DB only at query time', async () => {
  await isolated('false', async (worker, counters) => {
    assert.deepEqual(counters(),{imports:0,calls:0});
    const result=await worker.query('SELECT 1');
    assert.equal(result.rows[0].approved,1);
    assert.deepEqual(counters(),{imports:1,calls:1});
  });
});
