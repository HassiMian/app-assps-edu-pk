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
