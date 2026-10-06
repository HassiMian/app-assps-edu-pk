const crypto = require('crypto')
const { pool } = require('../config/database')

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ')
const key = value => clean(value).toLowerCase()
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
    : value
const sha256 = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')

function normalizeScope(scope = {}) {
  return {
    canonicalKey: key(scope.canonicalKey ?? scope.canonical_key),
    scopeType: key(scope.scopeType ?? scope.scope_type),
    label: clean(scope.label),
    parentKey: key(scope.parentKey ?? scope.parent_key),
  }
}

function buildCurriculumMigrationPlan({ fromScopes = [], toScopes = [], explicitLinks = [] } = {}) {
  const from = new Map(fromScopes.map(item => { const n=normalizeScope(item); return [n.canonicalKey,n] }).filter(([k])=>k))
  const to = new Map(toScopes.map(item => { const n=normalizeScope(item); return [n.canonicalKey,n] }).filter(([k])=>k))
  const links = new Map()
  for (const raw of explicitLinks) {
    const fromKey=key(raw.fromKey), toKey=key(raw.toKey), relation=key(raw.relation)
    if (!fromKey || !toKey || !['equivalent','renamed','moved'].includes(relation)) throw new Error('Invalid explicit curriculum migration link')
    if (links.has(fromKey)) throw new Error(`Duplicate migration link for ${fromKey}`)
    links.set(fromKey,{fromKey,toKey,relation})
  }

  const consumedTo=new Set()
  const changes=[]
  for (const [fromKey, oldScope] of [...from.entries()].sort(([a],[b])=>a.localeCompare(b))) {
    const link=links.get(fromKey)
    const target=link ? to.get(link.toKey) : to.get(fromKey)
    if (!target) {
      changes.push({relation:'removed',fromKey,toKey:null,from:oldScope,to:null})
      continue
    }
    consumedTo.add(target.canonicalKey)
    let relation=link?.relation || 'equivalent'
    if (!link) {
      const labelChanged=key(oldScope.label)!==key(target.label)
      const parentChanged=oldScope.parentKey!==target.parentKey
      if (parentChanged) relation='moved'
      else if (labelChanged) relation='renamed'
    }
    changes.push({relation,fromKey,toKey:target.canonicalKey,from:oldScope,to:target})
  }
  for (const [toKey,newScope] of [...to.entries()].sort(([a],[b])=>a.localeCompare(b))) {
    if (!consumedTo.has(toKey) && !from.has(toKey)) changes.push({relation:'new',fromKey:null,toKey,from:null,to:newScope})
  }
  const summary=changes.reduce((acc,row)=>{acc[row.relation]=(acc[row.relation]||0)+1;return acc},{equivalent:0,renamed:0,moved:0,new:0,removed:0})
  const plan={schemaVersion:'assps-curriculum-migration-plan-v1',changes,summary}
  return {...plan,planHash:sha256(plan)}
}

function validateResourceSet(items = []) {
  const errors=[]
  const seen=new Set()
  let primary=0
  for (const item of items) {
    const resourceVersionId=String(item?.resourceVersionId ?? item?.resource_version_id ?? '')
    const role=key(item?.role ?? item?.resourceRole ?? item?.resource_role)
    if (!resourceVersionId) errors.push('resourceVersionId is required')
    if (!['primary','supporting'].includes(role)) errors.push(`invalid resource role: ${role || '(blank)'}`)
    if (role==='primary') primary += 1
    if (resourceVersionId && seen.has(resourceVersionId)) errors.push(`duplicate resource version: ${resourceVersionId}`)
    seen.add(resourceVersionId)
  }
  if (primary>1) errors.push('resource set may contain at most one primary resource')
  return {valid:errors.length===0,errors}
}

async function withTenantTransaction(schoolId, fn) {
  const tenantId=Number(schoolId)
  if (!Number.isInteger(tenantId) || tenantId<=0) throw new Error('schoolId is required')
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id',$1,true)",[String(tenantId)])
    const result=await fn(client,tenantId)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { client.release() }
}

