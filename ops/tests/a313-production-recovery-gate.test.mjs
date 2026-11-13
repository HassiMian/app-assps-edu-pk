import test from 'node:test'
import assert from 'node:assert/strict'
import {releaseAssetPaths,assessResponse,runGate} from '../a313-production-recovery-gate.mjs'

test('release HTML import map and direct module assets are enumerated once',()=>{
  const html='<html><script type="importmap">{"imports":{"/assets/a.js":"/assets/new-a.js","/assets/b.js":"/assets/new-b.js"}}</script><script src="/assets/new-a.js"></script><link rel="modulepreload" href="/assets/runtime.js"></html>'
  assert.deepEqual(releaseAssetPaths(html), ['/assets/new-a.js','/assets/new-b.js','/assets/runtime.js'])
})
test('fake HTML 200 is not accepted as JSON API health',()=>{
  const response=new Response('<html>app shell</html>',{status:200,headers:{'content-type':'text/html'}})
  assert.match(assessResponse(response,{status:200,type:'application/json'}).join(','),/content-type/)
})
test('protected routes require HTTP 401, JSON and no-store when specified',()=>{
  const ok=new Response('{"message":"Token required"}',{status:401,headers:{'content-type':'application/json','cache-control':'private, no-store'}})
  assert.deepEqual(assessResponse(ok,{status:401,type:'application/json',noStore:true}),[])
  assert.equal(assessResponse(ok,{status:200,type:'application/json'}).length,1)
  assert.equal(assessResponse(new Response('',{status:401,headers:{'content-type':'application/json'}}),{status:401,type:'application/json',noStore:true}).length,1)
})
function mockFetch(url, init) {
  const pathname=url.pathname
  const type=new Headers({'content-type':'application/json','cache-control':'private, no-store'})
  if(pathname==='/' || pathname==='/login') return Promise.resolve(new Response(
    pathname==='/' ? '<script src="/assets/app.js"></script>' : '<html>login</html>',{status:200,headers:{'content-type':'text/html'}}))
  if(pathname==='/assets/app.js') return Promise.resolve(new Response(null,{status:200,headers:{'content-type':'text/javascript'}}))
  if(pathname==='/api/') return Promise.resolve(new Response('{"success":true,"status":"ok"}',{status:200,headers:type}))
  if(pathname==='/api/auth/login' && init.body) {
    const body=JSON.parse(init.body)
    return Promise.resolve(new Response(JSON.stringify({message:body.password?'Email or password is incorrect.':'Login ID and password are required.'}),{status:body.password?401:400,headers:type}))
  }
  return Promise.resolve(new Response('{"message":"Token required"}',{status:401,headers:type}))
}
test('complete simulated successful gate checks all contracts without school writes',async()=>{
  const report=await runGate({base:'https://example.test',fetchImpl:mockFetch})
  assert.equal(report.failed,0)
  assert.equal(report.total,11)
  assert.ok(report.results.some(x=>x.name==='synthetic-local-token-denied'&&x.status===401))
})
test('gate blocks if SPA HTML is returned on backend health URL',async()=>{
  const failing=async(url,init)=>{
    if(url.pathname==='/api/')return new Response('<html>wrong route</html>',{status:200,headers:{'content-type':'text/html'}})
    return mockFetch(url,init)
  }
  const report=await runGate({base:'https://example.test',fetchImpl:failing})
  assert.equal(report.failed,1)
  assert.equal(report.results.find(x=>x.name==='backend-health')?.ok,false)
})
test('gate blocks JSON 200 health without affirmative health fields',async()=>{
  const failing=async(url,init)=>{
    if(url.pathname==='/api/')return new Response('{"success":false,"status":"unhealthy"}',{status:200,headers:{'content-type':'application/json'}})
    return mockFetch(url,init)
  }
  const report=await runGate({base:'https://example.test',fetchImpl:failing})
  assert.equal(report.failed,1)
})