#!/usr/bin/env node
// ASSPS emergency 2026-11-05. Fail closed if a new deployment loses security / saved marks defaults.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const args=process.argv.slice(2)
const rootAt=args.indexOf('--root')
const root=rootAt>=0 ? path.resolve(args[rootAt+1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const checks=[]
const verify=(label,filename,need)=>{
  let s=''
  try{s=fs.readFileSync(filename,'utf8')}catch{checks.push('MISSING '+label+': '+filename);return}
  for(const phrase of need)if(!s.includes(phrase))checks.push(label+' lost protection '+JSON.stringify(phrase))
}
verify('auth/backend security',path.join(root,'al-siddique-backend/src/server.js'),[
  "app.set('trust proxy', 1)",'max: 600','max: 60','const authLimiter = rateLimit','app.use(generalLimiter)',
  "req.method === 'POST'",'skip: (req) => req.method ==='
])
verify('marks/backend count scope',path.join(root,'al-siddique-backend/src/routes/examRoutes.js'),[
 'include_saved_counts','saved_scored_count','school_id=$1 AND exam_id=ANY($2::int[])','currentSchoolId(req)'
])
verify('Diary source print readiness',path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx'),[
 'printSequence','printDocument.fonts?.ready','8500'
])
verify('marks/frontend saved default',path.join(root,'al-siddique-frontend/src/Modules/examination/MarksRegister.jsx'),[
 'include_saved_counts','firstWithMarks','saved_scored_count','saved_result_count',
 'This examination has no saved marks yet'
])
if(args.includes('--live')){
 const config='/etc/nginx/sites-enabled/apex-app-ssl'
 verify('trusted Cloudflare client IP',config,['include /etc/nginx/snippets/apex-cloudflare-realip.conf;'])
 const release='/var/www/assps-releases/assps-auth429-marks-fontready-20261105'
 const index=path.join(release,'index.html')
 verify('live immutable marks mapping',index,['/assets/MarksRegister-Crj596Kp.js','/assets/MarksRegister-ASSPS-SAVED-DEFAULT-429-20261105.js'])
 verify('live font-ready Diary bundle',path.join(release,'assets/DailyDiaryWorkspace-ASSPS-A195-FONTREADY-20261105.js'),[
 'doc.fonts?.ready','printSequence','Print blocked: Urdu fonts or logo'
 ])
 verify('live verified marks bundle',path.join(release,'assets/MarksRegister-ASSPS-SAVED-DEFAULT-429-20261105.js'),[
 'include_saved_counts','saved_scored_count','saved_result_count'
 ])
}
if(checks.length){
 console.error('ASSPS_P0_AUTH_MARKS_GUARD_FAILED',checks.join(' | '))
 process.exitCode=3
}else console.log('ASSPS_P0_AUTH_MARKS_RELEASE_GUARD_PASS',args.includes('--live')?'source and live':'source')

