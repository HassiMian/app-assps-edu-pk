'use strict';
// Isolated execution of the CURRENT Connect Axios response interceptor.
// NO actual network, live SQL, real staff credentials, or token minting.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.CONNECT_STAGE_ROOT;
if(!root?.startsWith('/root/assps-release-candidates/'))throw Error('PRIVATE_CANDIDATE_REQUIRED');
const ts=require(require.resolve('typescript',{paths:[root]}));
const code=fs.readFileSync(path.join(root,'src/utils/api.ts'),'utf8');
const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
let refreshes=0,redirects=[],rejects=0,callbacks,reqs=0;
const api={interceptors:{response:{use:(ok,fail)=>{callbacks={ok,fail}}}}};
const axios={create:()=>api,post:async()=>{refreshes++;return {data:{success:false}}}};
const browser={location:{pathname:'/auth/change-password',replace:s=>redirects.push(s)}};
const store={removeItem(){}};
const mod={exports:{}};
vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:id=>{if(id==='axios')return axios;throw Error('UNEXPECTED_DEPENDENCY:'+id)},window:browser,localStorage:store,process:{env:{NEXT_PUBLIC_API_URL:'/api'}},URL,Promise,console});
assert.equal(typeof callbacks.fail,'function');
let count=0;
async function run(label,pathname,endpoint,expectedRefresh,expectedRedirect){
 browser.location.pathname=pathname;
 const refreshBefore=refreshes,redirectBefore=redirects.length;
 try{await callbacks.fail({config:{url:endpoint},response:{status:401}})}catch{rejects++}
 assert.equal(refreshes-refreshBefore,expectedRefresh,label+' refresh mismatch');
 assert.equal(redirects.length-redirectBefore,expectedRedirect,label+' redirect mismatch');
 count++;console.log('PASS '+label);
}
(async()=>{
 await run('temporary-password page initial auth/me 401 does not trigger refresh or redirect','/auth/change-password','/auth/me',0,0);
 await run('login page initial auth/me 401 stays on login','/login','/auth/me',0,0);
 await run('query-string auth/me still recognized as probe','/auth/change-password','/auth/me?next=%2Fteacher',0,0);
 await run('canonical api-prefixed auth/me entry probe recognized','/auth/change-password','/api/auth/me',0,0);
 await run('protected teacher auth/me 401 still revokes and returns login','/teacher','/auth/me',1,1);
 await run('protected parent endpoint 401 still revokes and returns login','/parent','/grades',1,1);
 await run('non-probe 401 on public challenge remains handled as before','/auth/change-password','/grades',1,1);
 assert.equal(count,7);
 console.log('CURRENT_LIVE_FIRST_LOGIN_AXIOS_401_BOUNDARY '+count+'/'+count+' PASS');
})().catch(e=>{console.error(e.stack);process.exitCode=2});
