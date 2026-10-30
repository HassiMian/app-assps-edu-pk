const test=require('node:test')
const assert=require('node:assert/strict')
const {promotionErrorMap}=require('../services/promotionErrorMap')
test('known database academic rejection yields clear 409-safe reason',()=>{
 for(const message of ['CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL','CLASS_EIGHT_PAPER_MAXIMA_NOT_FULLY_APPROVED','CLASS_EIGHT_STUDENT_MARKS_NOT_COMPLETE_OR_DENOMINATOR_MISMATCH','CLASS_EIGHT_MUST_ENTER_EXACT_APPROVED_PRE_NINE_SECTION']){
  const mapped=promotionErrorMap({code:'23514',message})
  assert.ok(mapped)
  assert.ok(mapped.message.includes('No students were moved.'))
 }
})
test('non-database or unrecognized errors are never falsely labeled academic approval',()=>{
 assert.equal(promotionErrorMap({code:'23514',message:'SOMETHING_ELSE'}),null)
 assert.equal(promotionErrorMap({message:'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'}),null)
})
