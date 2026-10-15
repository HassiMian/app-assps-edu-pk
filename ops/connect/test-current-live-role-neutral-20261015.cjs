'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=process.env.CONNECT_STAGE_ROOT || '/root/assps-release-candidates/apex-connect-role-neutral-current-live-20261015';
const ts=require(require.resolve('typescript',{paths:[root]}));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const roleSource=read('src/lib/roleRoutes.ts');
const transpiled=ts.transpileModule(roleSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
vm.runInNewContext(transpiled,{module,exports:mod.exports,require,console},{timeout:1500});
const routes=mod.exports;
let checks=0;
function chk(label,fn){fn();checks++;console.log('PASS',label);}
chk('teacher dashboard maps only to teacher',()=>assert.equal(routes.coerceRedirectPath('/dashboard','teacher'),'/teacher'));
chk('teacher nested dashboard maps to teacher',()=>assert.equal(routes.coerceRedirectPath('/dashboard/history','teacher'),'/teacher'));
chk('parent dashboard maps only to parent',()=>assert.equal(routes.coerceRedirectPath('/dashboard','parent'),'/parent'));
chk('student dashboard maps only to student',()=>assert.equal(routes.coerceRedirectPath('/dashboard/marks','student'),'/student'));
chk('genuine admin dashboard maps to admin',()=>assert.equal(routes.coerceRedirectPath('/dashboard','admin'),'/admin'));
chk('no unknown-role admin privilege',()=>assert.equal(routes.coerceRedirectPath('/dashboard'),'/login'));
chk('malformed role cannot become admin',()=>assert.equal(routes.coerceRedirectPath('/dashboard','stranger'),'/login'));
chk('next config contains no admin dashboard redirect',()=>{
 const x=read('next.config.ts');
 assert.doesNotMatch(x,/source:\s*["']\/dashboard(?:\/?:path\*)?["']/);
 assert.match(x,/source:\s*["']\/saas_admin["']/);
});
chk('proxy unknown dashboard never seeds admin',()=>{
 const x=read('src/proxy.ts');
 assert.doesNotMatch(x,/loginUrl\.searchParams\.set\(["']next["'],\s*["']\/admin["']\)/);
 assert.match(x,/if\s*\(isDashboardPath\)/);
});
chk('legacy login next parameter is deleted',()=>{
 const x=read('src/proxy.ts');
 assert.match(x,/next === "\/dashboard"/);
 assert.match(x,/loginUrl\.searchParams\.delete\("next"\)/);
});
chk('dashboard client has neutral login fallback',()=>{
 const x=read('src/app/dashboard/page.tsx');
 assert.match(x,/window\.location\.replace\("\/login"\)/);
 assert.doesNotMatch(x,/window\.location\.replace\("\/login\?next=\/admin"\)/);
});
chk('catchall is neutral if a middleware path is bypassed',()=>{
 const x=read('src/app/dashboard/[...path]/page.tsx');
 assert.match(x,/redirect\("\/login"\)/);
 assert.doesNotMatch(x,/redirect\("\/admin"\)/);
});
// Preserve unrelated teacher assessment code exactly. The reviewed first-login challenge
// deliberately changes LoginClient, change-password and auth-user; requiring those
// to match the older live Blue would incorrectly reject the security fix.
// Auth changes are covered separately by test-current-live-temporary-login-20261015.cjs.
for (const f of ['src/app/teacher/assessments/page.tsx']) {
 chk('unrelated protected production module unchanged '+f,()=>assert.deepEqual(fs.readFileSync(path.join(root,f)),fs.readFileSync('/var/www/apex-connect/'+f)));
}
console.log('CURRENT_LIVE_NEXT_ROLE_NEUTRAL',checks+'/'+checks,'PASS');
