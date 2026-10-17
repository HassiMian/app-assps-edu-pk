'use strict'

// One immutable school-wide bell schedule. Historical timetable rows remain unmodified.
// Version is explicitly pinned so clients can detect stale cached schedules.
const version = 'assps-school1-bells-20261016-v1'
const schoolId = 1
const regular = [
  ['Assembly','08:30','08:45'],
  ['Period 1','08:45','09:25'],
  ['Period 2','09:25','09:55'],
  ['Period 3','09:55','10:25'],
  ['Period 4','10:25','10:55'],
  ['Period 5','10:55','11:25'],
  ['Period 6','11:25','11:55'],
  ['Break','11:55','12:20'],
  ['Period 7','12:20','12:50'],
  ['Period 8','12:50','13:30']
]
const friday = [
  ['Assembly','08:30','08:45'],
  ['Period 1','08:45','09:20'],
  ['Period 2','09:20','09:50'],
  ['Period 3','09:50','10:15'],
  ['Period 4','10:15','10:40'],
  ['Period 5','10:40','11:05'],
  ['Period 6','11:05','11:30'],
  ['Period 7','11:30','12:00'],
  ['Period 8','12:00','12:30']
]
const slots = (entries) => Object.freeze(entries.map(([label,start,end],order) =>
  Object.freeze({order, label, start, end})))
const schedule = Object.freeze({
  school_id: schoolId,
  version,
  timezone: 'Asia/Karachi',
  academic_session: '2026–27',
  effective_date: '2026-10-16',
  regular_days: Object.freeze(['Monday','Tuesday','Wednesday','Thursday','Saturday']),
  friday_day: 'Friday',
  regular: slots(regular),
  friday: slots(friday)
})
function schoolBellSchedule(requestSchoolId) {
  return Number(requestSchoolId) === schoolId ? schedule : null
}
module.exports = {schoolBellSchedule, version}
