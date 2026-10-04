/* Run against isolated running backend (TEST_SERVER_PORT default 5016) using
 * synthetic HS256 claims and 404-only test paths. No school data is mutated. */
require('dotenv').config({path:process.env.APEX_BACKEND_ENV_FILE || require('path').resolve(__dirname,'../.env')});
const http=require('node:http'),jwt=require('jsonwebtoken'),crypto=require('node:crypto');
const PORT=Number(process.env.TEST_SERVER_PORT||5016),IP='192.0.2.'+(100+crypto.randomInt(70));
const path='/__apex_mobile_rate_test';
const token=id=>jwt.sign({id,school_id:771011,role:'teacher'},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'});
const get=(cookie='',ip=IP)=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:PORT,path,method:'GET',headers:{'X-Forwarded-For':ip,...(cookie?{Cookie:cookie}:{})},timeout:3000},r=>{r.resume();r.on('end',()=>resolve(r.statusCode))});req.on('error',reject);req.end()});
(async()=>{
 const id=crypto.randomInt(700000,800000),a=`authToken=${token(id)}`,b=`authToken=${token(id+1)}`;
 for(let i=0;i<180;i++){if(await get(a)!==404)throw Error(`Authenticated session request ${i+1} did not return 404`)}
 if(await get(a)!==429)throw Error('The authenticated session exceeded its 180/min limit without throttling');
 if(await get(b)!==404)throw Error('Distinct signed user inherited another user quota behind a shared IP');
 if(await get('',IP)!==404)throw Error('Unauthenticated access incorrectly inherited an authenticated quota');
 console.log('PASS independent JWT-verified session quotas on a shared school NAT');
 const publicIP='198.51.100.'+(100+crypto.randomInt(70));
 for(let i=0;i<240;i++){if(await get('userId=919999',publicIP)!==404)throw Error('Untrusted userId changed the public browsing quota')}
 if(await get('userId=919999',publicIP)!==429)throw Error('Unsigned userId cookie bypassed the public browsing ceiling');
 console.log('PASS public/IP cap and untrusted-cookie resistance');
})().then(()=>process.exit(0)).catch(e=>{console.error('FAIL',e.message);process.exit(1)});
