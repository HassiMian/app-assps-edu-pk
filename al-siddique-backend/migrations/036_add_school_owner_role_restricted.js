'use strict'
const ALLOWED=['super_admin','school_admin','admin','principal','teacher',
 'accountant','parent','student','owner']
async function up({pool,authEndpointsHardened=false,releaseApproved=false,isolatedRehearsal=false}={}){
 if(!pool||!authEndpointsHardened||(!releaseApproved&&!isolatedRehearsal))
  throw Error('OWNER_ROLE_SCHEMA_RELEASE_GUARD_REQUIRED')
 const c=await pool.connect()
 try{
  await c.query('BEGIN')
  const x=await c.query('SELECT current_database() AS db')
  const db=String(x.rows[0]?.db||'')
  if(isolatedRehearsal&&!db.startsWith('assps_p23_'))
   throw Error('OWNER_ROLE_REHEARSAL_TARGET_NOT_ISOLATED')
  const old=await c.query(`SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE conrelid='public.users'::regclass
    AND conname='users_role_check' AND contype='c'`)
  if(old.rows.length!==1)throw Error('OWNER_ROLE_ORIGINAL_CONSTRAINT_MISSING')
  const previous=String(old.rows[0].definition||'')
  for(const role of ALLOWED.filter(r=>r!=='owner'))
   if(!previous.includes("'"+role+"'"))
    throw Error('OWNER_ROLE_ORIGINAL_CONSTRAINT_CHANGED')
  if(!previous.includes("'owner'")){
   await c.query('ALTER TABLE public.users DROP CONSTRAINT users_role_check')
   const roles=ALLOWED.map(v=>"'"+v+"'").join(',')
   await c.query('ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('+roles+')) NOT VALID')
   await c.query('ALTER TABLE public.users VALIDATE CONSTRAINT users_role_check')
  }
  const checked=await c.query(`SELECT pg_get_constraintdef(oid) AS definition,
    convalidated AS verified FROM pg_constraint WHERE conrelid='public.users'::regclass
    AND conname='users_role_check'`)
  if(checked.rows.length!==1||!checked.rows[0].verified||
   !String(checked.rows[0].definition).includes("'owner'"))
   throw Error('OWNER_ROLE_SCHEMA_FINAL_VERIFICATION_FAILED')
  await c.query('COMMIT')
  return {schemaAllowsOwner:true,existingUsersModified:false,ownerCreated:false}
 }catch(e){try{await c.query('ROLLBACK')}catch(_){}throw e}
 finally{c.release()}
}
module.exports={up,ALLOWED}
