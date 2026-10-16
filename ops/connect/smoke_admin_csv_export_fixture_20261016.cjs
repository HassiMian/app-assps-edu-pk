'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const stage=path.resolve(process.argv[2] || '/root/workspace/apex-connect-csv-formula-hardening-20261016');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'recovery/reviewed-next-admin-csv-formula-20261016.manifest.json'),'utf8'));
const actual=execFileSync('git',['-C',stage,'rev-parse','HEAD'],{encoding:'utf8',timeout:5000}).trim();
assert.equal(actual,manifest.sourceGitCommit,'wrong reviewed Next source commit');
for(const [rel, expected] of Object.entries(manifest.reviewedModifiedFiles)){
 const got=crypto.createHash('sha256').update(fs.readFileSync(path.join(stage,rel))).digest('hex');
 assert.equal(got,expected,'source file modified: '+rel);
}
const ts=require(path.join(stage,'node_modules/typescript'));
const base=path.join(stage,'src/lib/server/');
function load(file,dependencies){
 const input=fs.readFileSync(base+file,'utf8');
 const output=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={}; const mod={exports:exp};
 vm.runInNewContext(output,{exports:exp,module:mod,require(name){if(!(name in dependencies)) throw Error('UNREVIEWED_DEPENDENCY:'+name);return dependencies[name];}},{filename:file,timeout:1000});
 return mod.exports;
}
const {escapeCsvCell}=load('csv-cell.ts',{});
assert.equal(escapeCsvCell('=4+4'),"'=4+4");
let leadCalls=0,requestCalls=0;
const fixtureLead={leadId:99,type:'NEW',status:'PENDING',name:'=4+4',email:'test@example.invalid',phone:'+923000000000',
 schoolName:'School',city:'Lahore',studentsCount:0,notes:'hello, "test"',created_at:'2026-10-16'};
const leads=load('apex-leads-export.ts',{
 '@/lib/server/csv-cell':{escapeCsvCell},
 '@/lib/server/apex-leads-storage':{listApexLeads:async()=>{leadCalls++;return [fixtureLead];}}
});
const fixtureRequest={requestId:7,status:'PENDING',schoolName:'@SUM(1)',ownerName:'Owner',
 email:'test@example.invalid',contactNumber:'+923000000000',planName:'Basic',planPrice:-250,
 billingCycle:'MONTHLY',paymentMethod:'MANUAL',transactionId:'=cmd',createdAt:'2026-10-16',source:'USER'};
const subscriptions=load('subscription-request-export.ts',{
 '@/lib/server/csv-cell':{escapeCsvCell},
 '@/lib/server/subscription-request-admin':{listAdminSubscriptionRequests:async()=>{requestCalls++;return [fixtureRequest];}},
 '@/lib/payment-method-labels':{formatPaymentMethodLabel:()=> 'Manual'},
});
(async()=>{
 const lead=await leads.buildApexLeadsCsv('ALL');
 assert.equal(leadCalls,1);
 assert.ok(lead.includes("'=4+4"));
 assert.ok(lead.includes("'+923000000000"));
 assert.ok(lead.includes('"hello, ""test"""'));
 const sub=await subscriptions.buildSubscriptionRequestsCsv('ALL');
 assert.equal(requestCalls,1);
 assert.ok(sub.includes("'@SUM(1)"));
 assert.ok(sub.includes("'=cmd"));
 assert.ok(sub.includes("-250"));
 console.log(JSON.stringify({status:'FIXTURE_EXPORTERS_BOTH_PASS_WITH_SYNTHETIC_RECORDS',synthetic_only:true,live_requests:0,school_records_read:0,production_modified:false,approved_next_commit:actual}));
})().catch(e=>{console.error(e);process.exitCode=2});
