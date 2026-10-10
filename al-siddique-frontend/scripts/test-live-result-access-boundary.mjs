import assert from 'node:assert/strict'

// READ-ONLY, UNAUTHENTICATED boundary smoke check. Never import credentials,
// cookies, tokens, student identities or response bodies into test logs.
const origin=process.env.ASSPS_PUBLIC_ORIGIN || 'https://app.assps.edu.pk'
const endpoints=['/api/exams','/api/exams/grade-settings','/api/exams/results','/api/exams/results/all']
for(const path of endpoints){
 const res=await fetch(new URL(path,origin),{method:'GET',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json','Cache-Control':'no-store'}})
 assert.ok([401,403].includes(res.status),'Anonymous results API must deny access: '+path+' status '+res.status)
 assert.ok(!res.headers.get('access-control-allow-origin')?.includes('*') || !res.headers.get('access-control-allow-credentials'),'Credentialed wildcard CORS not allowed')
 console.log('ANONYMOUS_RESULT_API_ACCESS_DENIED',path,'HTTP',res.status)
}
console.log('LIVE_RESULTS_ANONYMOUS_AUTH_BOUNDARY_PASS 4/4; AUTHENTICATED_SCHOOL_DATA=NOT_TESTED (no approved active session)')
