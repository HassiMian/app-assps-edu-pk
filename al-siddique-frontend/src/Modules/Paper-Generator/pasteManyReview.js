// Paste Many parser and review. Parsing never writes or invents marks/answers.
const trim=v=>String(v??'').trim()
const clean=s=>trim(s).replace(/\s+/gu,' ').replace(/[.!?؟,،;؛:]+$/gu,'').toLocaleLowerCase()
const OPTION=/^\s*(?:\(([A-Da-d])\)|([A-Da-d])[.):])\s*(.+)$/u
const TAG=/^\s*(Q|UR|ANS|MARKS|CHAP|TOPIC|PRI|MEDIUM|LEFT|RIGHT|URA|URB|URC|URD|A|B|C|D)\s*:\s*(.*)$/iu
const NUMBERED=/^\s*(?:(?:Q(?:uestion)?\s*(?:No\.?\s*)?)?(\d{1,3})[.):-]\s+)(.+)$/iu
const hasUrdu=/[\u0600-\u06FF]/
const separator=line=>/^\s*(?:-{3,}|={3,})\s*$/u.test(line)
const priorities=new Set(['all','exercise','past','additional'])
const languages=new Set(['english','urdu','dual'])
export const PASTE_MANY_SUPPORTED_TYPES=new Set(['mcq','true_false','fill','columns','short','long','definition','numerical','comprehension','translation','essay','letter','sentence_correction','alfaz_maani','muhawara','grammar'])
const asList=v=>trim(v).split('|').map(trim).filter(Boolean)
function blankRow(index,type,medium) {
 return {id:'paste-row-'+index,included:true,type,medium,text:'',textUrdu:'',marks:'',answer:'',
 chapter:'',topic:'',priority:'all',options:[],leftColumn:[],rightColumn:[],parseWarnings:[]}
}
function parseStructured(block,index,type,medium) {
 const row=blankRow(index,type,medium),tags=new Map()
 let last=''
 for(const line of block.split(/\r?\n/u)) {
  if(!trim(line))continue
  const m=line.match(TAG)
  if(m){
   const tag=m[1].toUpperCase(),value=trim(m[2])
   if(tags.has(tag))row.parseWarnings.push('Repeated '+tag+' field: review combined text.')
   tags.set(tag,trim((tags.get(tag)||'')+(tags.has(tag)?'\n':'')+value));last=tag
  } else if(['Q','UR','ANS'].includes(last)) {
   tags.set(last,trim((tags.get(last)||'')+'\n'+trim(line)))
  } else row.parseWarnings.push('Unrecognized line: '+trim(line).slice(0,80))
 }
 row.text=tags.get('Q')||'';row.textUrdu=tags.get('UR')||''
 row.answer=tags.get('ANS')||'';row.marks=tags.get('MARKS')||''
 row.chapter=tags.get('CHAP')||'';row.topic=tags.get('TOPIC')||''
 row.priority=tags.get('PRI')||'all';row.medium=tags.get('MEDIUM')||medium
 row.leftColumn=asList(tags.get('LEFT'));row.rightColumn=asList(tags.get('RIGHT'))
 if(!tags.has('MEDIUM')&&row.text&&row.textUrdu){row.medium='dual';row.parseWarnings.push('Both Q and UR supplied: default changed to Dual; confirm medium.') }
 row.options=['A','B','C','D'].map(label=>({label,text:tags.get(label)||'',textUrdu:tags.get('UR'+label)||''}))
  .filter(o=>o.text||o.textUrdu)
 if(row.medium==='urdu'&&row.text&&!row.textUrdu&&hasUrdu.test(row.text)){row.textUrdu=row.text;row.text=''}
 return row
}
function parsePlain(group,index,type,medium){
 const row=blankRow(index,type,medium),lines=group.split(/\r?\n/u).map(trim).filter(Boolean)
 if(!lines.length)return row
 row.text=lines[0].replace(NUMBERED,(_m,_n,text)=>text)
 for(const line of lines.slice(1)){
  const opt=type==='mcq'?line.match(OPTION):null
  if(opt){
   const label=(opt[1]||opt[2]).toUpperCase()
   if(row.options.some(o=>o.label===label))row.parseWarnings.push('Repeated option '+label+'.')
   else row.options.push({label,text:trim(opt[3]),textUrdu:''})
   continue
  }
  const tagged=line.match(TAG)
  if(tagged){
   const tag=tagged[1].toUpperCase(),v=trim(tagged[2])
   if(tag==='ANS')row.answer=v
   else if(tag==='MARKS')row.marks=v
   else if(tag==='UR')row.textUrdu=v
   else if(tag==='CHAP')row.chapter=v
   else if(tag==='TOPIC')row.topic=v
   else if(tag==='PRI')row.priority=v
   else if(tag==='MEDIUM')row.medium=v
   else if(tag==='LEFT')row.leftColumn=asList(v)
   else if(tag==='RIGHT')row.rightColumn=asList(v)
   else if(['A','B','C','D'].includes(tag)&&type==='mcq'){
    if(row.options.some(o=>o.label===tag))row.parseWarnings.push('Repeated option '+tag+'.')
    else row.options.push({label:tag,text:v,textUrdu:''})
   }else row.parseWarnings.push('Unrecognized detail: '+line.slice(0,80))
  }else row.text+=' '+line
 }
 if(medium==='urdu'&&!row.textUrdu){row.textUrdu=row.text;row.text=''}
 return row
}
export function parsePasteMany(raw,{type='short',medium='english'}={}){
 const value=trim(raw).replace(/\r\n?/gu,'\n')
 if(!value)return []
 if(value.length>100000)throw new Error('Paste in batches smaller than 100,000 characters.')
 const lines=value.split('\n'),structured=lines.some(line=>/^\s*Q\s*:/iu.test(line))
 const blocks=[];let current=[],numbered=false
 const flush=()=>{if(current.some(trim))blocks.push(current.join('\n'));current=[]}
 for(const line of lines){
  if(separator(line)){flush();numbered=false;continue}
  if(structured){
   if(/^\s*Q\s*:/iu.test(line)&&current.some(trim))flush()
   current.push(line);continue
  }
  if(NUMBERED.test(line)){flush();numbered=true;current.push(line)}
  else if(!trim(line)){if(!numbered)flush()}
  else if(numbered)current.push(line)
  else if(type==='mcq'&&OPTION.test(line)&&current.length)current.push(line)
  else if(TAG.test(line)&&current.length)current.push(line)
  else{flush();current.push(line)}
 }
 flush()
 if(blocks.length>150)throw new Error('Maximum 150 questions per review batch.')
 return blocks.map((b,i)=>structured?parseStructured(b,i+1,type,medium):parsePlain(b,i+1,type,medium))
}
export function questionIdentityKeys(question,subjectId=question?.subjectId){
 const prefix=trim(subjectId)+'::'+trim(question?.type)+'::',values=[]
 const en=trim(question?.text),ur=trim(question?.textUrdu)
 if(en)values.push(prefix+(hasUrdu.test(en)?'ur':'en')+':'+clean(en))
 if(ur)values.push(prefix+'ur:'+clean(ur))
 return [...new Set(values)]
}
export function validatePasteManyRows(rows,existingQuestions=[],subjectId='',allowedTypes=[]){
 const allowed=new Set(allowedTypes.length?allowedTypes:['mcq','short','long','fill','true_false','columns'])
 const present=new Set(existingQuestions.filter(q=>q.subjectId===subjectId).flatMap(q=>questionIdentityKeys(q,subjectId)))
 const inBatch=new Set()
 const analyzed=rows.map(row=>{
  const errors=[],warnings=[...(row.parseWarnings||[])],active=row.included!==false
  if(!active)return {...row,errors,warnings,duplicateExisting:false,duplicateBatch:false}
  if(!PASTE_MANY_SUPPORTED_TYPES.has(row.type)||!allowed.has(row.type))errors.push('This type requires its dedicated Advanced Add editor; choose a Paste Many-compatible type.')
  if(!languages.has(row.medium))errors.push('Choose English, Urdu or Dual medium.')
  if(row.medium==='urdu'?!trim(row.textUrdu):!trim(row.text))errors.push('Question text is required.')
  if(row.medium==='dual'&&!trim(row.textUrdu))errors.push('Dual medium needs a separate Urdu translation.')
  if(row.medium==='english'&&trim(row.textUrdu))errors.push('Urdu text was supplied. Choose Dual or explicitly clear the Urdu field.')
  if(row.medium==='urdu'&&trim(row.text))errors.push('English text was supplied. Choose Dual or explicitly clear the English field.')
  const marks=trim(row.marks)===''?NaN:Number(row.marks)
  if(!Number.isFinite(marks)||marks<=0||marks>1000)errors.push('Enter explicit marks (greater than 0, maximum 1000).')
  if(!priorities.has(row.priority))errors.push('Choose a valid priority.')
  if(row.type==='mcq'){
   const opts=(row.options||[]).filter(o=>trim(row.medium==='urdu'?o.textUrdu||o.text:o.text))
   if(opts.length<2)errors.push('MCQ needs at least two options.')
   const labels=opts.map(o=>trim(o.label).toUpperCase())
   if(new Set(labels).size!==labels.length)errors.push('MCQ option labels must be distinct.')
   if(row.answer&&!labels.includes(trim(row.answer).toUpperCase()))errors.push('MCQ answer must match a supplied option label.')
   if(row.medium==='dual'&&opts.some(o=>!trim(o.text)||!trim(o.textUrdu)))errors.push('Dual MCQ needs English and Urdu text for each option.')
   if(row.medium==='english'&&opts.some(o=>trim(o.textUrdu)))errors.push('Urdu MCQ options supplied: choose Dual or clear them explicitly.')
   if(!row.answer)warnings.push('MCQ answer not supplied. Review if an answer key is required.')
  }
  if(row.type==='columns'&&(!row.leftColumn?.length||row.leftColumn.length!==row.rightColumn?.length))
   errors.push('Matching columns need equal non-empty left/right lists.')
  const identities=questionIdentityKeys(row,subjectId)
  const duplicateExisting=identities.some(k=>present.has(k))
  const duplicateBatch=identities.some(k=>inBatch.has(k))
  if(duplicateExisting)errors.push('Question already exists in this subject and type; deselect or revise it.')
  if(duplicateBatch)errors.push('Duplicate of another included row; deselect or revise it.')
  identities.forEach(k=>inBatch.add(k))
  return {...row,errors,warnings,duplicateExisting,duplicateBatch}
 })
 const included=analyzed.filter(r=>r.included!==false)
 return {rows:analyzed,includedCount:included.length,invalidCount:included.filter(r=>r.errors.length).length,
  canCommit:included.length>0&&included.every(r=>r.errors.length===0)}
}
export function toQuestionBankRecord(row,subjectId){
 return {subjectId,type:row.type,medium:row.medium,text:row.medium==='urdu'?'':trim(row.text),
 textUrdu:row.medium==='english'?'':trim(row.textUrdu),marks:Number(row.marks),answer:trim(row.answer),
 chapter:trim(row.chapter),topic:trim(row.topic),priority:row.priority||'all',
 options:row.type==='mcq'?(row.options||[]).map(o=>({label:trim(o.label).toUpperCase(),text:row.medium==='urdu'?'':trim(o.text),textUrdu:row.medium==='english'?'':trim(o.textUrdu||(row.medium==='urdu'?o.text:''))}))
   .filter(o=>o.text||o.textUrdu):[],
 leftColumn:row.type==='columns'?[...(row.leftColumn||[])]:[],rightColumn:row.type==='columns'?[...(row.rightColumn||[])]:[]}
}
