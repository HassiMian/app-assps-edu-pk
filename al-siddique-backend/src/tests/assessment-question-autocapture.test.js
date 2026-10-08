process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
const test = require('node:test')
const assert = require('node:assert/strict')
const { extractReleaseQuestionCandidates } = require('../services/assessmentQuestionAutoCapture')

test('finalized snapshot extractor inherits academic context and skips ineligible blocks', () => {
  const snapshot = {
    metadata:{ classLevel:'7', subject:'Science', language:'english' },
    assessment:{ scope:{ chapterId:'ch-4', label:'Force and Motion', learningScopeIds:['slo-force','slo-motion'] } },
    sections:[
      {
        id:'s1',
        title:'Short Questions',
        nodes:[
          { id:'q1', type:'short_question', stemText:'Define force.', authoritativeNodeMarks:2, answer:'A push or pull.' },
          { id:'scratch', type:'rich_text', content:'Teacher note', authoritativeNodeMarks:1, excludeFromQuestionBank:true },
          { id:'zero', type:'short_question', stemText:'Zero mark instruction', authoritativeNodeMarks:0 },
        ],
      },
      {
        id:'s2',
        title:'MCQs',
        nodes:[
          {
            id:'q2', type:'mcq', stemText:'Which is a contact force?', authoritativeNodeMarks:1,
            options:[
              { displayLabel:'A', text:'Friction', isCorrect:true },
              { displayLabel:'B', text:'Gravity', isCorrect:false },
            ],
          },
        ],
      },
    ],
  }

  const candidates = extractReleaseQuestionCandidates({
    snapshot,
    releaseId:'release-7-science-r1',
    paperPublicId:'paper-7-science',
  })

  assert.equal(candidates.length,2)
  assert.equal(candidates[0].question.classLevel,'7')
  assert.equal(candidates[0].question.subject,'Science')
  assert.equal(candidates[0].question.chapterNo,'ch-4')
  assert.equal(candidates[0].question.chapterName,'Force and Motion')
  assert.equal(candidates[0].question.marks,2)
  assert.equal(candidates[1].question.correctOption,'A')
  assert.deepEqual(candidates[1].question.options.map(x=>x.text),['Friction','Gravity'])

  const mappingTypes = new Set(candidates[0].mappings.map(x=>x.mappingType))
  for (const expected of ['assessment_release','class_level','subject','chapter_id','learning_scope_id']) {
    assert.ok(mappingTypes.has(expected), expected)
  }
  assert.equal(candidates[0].mappings.filter(x=>x.mappingType==='learning_scope_id').length,2)
})

test('paper-level opt-out yields no capture candidates', () => {
  const candidates = extractReleaseQuestionCandidates({
    releaseId:'release-optout',
    paperPublicId:'paper-optout',
    snapshot:{
      metadata:{classLevel:'3',subject:'English'},
      assessment:{captureToQuestionBank:false},
      sections:[{id:'s1',nodes:[{id:'q1',type:'short_question',stemText:'Question?',authoritativeNodeMarks:2}]}],
    },
  })
  assert.equal(candidates.length,0)
})
