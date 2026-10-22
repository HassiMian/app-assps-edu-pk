'use strict'
// Prevent any future Mover Computer result for ASSPS first term. Pure, tenant-scoped.
const {normalizeClassName,subjectsForClass}=require('../config/firstTermExam2026')
const required = new Map(subjectsForClass('Mover').map(row =>
 [String(row.subject).trim().toLowerCase(),row.subject.endsWith('Written')?50:25]
))
function validateMoverFirstTermResults({schoolId,results,students,exams}) {
 const lookup=new Map((students||[]).map(student=>[Number(student.id),student]))
 const examsById=new Map((exams||[]).map(exam=>[Number(exam.id),exam]))
 return (results||[]).every(row=>{
  if(Number(schoolId)!==1 || Number(row.examId)!==9) return true
  const exam=examsById.get(Number(row.examId))
  if(!exam || String(exam.name).trim()!=='First Term Exam') return true
  const student=lookup.get(Number(row.studentId))
  if(!student) return false
  if(normalizeClassName(student.class)!=='Mover') return true
  const key=String(row.subject||'').trim().toLowerCase()
  return required.has(key) && Number(row.totalMarks)===required.get(key)
 })
}
module.exports={validateMoverFirstTermResults}
