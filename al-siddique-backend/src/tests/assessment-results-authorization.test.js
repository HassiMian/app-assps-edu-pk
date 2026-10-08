process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const crypto=require('node:crypto')
const jwt=require('jsonwebtoken')
const {pool,tenantContext}=require('../config/database')

function request(port,path,options={}){
  const method=options.method||'GET'
  const body=options.body||null
  const token=options.token||''
  return new Promise((resolve,reject)=>{
    const raw=body?Buffer.from(JSON.stringify(body)):null
    const headers={}
    if(token) headers.Authorization='Bearer '+token
    if(raw){headers['Content-Type']='application/json';headers['Content-Length']=raw.length}
    const req=http.request({host:'127.0.0.1',port,path,method,headers},res=>{
      const chunks=[]
      res.on('data',c=>chunks.push(c))
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString()
        let json={}
        try{json=JSON.parse(text)}catch{}
        resolve({status:res.statusCode,json,text})
      })
    })
    req.on('error',reject)
    if(raw) req.write(raw)
    req.end()
  })
}

function tokenFor(user){
  const secret=process.env.JWT_SECRET||'dev-jwt-secret'
  return jwt.sign({id:user.id,email:user.email},secret,{algorithm:'HS256',expiresIn:'10m'})
}

test('assessment results enforce teacher assignment and cross-tenant release isolation',{timeout:30000},async t=>{
  const app=express()
  app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
  app.use('/api/assessment-results',require('../routes/assessmentResultRoutes'))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
  const port=server.address().port
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end()})

  const suffix=crypto.randomBytes(5).toString('hex')
  const school1=(await pool.query('SELECT id,tenant_id,code FROM schools WHERE id=1')).rows[0]
  assert.ok(school1)

  async function mkTeacher(label){
    const email='results-'+label+'-'+suffix+'@invalid.example'
    const row=(await pool.query(
      "INSERT INTO users(school_id,tenant_id,name,email,password,role,is_active,must_change_password) VALUES($1,$2,$3,$4,'test-only','teacher',true,false) RETURNING id,email",
      [school1.id,school1.tenant_id||school1.code||'assps','Results '+label,email]
    )).rows[0]
    row.token=tokenFor(row)
    return row
  }

  const assigned=await mkTeacher('assigned')
  const unassigned=await mkTeacher('unassigned')

  await pool.query(
    "INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,source,is_active) VALUES($1,$2,'Seven','','Science','test',true)",
    [school1.id,assigned.id]
  )

  const paperId=(await pool.query(
    "INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision) VALUES($1,$2,'Results Auth','FINALIZED',1) RETURNING id",
    [school1.id,'results-auth-paper-'+suffix]
  )).rows[0].id
  const releaseId='results-auth-release-'+suffix
  const snapshot={
    format:'assps-canonical-paper',
    metadata:{className:'Seven',classLevel:'Seven',subject:'Science',subjectName:'Science'},
    scoringPlan:{maximumObtainableMarks:10},
    sections:[{id:'q1',authoritativeSectionTotal:10}]
  }
  await pool.query(
    "INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json) VALUES($1,$2,$3,1,$4,'test',$5::jsonb)",
    [school1.id,paperId,releaseId,'b'.repeat(64),JSON.stringify(snapshot)]
  )

  let r=await request(port,'/api/assessment-results',{method:'POST',token:assigned.token,body:{
    releaseId,studentKey:'student-assigned',expectedRevision:0,
    entries:[{questionInstanceId:'q1',state:'SCORED',score:7}]
  }})
  assert.equal(r.status,201,r.text)
  const resultId=r.json.data.resultId
  assert.ok(resultId)

  r=await request(port,'/api/assessment-results',{method:'POST',token:unassigned.token,body:{
    releaseId,studentKey:'student-unassigned',expectedRevision:0,
    entries:[{questionInstanceId:'q1',state:'SCORED',score:7}]
  }})
  assert.equal(r.status,403,r.text)

  r=await request(port,'/api/assessment-results/'+resultId,{token:assigned.token})
  assert.equal(r.status,200,r.text)

  r=await request(port,'/api/assessment-results/'+resultId,{token:unassigned.token})
  assert.equal(r.status,403,r.text)

  const otherCode='resultother'+suffix
  const otherSchool=(await pool.query(
    "INSERT INTO schools(name,code,status,tenant_id) VALUES('Results Other',$1,'active',$1) RETURNING id",
    [otherCode]
  )).rows[0]
  const otherPaper=(await pool.query(
    "INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision) VALUES($1,$2,'Other Results','FINALIZED',1) RETURNING id",
    [otherSchool.id,'other-paper-'+suffix]
  )).rows[0].id
  const otherRelease='other-release-'+suffix
  await pool.query(
    "INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json) VALUES($1,$2,$3,1,$4,'test',$5::jsonb)",
    [otherSchool.id,otherPaper,otherRelease,'c'.repeat(64),JSON.stringify(snapshot)]
  )

  r=await request(port,'/api/assessment-results',{method:'POST',token:assigned.token,body:{
    releaseId:otherRelease,studentKey:'cross-school',expectedRevision:0,
    entries:[{questionInstanceId:'q1',state:'SCORED',score:1}]
  }})
  assert.equal(r.status,404,r.text)
})
