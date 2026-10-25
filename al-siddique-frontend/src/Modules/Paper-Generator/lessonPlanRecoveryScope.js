// Recovery is browser-only, untrusted and must NEVER bypass server ownership checks.
// Legacy school-wide/localStorage records stay in place but are not auto-imported.
const LP_KEY = 'al_siddique_lesson_plans'

export function lessonPlanRecoveryKey(user) {
  const school = user?.tenant_id || user?.tenantId || user?.school_id || user?.schoolId || user?.school_code || user?.schoolCode
  const actor = user?.id ?? user?.user_id ?? user?.userId
  if (!school || (typeof actor !== 'string' && typeof actor !== 'number')) return null
  const id = String(actor).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  return id ? `${LP_KEY}__actor-${id}` : null
}
