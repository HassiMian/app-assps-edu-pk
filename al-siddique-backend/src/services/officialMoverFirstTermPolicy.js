'use strict'
// Exam 9 / Mover (Nursery) published school matrix: 3 written x 50 + 4 oral x 25 = 250.
// This is a forward-write gate ONLY; legacy saved rows must never be deleted or renamed.
const {normalizedClass}=require('./examMarksTeacherScope')
const official=Object.freeze({
  'english written':50,'mathematics written':50,'urdu written':50,
  'english oral':25,'mathematics oral':25,'urdu oral':25,'general knowledge oral':25
})
const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ')
function officialMoverFirstTermAllows({examId,className,subject,totalMarks}={}) {
 if(Number(examId)!==9||normalizedClass(className)!=='mover')return true
 const max=official[norm(subject)]
 return max!==undefined&&(totalMarks===undefined||totalMarks===null||Number(totalMarks)===max)
}
module.exports={officialMoverFirstTermAllows,official}
