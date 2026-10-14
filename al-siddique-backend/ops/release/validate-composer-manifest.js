#!/usr/bin/env node
'use strict'
/* Read-only source QA: never import, print WhatsApp content or connect to a DB. */
const fs=require('node:fs')
const path=require('node:path')
const {prepareReviewBatch}=require('../../src/services/lessonComposerIntake')
const {enforceTrustedSource}=require('../../src/services/lessonComposerReviewStore')
const registry=require('../../src/services/data/adiba20261014TrustedHashes.json')
function main(){
 const source=process.argv[2]
 if(!source || !path.isAbsolute(source)){
  process.stderr.write('Usage: node validate-composer-manifest.js <absolute-private-manifest.json>\n')
  process.exitCode=2;return
 }
 const manifest=JSON.parse(fs.readFileSync(source,'utf8'))
 const validated=prepareReviewBatch(manifest,registry.schoolId)
 enforceTrustedSource(validated)
 if(validated.candidateCount!==59 || validated.classes.length!==12 ||
  validated.unassignedSourceIds.length!==1||
  validated.unassignedSourceIds[0]!=='WA14-L1719' ||
  validated.manifestHash!==registry.trustedFullManifestHash){
  throw new Error('ACADEMIC_SOURCE_COVERAGE_INCONSISTENT')
 }
 process.stdout.write(JSON.stringify({
  status:'VERIFIED_SOURCE_REVIEW_ONLY',schoolId:registry.schoolId,
  groups:validated.candidateCount,classes:validated.classes.length,
  unassigned:validated.unassignedSourceIds.length,
  sourceZipSha256:validated.originalZipHash,
  reviewManifestSha256:validated.manifestHash,
  readyToPublish:false,databaseModified:false
 },null,2)+'\n')
}
try{main()}catch(err){process.stderr.write('SOURCE_GATE_HOLD '+String(err.code||err.message)+'\n');process.exitCode=1}
