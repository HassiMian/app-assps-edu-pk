const crypto = require('crypto')

const SCOPE_TYPES = new Set(['chapter','topic','skill','learning_outcome','cross_chapter','general'])
const RESOURCE_ROLES = new Set(['primary','supporting'])
const RESOURCE_FIELDS = new Set(['publisher','publisherId','book','bookId','edition','editionId','resourceSetId','resourceVersionId'])

const text = value => String(value ?? '').trim()
const stableKey = value => text(value).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9._:-]+/g,'-').replace(/^-+|-+$/g,'')
const clone = value => JSON.parse(JSON.stringify(value))

function normalizeScope(scope = {}) {
  const type = text(scope.scopeType ?? scope.scope_type).toLowerCase()
  if (!SCOPE_TYPES.has(type)) {
    const error = new Error(`Unsupported learning scope type: ${type || '<empty>'}`)
    error.code = 'INVALID_LEARNING_SCOPE_TYPE'
    throw error
  }
  const key = stableKey(scope.stableKey ?? scope.stable_key)
  if (!key) {
    const error = new Error('Learning scope stable key is required.')
    error.code = 'LEARNING_SCOPE_KEY_REQUIRED'
    throw error
  }
  return {
    publicId:text(scope.publicId ?? scope.public_id) || null,
    stableKey:key,
    scopeType:type,
    label:text(scope.label),
    parentStableKey:stableKey(scope.parentStableKey ?? scope.parent_stable_key) || null,
    externalId:text(scope.externalId ?? scope.external_id) || null,
  }
}

function assertCurriculumResourceSeparation(profile = {}) {
  const coupled = [...RESOURCE_FIELDS].filter(key => profile[key] !== undefined && profile[key] !== null && profile[key] !== '')
  if (coupled.length) {
    const error = new Error(`Curriculum profile must not embed resource coordinates: ${coupled.join(', ')}`)
    error.code = 'CURRICULUM_RESOURCE_COUPLING_FORBIDDEN'
    error.fields = coupled
    throw error
  }
  return true
}

function cloneCurriculumProfileSpec(profile = {}, overrides = {}) {
  assertCurriculumResourceSeparation(profile)
  const next = {
    publicId:overrides.publicId || `cp_${crypto.randomUUID()}`,
    academicSessionId:overrides.academicSessionId ?? profile.academicSessionId,
    subjectOfferingId:overrides.subjectOfferingId ?? profile.subjectOfferingId,
    version:Number(overrides.version ?? Number(profile.version || 0) + 1),
    status:'draft',
    authorityType:overrides.authorityType ?? profile.authorityType ?? null,
    authorityName:overrides.authorityName ?? profile.authorityName ?? null,
    supersedesId:overrides.supersedesId ?? profile.id ?? null,
    metadata:clone(overrides.metadata ?? profile.metadata ?? {}),
  }
  if (!Number.isInteger(next.version) || next.version < 1) throw new Error('Curriculum profile version must be a positive integer.')
  return next
}

function normalizeAliasMap(aliases = {}) {
  const out = new Map()
  if (Array.isArray(aliases)) {
    for (const entry of aliases) {
      const from=stableKey(entry?.from ?? entry?.oldKey); const to=stableKey(entry?.to ?? entry?.newKey)
      if (from && to) out.set(from,to)
    }
  } else if (aliases && typeof aliases === 'object') {
    for (const [fromValue,toValue] of Object.entries(aliases)) {
      const from=stableKey(fromValue); const to=stableKey(toValue)
      if (from && to) out.set(from,to)
    }
  }
  return out
}

function planCurriculumScopeMigration({ fromScopes = [], toScopes = [], aliases = {} } = {}) {
  const oldScopes = fromScopes.map(normalizeScope)
  const newScopes = toScopes.map(normalizeScope)
  const aliasMap = normalizeAliasMap(aliases)
  const newByKey = new Map(newScopes.map(scope=>[scope.stableKey,scope]))
  const matchedNew = new Set()
  const entries=[]

  for (const oldScope of oldScopes) {
    const direct = newByKey.get(oldScope.stableKey)
    if (direct) {
      matchedNew.add(direct.stableKey)
      entries.push({status:'equivalent',from:oldScope,to:direct,requiresReview:oldScope.scopeType!==direct.scopeType})
      continue
    }
    const aliasedKey = aliasMap.get(oldScope.stableKey)
    const aliased = aliasedKey ? newByKey.get(aliasedKey) : null
    if (aliased) {
      matchedNew.add(aliased.stableKey)
      entries.push({status:'renamed_or_moved',from:oldScope,to:aliased,requiresReview:true})
      continue
    }
    entries.push({status:'removed',from:oldScope,to:null,requiresReview:true})
  }

  for (const newScope of newScopes) {
    if (!matchedNew.has(newScope.stableKey)) entries.push({status:'added',from:null,to:newScope,requiresReview:true})
  }

  const counts=entries.reduce((acc,entry)=>{acc[entry.status]=(acc[entry.status]||0)+1;return acc},{equivalent:0,renamed_or_moved:0,removed:0,added:0})
  return {
    version:1,
    entries,
    counts,
    safeAutomaticMappings:entries.filter(x=>x.status==='equivalent'&&!x.requiresReview).length,
    requiresReview:entries.some(x=>x.requiresReview),
  }
}

function assertResourceRole(role) {
  const normalized=text(role).toLowerCase()
  if (!RESOURCE_ROLES.has(normalized)) {
    const error=new Error(`Unsupported resource role: ${normalized || '<empty>'}`)
    error.code='INVALID_RESOURCE_ROLE'
    throw error
  }
  return normalized
}

module.exports={
  SCOPE_TYPES,
  RESOURCE_ROLES,
  stableKey,
  normalizeScope,
  assertCurriculumResourceSeparation,
  cloneCurriculumProfileSpec,
  planCurriculumScopeMigration,
  assertResourceRole,
}
