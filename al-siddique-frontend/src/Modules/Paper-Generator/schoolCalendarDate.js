// ASSPS school-day defaults follow the Pakistani teaching calendar, not UTC
// or a teacher laptop's travel timezone. Existing saved dates are untouched.
export const ASSPS_SCHOOL_TIME_ZONE = 'Asia/Karachi'
const schoolDateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: ASSPS_SCHOOL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
export function currentSchoolDate(at = new Date()) {
  const parts = Object.fromEntries(schoolDateParts.formatToParts(at).map(part=>[part.type,part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
