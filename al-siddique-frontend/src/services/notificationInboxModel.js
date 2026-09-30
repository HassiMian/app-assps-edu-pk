/* Shared presenter model: never manufacture notification events or delete the shared log. */
export const RECENT_NOTIFICATION_DAYS = 30
export function isNotificationRecent(notification, days = RECENT_NOTIFICATION_DAYS, now = Date.now()) {
  const stamp=Date.parse(notification?.sentAt || notification?.sent_at || '')
  return Number.isFinite(stamp) && stamp <= now + 60000 && stamp >= now - days*86400000
}
export function notificationDismissKey(user = {}) {
  const school=String(user?.school_id || user?.schoolId || 'school')
  const person=String(user?.id || 'anonymous')
  return ['assps_v14_hidden_notification_ids',school,person].join(':')
}
export function readDismissedIds(key, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  try { const value=JSON.parse(storage?.getItem(key) || '[]'); return new Set(Array.isArray(value)?value.map(String):[]) }
  catch { return new Set() }
}
export function persistDismissedIds(key, ids, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const next=new Set([...ids].map(String))
  try { storage?.setItem(key,JSON.stringify([...next].slice(-500))) } catch {}
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('assps-notifications-hidden-updated', { detail:{key} })) } catch {}
  return next
}
export function sortNotificationEvents(rows = []) {
  return [...rows].sort((a,b)=>{
    const aTime=Date.parse(a?.sentAt || a?.sent_at || '') || 0
    const bTime=Date.parse(b?.sentAt || b?.sent_at || '') || 0
    return bTime-aTime || (Number(b?.id)||0)-(Number(a?.id)||0)
  })
}
export function presentInbox(rows = [], hiddenIds = new Set(), now = Date.now()) {
  const visible=sortNotificationEvents(rows).filter(row=>!hiddenIds.has(String(row?.id)))
  return {
    recent:visible.filter(row=>isNotificationRecent(row,RECENT_NOTIFICATION_DAYS,now)),
    history:visible.filter(row=>!isNotificationRecent(row,RECENT_NOTIFICATION_DAYS,now)),
  }
}
