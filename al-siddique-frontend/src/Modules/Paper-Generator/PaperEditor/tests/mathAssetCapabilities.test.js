import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ContentCapability,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'
import {
  createManualAssessmentDocument,
  validateManualAssessmentForRelease,
} from '../../AssessmentStudio/core/manualAssessmentDocument.js'

const PNG_1PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='

function makeDoc() {
  return createManualAssessmentDocument({
    paper:{
      clientDraftId:'math-assets-test',
      userAuthored:true,
      assessmentType:'Weekly Assessment',
      official_section:[
        {
          id:'math-1',
          heading:'Q1. Solve the expression.',
          content:'Use the expression below.',
          marks:2,
          layoutPreset:'math',
          math:{format:'latex',source:'x^2 + y^2 = z^2',display:'block'},
        },
        {
          id:'image-1',
          heading:'Q2. Study the diagram.',
          content:'Name the object shown.',
          marks:2,
          layoutPreset:'image',
          asset:{
            id:'asset-image-1',
            kind:'image',
            storage:'embedded',
            mimeType:'image/png',
            sha256:'a'.repeat(64),
            byteLength:68,
            widthPx:1,
            heightPx:1,
            effectiveDpi:25.4,
            altText:'A one-pixel test image',
            description:'Deterministic test fixture',
            contentDataUrl:PNG_1PX,
          },
        },
      ],
    },
    config:{
      title:'Math & Image Assessment',
      classLevel:'7',
      className:'7',
      subject:'Mathematics',
      subjectName:'Mathematics',
      language:'english',
      totalMarks:4,
      timeAllowed:'20 minutes',
      session:'2026-2027',
    },
    paperSettings:{schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',address:'Sharif Chowk, Rayya Khas, Narowal'},
  })
}

test('manual Math/Image blocks stay orthogonal to interaction type and persist canonical capability payloads',()=>{
  const doc=makeDoc()
  const mathNode=doc.sections[0].nodes[0]
  const imageNode=doc.sections[1].nodes[0]

  assert.equal(mathNode.type,'short_question')
  assert.deepEqual(mathNode.contentCapabilities,[ContentCapability.MATH])
  assert.deepEqual(mathNode.math,{format:'latex',source:'x^2 + y^2 = z^2',display:'block'})

  assert.equal(imageNode.type,'rich_text')
  assert.deepEqual(imageNode.contentCapabilities,[ContentCapability.IMAGE])
  assert.deepEqual(imageNode.assetRefs,['asset-image-1'])

  assert.equal(doc.assets.length,1)
  assert.equal(doc.assets[0].id,'asset-image-1')
  assert.equal(doc.assets[0].sha256,'a'.repeat(64))
  assert.equal(doc.assets[0].altText,'A one-pixel test image')

  const validation=validateCanonicalPaperDocument(doc)
  assert.equal(validation.valid,true,validation.errors.join('\n'))
  assert.equal(validateManualAssessmentForRelease(doc).valid,true)
})

test('image capability fails closed when checksum is malformed or referenced asset is missing',()=>{
  const malformed=structuredClone(makeDoc())
  malformed.assets[0].sha256='bad'
  const malformedValidation=validateCanonicalPaperDocument(malformed)
  assert.equal(malformedValidation.valid,false)
  assert.ok(malformedValidation.errors.some(error=>error.includes('sha256')))

  const missing=structuredClone(makeDoc())
  missing.assets=[]
  const missingValidation=validateCanonicalPaperDocument(missing)
  assert.equal(missingValidation.valid,false)
  assert.ok(missingValidation.errors.some(error=>error.includes('references missing asset')))
})
