#!/usr/bin/env node
// Fail-closed comparison of an exact, reviewed live-source candidate.
// This file only reads code. It neither patches nor reloads production.
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const BASELINE_SHA256='1abd3329be4c69577aebfcecf8d9bf92b96da4aadd68d0594cccf5c026b6fbe0'
export const CANDIDATE_SHA256='ad030bf477e1e05f01143a14ed9a04c1e0700095c1da5c249ddf30c6606215b6'
const oldBlock=[
  'function getLoginAttempt(key) {',
  '  const entry = loginAttempts.get(key)',
  '  if (!entry) return { count: 0, blockedUntil: 0 }',
  '  return entry',
  '}'
].join('\n')
const revisedBlock=[
  'function getLoginAttempt(key) {',
  '  const entry = loginAttempts.get(key)',
  '  if (!entry) return { count: 0, blockedUntil: 0 }',
  '  const now = Date.now()',
  '  // Expire blocked and idle failed-attempt counters without weakening the limit.',
  '  if ((entry.blockedUntil && now >= entry.blockedUntil) ||',
  '      (!entry.blockedUntil && entry.lastFailedAt && now - entry.lastFailedAt >= BLOCK_DURATION_MS)) {',
  '    loginAttempts.delete(key)',
  '    return { count: 0, blockedUntil: 0 }',
  '  }',
  '  return entry',
  '}'
].join('\n')
const failureLine='    blockedUntil: current.count + 1 >= MAX_LOGIN_ATTEMPTS ? Date.now() + BLOCK_DURATION_MS : current.blockedUntil,'
function count(source,needle){return source.split(needle).length-1}
export function deriveReviewedCandidate(live){
  if(count(live,oldBlock)!==1)throw new Error('Original lockout block is not unique')
  if(count(live,failureLine)!==1)throw new Error('Original failed-attempt record is not unique')
  return live.replace(oldBlock,revisedBlock).replace(failureLine,failureLine+'\n    lastFailedAt: Date.now(),')
}
export function sha256(source){return crypto.createHash('sha256').update(source,'utf8').digest('hex')}
export function checkParity(live,candidate,{baselineSha=BASELINE_SHA256,candidateSha=CANDIDATE_SHA256}={}){
  const problems=[]
  if(sha256(live)!==baselineSha)problems.push('live baseline checksum drift')
  if(sha256(candidate)!==candidateSha)problems.push('candidate checksum drift')
  if(!live.includes('const MAX_LOGIN_ATTEMPTS = 15'))problems.push('live 15-attempt policy changed')
  if(!candidate.includes('const MAX_LOGIN_ATTEMPTS = 15'))problems.push('candidate 15-attempt policy changed')
  const cacheMarker="res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')"
  if(!live.includes(cacheMarker)||!candidate.includes(cacheMarker))problems.push('no-store auth middleware missing')
  try {
    if(deriveReviewedCandidate(live)!==candidate)problems.push('candidate includes changes beyond audited TTL patch')
  }catch(err){problems.push(err.message)}
  return {passed:problems.length===0,problems,baselineSha256:sha256(live),candidateSha256:sha256(candidate)}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2)
 const arg=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null}
 const livePath=arg('--live')
 const candidatePath=arg('--candidate')
 if(!livePath||!candidatePath){
   console.error('Usage: node ops/a314-live-auth-parity-guard.mjs --live FILE --candidate FILE')
   process.exitCode=2
 }else{
   const result=checkParity(fs.readFileSync(livePath,'utf8'),fs.readFileSync(candidatePath,'utf8'))
   console.log(JSON.stringify(result,null,2))
   if(!result.passed)process.exitCode=2
 }
}
