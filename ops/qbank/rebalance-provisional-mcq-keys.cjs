'use strict'
const fs = require('node:fs')
const path = require('node:path')

const LABELS = ['A','B','C','D']
const DEFAULT_DIR = path.resolve(__dirname, '../../al-siddique-backend/src/scripts/generated')

function norm(value='') { return String(value).trim().replace(/\s+/g,' ') }

function distribution(rows=[]) {
  const counts={A:0,B:0,C:0,D:0,OTHER:0}
  for (const q of rows) {
    if (String(q.category||'').toLowerCase() !== 'mcq') continue
    const key=String(q.correct_option||'').trim().toUpperCase()
    if (LABELS.includes(key)) counts[key] += 1
    else counts.OTHER += 1
  }
  const total=Object.values(counts).reduce((a,b)=>a+b,0)
  const peak=Math.max(counts.A,counts.B,counts.C,counts.D,counts.OTHER)
  return { total, counts, largestShare:total?Number((peak/total).toFixed(4)):0 }
}

function rebalanceQuestion(question, targetIndex) {
  if (String(question.category||'').toLowerCase() !== 'mcq') return { question, changed:false }
  const beforeOptions=Array.isArray(question.options)?question.options.map(o=>({...o})):[]
  if (beforeOptions.length !== 4) throw new Error(`MCQ_OPTION_COUNT_INVALID:${question.id||'unknown'}:${beforeOptions.length}`)
  const currentKey=String(question.correct_option||'').trim().toUpperCase()
  const currentIndex=beforeOptions.findIndex(o=>String(o.id||'').trim().toUpperCase()===currentKey)
  if (currentIndex < 0) throw new Error(`MCQ_CORRECT_KEY_INVALID:${question.id||'unknown'}:${currentKey}`)
  const shift=(targetIndex-currentIndex+4)%4
  const rotated=Array(4)
  for (let i=0;i<4;i++) rotated[(i+shift)%4]={...beforeOptions[i]}
  const beforeTexts=beforeOptions.map(o=>norm(o.text)).sort()
  for (let i=0;i<4;i++) rotated[i].id=LABELS[i]
  const afterTexts=rotated.map(o=>norm(o.text)).sort()
  if (JSON.stringify(beforeTexts)!==JSON.stringify(afterTexts)) throw new Error(`MCQ_OPTION_TEXT_MUTATED:${question.id||'unknown'}`)
  const correctTextBefore=norm(beforeOptions[currentIndex].text)
  const correctTextAfter=norm(rotated[targetIndex].text)
  if (correctTextBefore!==correctTextAfter) throw new Error(`MCQ_CORRECT_ANSWER_MOVED_WRONG:${question.id||'unknown'}`)
  return {
    question:{...question, options:rotated, correct_option:LABELS[targetIndex]},
    changed:shift!==0 || beforeOptions.some((o,i)=>String(o.id||'').toUpperCase()!==LABELS[i]),
  }
}

function rebalanceRows(rows=[]) {
  let mcqOrdinal=0, changed=0
  const before=distribution(rows)
  const out=rows.map(q=>{
    if (String(q.category||'').toLowerCase()!=='mcq') return q
    const targetIndex=mcqOrdinal%4
    mcqOrdinal += 1
    const result=rebalanceQuestion(q,targetIndex)
    if (result.changed) changed += 1
    return result.question
  })
  const after=distribution(out)
  return { rows:out, changed, before, after }
}

function listSeedFiles(dir=DEFAULT_DIR) {
  return fs.readdirSync(dir)
    .filter(name=>/_provisional_seed_.*\.json$/i.test(name))
    .sort()
    .map(name=>path.join(dir,name))
}

function rebalanceFile(file,{apply=false}={}) {
  const original=JSON.parse(fs.readFileSync(file,'utf8'))
  const rows=Array.isArray(original)?original:original.questions
  if (!Array.isArray(rows)) throw new Error(`SEED_QUESTIONS_MISSING:${path.basename(file)}`)
  const result=rebalanceRows(rows)
  const next=Array.isArray(original)?result.rows:{...original,questions:result.rows}
  if (apply && result.changed) fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n')
  return {file:path.basename(file),...result}
}

function run({dir=DEFAULT_DIR,apply=false}={}) {
  const files=listSeedFiles(dir)
  const reports=files.map(file=>rebalanceFile(file,{apply}))
  const totals={files:files.length,mcqs:0,changed:0,before:{A:0,B:0,C:0,D:0,OTHER:0},after:{A:0,B:0,C:0,D:0,OTHER:0},flaggedBefore:0,flaggedAfter:0}
  for (const r of reports) {
    totals.mcqs += r.after.total
    totals.changed += r.changed
    for (const k of Object.keys(totals.before)) { totals.before[k]+=r.before.counts[k]; totals.after[k]+=r.after.counts[k] }
    if (r.before.total>=10 && r.before.largestShare>0.8) totals.flaggedBefore += 1
    if (r.after.total>=10 && r.after.largestShare>0.8) totals.flaggedAfter += 1
  }
  return {mode:apply?'APPLY':'DRY_RUN',dir,totals,reports}
}

if (require.main===module) {
  const apply=process.argv.includes('--apply')
  const dirArg=process.argv.indexOf('--dir')
  const dir=dirArg>=0?path.resolve(process.argv[dirArg+1]):DEFAULT_DIR
  const report=run({dir,apply})
  console.log(JSON.stringify(report,null,2))
  if (report.totals.flaggedAfter>0) process.exitCode=2
}

module.exports={LABELS,distribution,rebalanceQuestion,rebalanceRows,listSeedFiles,rebalanceFile,run}
