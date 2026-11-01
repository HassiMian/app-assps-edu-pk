'use strict'
// The AI queue pause/resume flag is process-wide and persists in unscoped
// ai_queue_state; school admin and Principal must never change other schools' jobs.
const canManageGlobalAiQueue=(actor) => Boolean(actor && actor.role==='super_admin')
module.exports={canManageGlobalAiQueue}
