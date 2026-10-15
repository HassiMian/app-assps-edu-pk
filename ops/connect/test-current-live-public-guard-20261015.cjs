'use strict';
const assert=require('node:assert/strict');
const {evaluate,EXPECTED_BUILD}=require('./verify-current-live-public-guard-20261015.cjs');
const fixture={
 '/login':{status:200},
 '/dashboard':{status:307,location:'/login'},
 '/dashboard/history':{status:307,location:'/login'},
 '/teacher':{status:302,location:'/login?next=%2Fteacher'},
 '/api/auth/me':{status:401},
};
let counter=0;
function test(label,fn){fn();counter++;console.log('PASS '+label);}
function verdict(changes={},build=EXPECTED_BUILD){
 return evaluate({...fixture,...changes},build);
}
test('anonymous PRE verifier only, never final production certification',()=>{
 const v=verdict();assert.equal(v.status,'ANONYMOUS_ROUTES_PASS');
 assert.equal(v.authenticatedTeacherAccepted,false);
 assert.equal(v.independentCrossTenantDenied,false);
 assert.equal(v.productionReleaseCertified,false);
});
test('legacy admin next in dashboard fails closed',()=>{
 assert.equal(verdict({'/dashboard':{status:307,location:'/login?next=%2Fadmin'}}).status,'HOLD');
});
test('legacy nested admin next fails closed',()=>{
 assert.equal(verdict({'/dashboard/history':{status:307,location:'/login?next=/admin'}}).status,'HOLD');
});
test('old compiled Next build fails even with corrected routes',()=>{
 assert.equal(verdict({},'ONDwxEIZlx5onDIKY7wYf').status,'HOLD');
});
test('teacher route cannot resolve admin',()=>{
 assert.equal(verdict({'/teacher':{status:302,location:'/admin'}}).status,'HOLD');
});
test('teacher route cannot be left without role next',()=>{
 assert.equal(verdict({'/teacher':{status:302,location:'/login'}}).status,'HOLD');
});
test('external redirect hostile origin rejected',()=>{
 assert.equal(verdict({'/dashboard':{status:307,location:'https://evil.invalid/login'}}).status,'HOLD');
});
test('HTTP 200 private dashboard without authentication rejected',()=>{
 assert.equal(verdict({'/dashboard':{status:200}}).status,'HOLD');
});
test('anonymous session leak /auth/me 200 rejected',()=>{
 assert.equal(verdict({'/api/auth/me':{status:200}}).status,'HOLD');
});
test('missing route evidence rejected',()=>{
 assert.equal(verdict({'/teacher':undefined}).status,'HOLD');
});
console.log('ROLE_NEUTRAL_PUBLIC_FAIL_CLOSED '+counter+'/'+counter+' PASS');
