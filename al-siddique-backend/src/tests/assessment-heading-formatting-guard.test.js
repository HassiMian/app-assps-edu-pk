'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {validateCanonicalHeadingFormatting,validateFragment}=require('../services/assessmentHeadingFormattingGuard')
const payload=(questionSerial='',headingInstruction='')=>({sections:[{headingFormatting:{questionSerial,headingInstruction}}]})
test('real semantic browser markup and Urdu compact parenthesis safely accepted',()=>{
 const left='<span style="font-weight:bold;font-style:italic;display:inline-block;transform:skewX(-8deg);text-decoration-line:underline">سوال</span> <b>نمبر 1:</b>'
 const right='<u>درست جواب</u> <span dir="ltr" style="font-family:Arial, sans-serif;font-size:0.85em">(✓)</span> لکھیں۔'
 assert.equal(validateCanonicalHeadingFormatting(payload(left,right)),null)
 assert.equal(validateFragment('<b>Q1.</b> <span style="text-decoration-line:underline;color:rgb(18, 52, 86)">Explain</span>'),true)
 assert.equal(validateCanonicalHeadingFormatting({sections:[{heading:'Legacy section without optional formatted fields'}]}),null)
})
test('reject XSS, event handlers, hidden CSS positioning and untrusted markup',()=>{
 const invalid=[
  '<script>alert(1)</script>','<img src="x" onerror="alert(1)">','<svg onload="alert(1)"></svg>',
  '<span onclick="evil()">click</span>','<span style="position:absolute">evil</span>',
  '<span style="font-family:url(javascript:x)">x</span>',
  '<span style="color:expression(alert(1))">X</span>',
  '<span style="color:red!important">X</span>',
  '<span style="color:#abc; color:#def">duplicate</span>',
  '<span class="editor">x</span>',
  '<b><u>unclosed</b></u>',
  '<b>unterminated','<span dir="rtl" dir="ltr">duplicate</span>',
  '<a href="https://evil.invalid">link</a>',
  '<span style="display:block">layout</span>',
  '<span style="transform:rotate(180deg)">x</span>',
 ]
 for(const html of invalid) assert.ok(validateCanonicalHeadingFormatting(payload('Q1.',html)),`Rejected: ${html}`)
 assert.ok(validateCanonicalHeadingFormatting({sections:[{headingFormatting:{questionSerial:'Q1.',headingInstruction:'Okay',answerKey:'secret'}}]}))
 assert.ok(validateCanonicalHeadingFormatting({sections:[{headingFormatting:{questionSerial:42,headingInstruction:'hi'}}]}))
 assert.ok(validateCanonicalHeadingFormatting(payload('Q1.', 'a'.repeat(16001))))
})
test('valid formatting is accepted without editing canonical plain question or marks',()=>{
 const doc={sections:[{heading:'Q1. Why do plants need sunlight?',marks:10,headingFormatting:{questionSerial:'<b>Q1.</b>',headingInstruction:'<u>Why</u> do plants need sunlight?'}}]}
 const original=JSON.stringify(doc)
 assert.equal(validateCanonicalHeadingFormatting(doc),null)
 assert.equal(JSON.stringify(doc),original)
})
