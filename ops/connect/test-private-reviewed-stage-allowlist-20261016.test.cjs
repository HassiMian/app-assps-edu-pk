'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {allowed}=require('./private-reviewed-stage-allowlist-20261016.cjs');
test('only byte-pinned successful optimized private Next workspace accepted',()=>{
 const p='/root/workspace/apex-connect-eslint-full-source-reconcile-20261016';
 if(require('node:fs').existsSync(p))assert.equal(allowed(p),true);
});
test('real production current-live root is forbidden',()=>assert.equal(allowed('/var/www/apex-connect'),false));
test('arbitrary other workspace denied',()=>assert.equal(allowed('/root/workspace/assps-connect-private-http-qa-20261016'),false));
test('release-stage parent directory itself denied',()=>assert.equal(allowed('/root/assps-release-candidates'),false));
test('relative paths fail closed',()=>assert.equal(allowed('../../root/assps-release-candidates/foo'),false));
test('traversal out of private releases denied',()=>assert.equal(allowed('/root/assps-release-candidates/../../../etc'),false));
test('historical private candidate remains compatible',()=>assert.equal(allowed('/root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015'),true));
test('unknown type fails closed',()=>assert.equal(allowed(null),false));
