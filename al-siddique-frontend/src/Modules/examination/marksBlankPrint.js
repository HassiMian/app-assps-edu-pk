// Escape all school-owned/user-entered fields in print-only HTML. A school or
// student record must never become markup, event handlers, or a network URL.
export const escapeMarksPrintHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c])
export function approvedMarksLogoUrl(input) {
 const raw=String(input ?? '').trim()
 if(!raw)return ''
 if(/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(raw))return raw
 if(/^blob:https:\/\/app\.assps\.edu\.pk\/[a-z0-9-]+$/i.test(raw))return raw
 try {
  const asset=new URL(raw,'https://api.assps.edu.pk')
  if(asset.protocol!=='https:' || !['api.assps.edu.pk','app.assps.edu.pk'].includes(asset.hostname) ||
    !asset.pathname.startsWith('/uploads/branding/') ||
    !/\.(png|jpe?g|webp)$/i.test(asset.pathname) || asset.username || asset.password || asset.search || asset.hash)return ''
  return asset.href
 } catch{return ''}
}
export function countRecordedMarks(rows=[], subject='',allowedStudents=[]) {
 const ids=new Set((allowedStudents||[]).map(s=>String(s.id)))
 return (rows||[]).filter(row=>String(row.subject||'').trim()===subject && ids.has(String(row.student_id)) && row.marks_obtained!==null && row.marks_obtained!==undefined && String(row.marks_obtained).trim()!=='' && Number.isFinite(Number(row.marks_obtained))).length
}
