'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=process.env.CONNECT_STAGE_ROOT;
if(!root || !root.startsWith('/root/assps-release-candidates/')) throw Error('PRIVATE_STAGE_ROOT_REQUIRED');
const ts = require(require.resolve('typescript',{paths:[root]}));

const source = fs.readFileSync(path.join(root, 'src/lib/server/auth-user.ts'), 'utf8');
const login = fs.readFileSync(path.join(root, 'src/components/LoginClient.tsx'), 'utf8');
const changePage=fs.readFileSync(path.join(root,'src/app/auth/change-password/page.tsx'),'utf8');
if(!changePage.includes('aria-label={`${visible ?')) throw Error('PASSWORD_VISIBILITY_UI_MISSING');
let tests = 0;
function pass(label) { tests++; console.log('PASS ' + label); }
function assertSourceOrder() {
  const start = login.indexOf('if (data.success) {');
  const temporary = login.indexOf('if (data.mustChangePassword)', start);
  const verification = login.indexOf("fetchWithTimeout('/api/auth/me'", start);
  const hydration = login.indexOf("contextLogin('', null, verifiedUser)", start);
  assert(start >= 0 && temporary > start && verification > temporary && hydration > verification);
  pass('temporary-password response cannot hydrate authenticated context');
  assert(login.includes("String(verifiedUser.id) !== String(data.user?.id)") &&
         login.includes('verifiedPortal !== responsePortal') &&
         login.includes("verifiedPortal.startsWith('/login')"));
  pass('login requires canonical signed user and role agreement');
  assert(login.includes("!/^\\/auth\\/change-password\\?userId=\\d+$/.test(redirect)"));
  pass('temporary password redirects restricted to local challenge URL');
}

function loadModule(data) {
  const out = { exports: {} };
  const mockDb = { queries: [], async query(sql,params) {
    this.queries.push(String(sql));
    return { rows: [data] };
  }};
  const mocks = {
    'next/headers': { cookies: async () => ({get: name => name === 'authToken' ? {value:'qa-signed'} : name === 'userId' ? {value:'9901'} : undefined}) },
    'jsonwebtoken': { verify: () => ({id:9901}) },
    '@/lib/server/db': { getPool: () => mockDb },
    '@/lib/server/env': { requireEnv: () => 'qa-only' }
  };
  const js = ts.transpileModule(source, {compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const sandbox = {module:out,exports:out.exports, require(name) {
    assert(Object.hasOwn(mocks,name), 'unexpected dependency '+name);
    return mocks[name];
  }, String,Number,Boolean,Error};
  vm.runInNewContext(js,sandbox,{filename:'auth-user.ts'});
  return {getCurrentUser:out.exports.getCurrentUser, queries:mockDb.queries};
}

const base = {
  id:9901,name:'Isolated QA Teacher',email:'qa@example.invalid',role:'teacher',
  tenant_id:'tenant-qa',school_id:1,school_tenant_id:'tenant-qa',is_active:true,
  school_name:'QA',tenant_name:'QA',tenant_type:'REAL',
  branding_logo_url:null,branding_primary_color:null,branding_secondary_color:null
};
(async () => {
  assertSourceOrder();
  const temporary = loadModule({...base,must_change_password:true});
  assert.equal(await temporary.getCurrentUser(),null);
  assert(temporary.queries.length === 1 && /^SELECT\b/i.test(temporary.queries[0].trim()));
  pass('reset-marked teacher JWT rejected without request-time DDL');
  const complete = loadModule({...base,must_change_password:false});
  const actor = await complete.getCurrentUser();
  assert.equal(actor?.id,'9901');
  assert.equal(actor?.role,'teacher');
  assert.equal(actor?.tenantId,'tenant-qa');
  pass('legitimate signed teacher read retains tenant and role');
  const disabled = loadModule({...base,must_change_password:false,is_active:false});
  assert.equal(await disabled.getCurrentUser(),null);
  pass('disabled staff access remains denied');
  console.log('CONNECT_TEMP_LOGIN_SESSION_BOUNDARY '+tests+'/'+tests+' PASS');
})().catch(e => {console.error(e.stack);process.exitCode=2});
