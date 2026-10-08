const test = require('node:test')
const assert = require('node:assert/strict')
const { buildDeterministicPlan, parseSmartPlanningText, buildTimetableSlots } = require('../services/lessonPlanningEngine')

const timetable = [
  { day_name:'Monday', start_time:'08:00', end_time:'08:40', subject:'Science', class_name:'Eight', section:'Blue', period_label:'1st' },
  { day_name:'Tuesday', start_time:'08:40', end_time:'09:20', subject:'Math', class_name:'Eight', section:'Blue', period_label:'2nd' },
  { day_name:'Wednesday', start_time:'08:00', end_time:'08:40', subject:'Science', class_name:'Eight', section:'Blue', period_label:'1st' },
]

test('planner expands timetable into real date slots and respects blackout dates', () => {
  const slots = buildTimetableSlots({ timetable, classLevel:'8', section:'Blue', startDate:'2026-10-05', endDate:'2026-10-14', blackoutDates:['2026-10-07'] })
  assert.ok(slots.some(slot => slot.subject === 'Science' && slot.date === '2026-10-05'))
  assert.ok(slots.some(slot => slot.subject === 'Math' && slot.date === '2026-10-06'))
  assert.equal(slots.some(slot => slot.date === '2026-10-07'), false)
})

test('term planner uses curriculum/QBank evidence and never invents missing timetable capacity', () => {
  const context = {
    timetable,
    curriculumScopes:[
      { subject:'Science', scopeType:'chapter', publicId:'sc1', label:'Cells', sortOrder:1, curriculumLabel:'NCP Science v1', curriculumAuthority:'NCC', metadata:{ learning_outcomes:['Explain cell structure'] } },
      { subject:'Science', scopeType:'chapter', publicId:'sc2', label:'Photosynthesis', sortOrder:2, curriculumLabel:'NCP Science v1', curriculumAuthority:'NCC', metadata:{} },
    ],
    questionBankSignals:[{ subject:'Science', chapterName:'Cells', questionCount:36, pastPaperCount:2, longQuestionCount:3 }],
    warnings:[], holidayCalendarAvailable:false,
  }
  const plan = buildDeterministicPlan({ planningType:'term', classLevel:'8', section:'Blue', startDate:'2026-10-05', endDate:'2026-10-14', subjects:['Science','English'], bufferRatio:0.1 }, context)
  const science = plan.subjects.find(item => item.subject === 'Science')
  const english = plan.subjects.find(item => item.subject === 'English')
  assert.equal(science.units[0].label, 'Cells')
  assert.ok(science.lessons.every(lesson => lesson.date && lesson.period))
  assert.equal(english.capacityPeriods, 0)
  assert.equal(english.units[0].label, 'Curriculum mapping required')
  assert.equal(english.units[0].needsReview, true)
  assert.ok(plan.analysis.warnings.some(message => /holiday calendar/i.test(message)))
})

test('smart parser accepts a whole multi-subject day and preserves unclassified text', () => {
  const parsed = parseSmartPlanningText(`English\nChapter 1: Reading Skills\nObjectives: Read with fluency\nHomework: Exercise 4\n\nScience: Photosynthesis\nActivity: Diagram work\nLoose coordinator note`, ['English','Science','Math'])
  assert.equal(parsed.subjects.length, 2)
  assert.equal(parsed.subjects[0].subject, 'English')
  assert.match(parsed.subjects[0].units[0].title, /Reading Skills/)
  assert.equal(parsed.subjects[0].units[0].homework, 'Exercise 4')
  assert.equal(parsed.subjects[1].subject, 'Science')
  assert.ok(parsed.subjects[1].notes.some(note => /Loose coordinator note/.test(note)))
})

test('calendar validation refuses nonexistent dates and does not invent rollover lessons', () => {
  const { parseIsoDate, enumerateDates } = require('../services/lessonPlanningEngine')
  assert.equal(parseIsoDate('2026-02-30'), null)
  assert.equal(parseIsoDate('2026-13-01'), null)
  assert.equal(parseIsoDate('2026-02-29'), null)
  assert.ok(parseIsoDate('2028-02-29'))
  assert.deepEqual(enumerateDates('2026-02-30', '2026-03-03'), [])
  assert.deepEqual(enumerateDates('2026-10-12', '2026-10-08'), [])
})

test('calendar expansion rejects out-of-policy term ranges rather than silently truncating', () => {
  const { enumerateDates, MAX_RANGE_DAYS } = require('../services/lessonPlanningEngine')
  assert.equal(enumerateDates('2026-01-01', '2027-01-05').length, MAX_RANGE_DAYS)
  assert.throws(() => enumerateDates('2026-01-01', '2027-01-06'), /exceeds 370 calendar days/)
})

test('scarce timetable allocation never assigns imaginary teaching periods', () => {
  const { allocatePeriods } = require('../services/lessonPlanningEngine')
  const units = [{id:'a',weight:2},{id:'b',weight:1},{id:'c',weight:1},{id:'d',weight:1}]
  for (const capacity of [0,1,2,3,4,5,10,19]) {
    const result = allocatePeriods(units, capacity)
    assert.equal(result.reduce((sum,item) => sum + item.allocatedPeriods,0), capacity)
    assert.ok(result.every(item => Number.isInteger(item.allocatedPeriods) && item.allocatedPeriods >= 0))
  }
  assert.equal(allocatePeriods(units, 2).filter(item=>item.allocatedPeriods>0).length,2)
  assert.equal(allocatePeriods(units, NaN).reduce((sum,item)=>sum+item.allocatedPeriods,0),0)
})

test('invalid calendar blackouts and buffer ratios never invalidate scheduled capacity', () => {
  const { buildTimetableSlots, buildDeterministicPlan } = require('../services/lessonPlanningEngine')
  const context = { timetable:[{class_name:'8',section:'A',subject:'Science',day_name:'Thursday',period_label:'P1'}], curriculumScopes:[], questionBankSignals:[], warnings:[], holidayCalendarAvailable:false }
  const slots = buildTimetableSlots({ timetable:context.timetable,classLevel:'8',section:'A',startDate:'2026-10-08',endDate:'2026-10-08',blackoutDates:['2026-02-30'] })
  assert.equal(slots.length,1)
  const plan = buildDeterministicPlan({ classLevel:'8',section:'A',startDate:'2026-10-08',endDate:'2026-10-08',subjects:['Science'],bufferRatio:'invalid' },context)
  assert.equal(plan.bufferRatio,0.1)
  assert.equal(plan.subjects[0].capacityPeriods,1)
})
