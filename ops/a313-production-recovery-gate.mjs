#!/usr/bin/env node
/**
 * Mission A313: production availability, login, saved-paper boundaries and
 * static release dependency verification. Never authenticates as a real user
 * and never writes academic data or changes the deployed server.
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'

export function releaseAssetPaths(html) {
  const source = String(html || '')
  const urls = new Set()
  const importMap = source.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i)
  if (importMap) {
    const data = JSON.parse(importMap[1])
    for (const value of Object.values(data.imports || {})) {
      if (typeof value === 'string' && value.startsWith('/assets/') && /\.js(?:\?|$)/.test(value)) urls.add(value)
    }
  }
  const re = /<(?:script|link)\b[^>]*(?:src|href)=(["'])(\/assets\/[^"']+)\1/gi
  for (const match of source.matchAll(re)) {
    if (/\.js(?:\?|$)/.test(match[2])) urls.add(match[2])
  }
  return [...urls]
}

export function assessResponse(response, expectation) {
  const failures = []
  if (response.status !== expectation.status) failures.push('status ' + response.status + ', expected ' + expectation.status)
  const type = response.headers.get('content-type') || ''
  if (expectation.type && !type.toLowerCase().includes(expectation.type)) failures.push('content-type ' + type)
  if (expectation.noStore && !/no-store/i.test(response.headers.get('cache-control') || '')) failures.push('auth cache-control must include no-store')
  return failures
}

const BASE_ROUTES = [
  {name:'site-home',method:'GET',path:'/',status:200,type:'text/html'},
  {name:'login-page',method:'GET',path:'/login',status:200,type:'text/html'},
  {name:'backend-health',method:'GET',path:'/api/',status:200,type:'application/json',expectedHealth:true},
  {name:'auth-me-denied',method:'GET',path:'/api/auth/me',status:401,type:'application/json',noStore:true},
  {name:'paper-list-denied',method:'GET',path:'/api/portal/paper-studio/papers',status:401,type:'application/json'},
  {name:'paper-library-denied',method:'GET',path:'/api/portal/paper-studio/library',status:401,type:'application/json'},
  {name:'vault-denied',method:'GET',path:'/api/paper/vault',status:401,type:'application/json'},
]
export async function runGate({base='https://app.assps.edu.pk',fetchImpl=fetch,assetLimit=32}={}) {
  const root=new URL(base)
  if (!['https:','http:'].includes(root.protocol)) throw new Error('HTTP(S) base URL required')
  const findings=[]
  let home=null
  async function inspect(item) {
    const url=new URL(item.path,root)
    const init={method:item.method || 'GET',headers:item.headers || {},redirect:'manual',signal:AbortSignal.timeout(12000)}
    if(item.body!==undefined) {init.body=JSON.stringify(item.body);init.headers={'Content-Type':'application/json',...init.headers}}
    try {
      const response=await fetchImpl(url,init)
      const failures=assessResponse(response,item)
      if(item.expectedHealth && response.headers.get('content-type')?.includes('json')) {
        try {
          const data = await response.clone().json()
          if (data.success !== true || data.status !== 'ok') failures.push('backend health payload is not affirmative')
        } catch { failures.push('backend health response is invalid JSON') }
      }
      if(item.expectedJsonMessage && response.headers.get('content-type')?.includes('json')) {
        try {const data=await response.clone().json();if (typeof data.message!=='string') failures.push('JSON message is missing')}
        catch{failures.push('invalid JSON response')}
      }
      const result={name:item.name,path:item.path,status:response.status,ok:failures.length===0}
      if(failures.length) result.failures=failures
      findings.push(result)
      return response
    } catch(error) {
      findings.push({name:item.name,path:item.path,ok:false,failures:[error.name || 'fetch error']})
      return null
    }
  }
  for(const route of BASE_ROUTES) {
    const response=await inspect({...route,expectedJsonMessage:route.status===401})
    if(route.name==='site-home') home=response
  }
  const nonce=crypto.randomBytes(7).toString('hex')
  await inspect({name:'short-legacy-unknown-login',path:'/api/auth/login',method:'POST',body:{
    email:'a313-unknown-'+nonce+'@invalid.example',password:'abc123',
  },status:401,type:'application/json',expectedJsonMessage:true})
  await inspect({name:'blank-password-rejected',path:'/api/auth/login',method:'POST',body:{
    email:'a313-unknown-'+nonce+'@invalid.example',password:'',
  },status:400,type:'application/json',expectedJsonMessage:true})
  await inspect({name:'synthetic-local-token-denied',path:'/api/portal/paper-studio/papers',headers:{
    Authorization:'Bearer local_a313_probe_only',
  },status:401,type:'application/json',expectedJsonMessage:true})
  if(home?.status===200) {
    try {
      const paths=releaseAssetPaths(await home.text())
      if(!paths.length) findings.push({name:'release-asset-manifest',ok:false,failures:['no direct/import-map JS assets discovered']})
      else {
        if(paths.length>assetLimit) findings.push({name:'release-asset-count',ok:false,failures:['asset total '+paths.length+' exceeds safety cap '+assetLimit]})
        else for(const asset of paths) {
          await inspect({name:'release-asset',path:asset,method:'HEAD',status:200,type:'javascript'})
        }
      }
    } catch(error) {findings.push({name:'release-asset-parser',ok:false,failures:[error.name || 'parse error']})}
  }
  const failed=findings.filter(x=>!x.ok)
  return {mission:'A313',generatedAt:new Date().toISOString(),base:root.origin,passed:findings.length-failed.length,failed:failed.length,total:findings.length,results:findings}
}

async function main() {
  const base=process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base')+1] : 'https://app.assps.edu.pk'
  const result=await runGate({base})
  console.log(JSON.stringify(result,null,2))
  if(result.failed) process.exitCode=2
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{console.error(error.message);process.exitCode=2})
}