async function cloneCurriculumProfileVersion({ schoolId, userId = null, profilePublicId, sourceVersionId, targetAcademicSessionVersionId, label = null } = {}) {
  return withTenantTransaction(schoolId, async (client, tenantId) => {
    const source=await client.query(`
      SELECT cp.id AS profile_id,cp.public_id,cpv.id AS source_version_id,cpv.version_number,cpv.label,cpv.curriculum_authority,cpv.metadata
      FROM curriculum_profiles cp JOIN curriculum_profile_versions cpv ON cpv.school_id=cp.school_id AND cpv.curriculum_profile_id=cp.id
      WHERE cp.school_id=$1 AND cp.public_id=$2 AND cpv.id=$3
      FOR SHARE`,[tenantId,clean(profilePublicId),Number(sourceVersionId)])
    if (!source.rowCount) { const e=new Error('Curriculum profile source version not found'); e.code='CURRICULUM_SOURCE_NOT_FOUND'; throw e }
    const targetSession=await client.query('SELECT id FROM academic_session_versions WHERE school_id=$1 AND id=$2',[tenantId,Number(targetAcademicSessionVersionId)])
    if (!targetSession.rowCount) { const e=new Error('Target academic session version not found'); e.code='ACADEMIC_SESSION_VERSION_NOT_FOUND'; throw e }
    const current=source.rows[0]
    const nextResult=await client.query('SELECT COALESCE(MAX(version_number),0)+1 AS next_version FROM curriculum_profile_versions WHERE school_id=$1 AND curriculum_profile_id=$2',[tenantId,current.profile_id])
    const nextVersion=Number(nextResult.rows[0].next_version)
    const inserted=await client.query(`
      INSERT INTO curriculum_profile_versions
        (school_id,curriculum_profile_id,academic_session_version_id,version_number,predecessor_version_id,label,curriculum_authority,status,metadata,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8::jsonb,$9)
      RETURNING *`,[tenantId,current.profile_id,Number(targetAcademicSessionVersionId),nextVersion,current.source_version_id,clean(label)||current.label,current.curriculum_authority,JSON.stringify(current.metadata||{}),userId])
    await client.query(`
      INSERT INTO learning_scope_versions
        (school_id,learning_scope_id,curriculum_profile_version_id,scope_type,label,parent_learning_scope_id,sort_order,metadata,created_by)
      SELECT school_id,learning_scope_id,$1,scope_type,label,parent_learning_scope_id,sort_order,metadata,$2
      FROM learning_scope_versions
      WHERE school_id=$3 AND curriculum_profile_version_id=$4`,[inserted.rows[0].id,userId,tenantId,current.source_version_id])
    const count=await client.query('SELECT COUNT(*)::int AS count FROM learning_scope_versions WHERE school_id=$1 AND curriculum_profile_version_id=$2',[tenantId,inserted.rows[0].id])
    return {profilePublicId:current.public_id,sourceVersionId:current.source_version_id,newVersion:inserted.rows[0],clonedScopeCount:count.rows[0].count}
  })
}


async function persistCurriculumMigrationPlan({ schoolId, userId = null, fromProfileVersionId, toProfileVersionId, plan } = {}) {
  if (!plan || plan.schemaVersion!=='assps-curriculum-migration-plan-v1') throw new Error('Valid curriculum migration plan is required')
  const normalized={schemaVersion:plan.schemaVersion,changes:Array.isArray(plan.changes)?plan.changes:[],summary:plan.summary||{}}
  const expectedHash=sha256(normalized)
  if (plan.planHash && plan.planHash!==expectedHash) { const e=new Error('Curriculum migration plan hash mismatch'); e.code='CURRICULUM_PLAN_HASH_MISMATCH'; throw e }
  return withTenantTransaction(schoolId, async (client,tenantId)=>{
    const versions=await client.query('SELECT id FROM curriculum_profile_versions WHERE school_id=$1 AND id=ANY($2::bigint[])',[tenantId,[Number(fromProfileVersionId),Number(toProfileVersionId)]])
    if (versions.rowCount!==2) { const e=new Error('Curriculum migration endpoints were not found in tenant'); e.code='CURRICULUM_MIGRATION_ENDPOINT_NOT_FOUND'; throw e }
    const inserted=await client.query(`
      INSERT INTO curriculum_migration_plans
        (school_id,from_profile_version_id,to_profile_version_id,plan_hash,plan_json,created_by)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (school_id,from_profile_version_id,to_profile_version_id,plan_hash) DO NOTHING
      RETURNING *`,[tenantId,Number(fromProfileVersionId),Number(toProfileVersionId),expectedHash,JSON.stringify(normalized),userId])
    if (inserted.rowCount) return {...inserted.rows[0],idempotentReplay:false}
    const existing=await client.query(`SELECT * FROM curriculum_migration_plans WHERE school_id=$1 AND from_profile_version_id=$2 AND to_profile_version_id=$3 AND plan_hash=$4`,[tenantId,Number(fromProfileVersionId),Number(toProfileVersionId),expectedHash])
    return {...existing.rows[0],idempotentReplay:true}
  })
}
module.exports={normalizeScope,buildCurriculumMigrationPlan,validateResourceSet,cloneCurriculumProfileVersion,persistCurriculumMigrationPlan,withTenantTransaction,sha256}
