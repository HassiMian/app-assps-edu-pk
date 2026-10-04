// Self-service paper creation: blank and duplicate are independent of Question Bank.
// Creation drafts have NO persisted id; usePaperStore.savePaper supplies the real id.
const safeText = value => String(value ?? '').trim()

export const BASIC_PAPER_CLASS_LEVELS = Object.freeze([
 ['starter','Starter (Playgroup)'],['mover','Mover (Nursery)'],['flyer','Flyer (Prep)'],
 ...Array.from({length:8},(_,i)=>[String(i+1),'Class '+(i+1)]),
])

export function createBlankPaperDraft(input={}) {
 const classLevel=safeText(input.classLevel)
 const subjectName=safeText(input.subjectName)
 if (!classLevel || !subjectName) throw new Error('Class and subject are required before creating a blank paper.')
 const language=['english','urdu','dual'].includes(input.language) ? input.language : 'english'
 const target=Number(input.targetMarks)
 if(input.targetMarks !== '' && input.targetMarks != null && (!Number.isFinite(target)||target<0)) throw new Error('Total marks must be a non-negative number.')
 const date=safeText(input.examDate) || new Date().toISOString().slice(0,10)
 const title=safeText(input.title)||'New Examination Paper'
 const totalMarks=input.targetMarks===''||input.targetMarks==null?0:target
 const name=safeText(input.name)||`${subjectName} — ${classLevel} — ${title}`
 const assessmentType=safeText(input.assessmentType)||safeText(input.examType)||title||'Weekly Assessment'
 const scopeLabel=safeText(input.scopeLabel)
 return {
  name, creationMethod:'blank', userAuthored:true, documentFormat:'pts-native-v13',
  clientDraftId:`manual-draft-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  assessmentType, scope:{label:scopeLabel||null,chapterId:null,learningScopeIds:[]},
  printReadiness:'DRAFT', lifecycleStatus:'DRAFT',
  config:{
   title, assessmentType, scopeLabel, examType:safeText(input.examType)||assessmentType,
   classLevel,className:classLevel,
   subject:subjectName,subjectName,language,
   paperCode:safeText(input.paperCode),
   timeAllowed:safeText(input.timeAllowed)||'2 Hours',
   examDate:date,totalMarks,
   session:safeText(input.session)||'2026-2027',
  },
  official_section:[],
  selectedQuestions:{official_section:{questions:[],marks:0}},
  editorSettings:{template:'academic',printMode:input.pageMode==='half'?'half':'a4',pageBorder:'thin',showAnswerLines:false},
 }
}

export function canDuplicatePaperInWorkspace(source={}) {
 if(!source || typeof source!=='object'||!source.id) return false
 const id=String(source.id||'').toLowerCase()
 const stage=String(source.classStage||source.config?.classLevel||'').toLowerCase()
 if(source.structureMode==='board_pattern' || source.corpusId==='early-years-first-term-2026' || id.startsWith('ey-')) return false
 if(source.documentFormat==='canonical-v2' || [2,3].includes(Number(source.schemaVersion))) return false
 if(['starter','mover','flyer','playgroup','nursery','prep'].includes(stage) && source.documentFormat!=='pts-native-v13') return false
 return ['pts-native-v13','official-v12'].includes(source.documentFormat)
  || Array.isArray(source.official_section) || Boolean(source.selectedQuestions)
  || ['selectedMCQ','selectedShort','selectedLong'].some(key=>Array.isArray(source[key]))
}

export function createDuplicatePaperDraft(source) {
 if(!canDuplicatePaperInWorkspace(source)) throw new Error('Duplicate this format in its own specialist editor after its migration is supported.')
 const copy=JSON.parse(JSON.stringify(source))
 const originalId=String(copy.id)
 delete copy.id
 delete copy.createdAt
 delete copy.updatedAt
 delete copy.expiresAt
 return {
  ...copy,
  name:`${safeText(source.name)||'Paper'} (Copy)`,
  creationMethod:'duplicate',
  userAuthored:true,
  duplicateOf:originalId,
  sourcePaperId:originalId,
  printReadiness:'DRAFT',
  userEdited:true,
 }
}
