const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const cp=require('node:child_process')
const {REVIEW_NAMES}=require('../services/papers/paperIndependentReviewIntakeV6G4')
const cli=path.join(__dirname,'../scripts/validate-independent-review-v6g8.js')
function run(bundle,forbid=[]){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g8-cli-'));const file=path.join(dir,'bundle.json');fs.writeFileSync(file,JSON.stringify(bundle));const r=cp.spawnSync(process.execPath,[cli,file,...forbid.map(String)],{encoding:'utf8'});fs.rmSync(dir,{recursive:true,force:true});return r}
function complete(id=9001){const operationalReviews={};for(const name of REVIEW_NAMES)operationalReviews[name]={status:'INDEPENDENTLY_APPROVED',evidenceId:`ev-${name}`,reviewerId:id,reviewedArtifactSha256:'b'.repeat(64),reviewDate:'2026-10-06T10:00:00Z',scope:{grade:9,subject:'Biology'},result:'APPROVED',rationale:'Independent reviewer checked the sealed evidence artifact.'};return {operationalReviews}}
test('CLI rejects incomplete template',()=>{const r=run({operationalReviews:{}});assert.equal(r.status,3);const j=JSON.parse(r.stdout);assert.equal(j.valid,false);assert.ok(j.issues.length>0)})
test('CLI accepts structurally complete independent bundle',()=>{const r=run(complete());assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).valid,true)})
test('CLI rejects forbidden self reviewer id',()=>{const r=run(complete(77),[77]);assert.equal(r.status,3);const j=JSON.parse(r.stdout);assert.ok(j.issues.some(x=>x.endsWith(':REVIEWER_NOT_INDEPENDENT')))})
