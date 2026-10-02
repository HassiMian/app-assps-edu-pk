import {useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import SupervisedPasteMany from '../../SupervisedPasteMany.jsx'
import QuestionBank from '../../QuestionBank.jsx'
import {usePaperStore} from '../../usePaperStore.js'
export default function Harness(){
 const store=usePaperStore(),[open,setOpen]=useState(true),[showBank,setShowBank]=useState(false)
 const subject=store.subjects.find(s=>s.name==='Supervised Paste Acceptance')
 useEffect(()=>{
  if(!subject)store.addSubject({name:'Supervised Paste Acceptance',classLevel:'7'})
 },[subject,store])
 const questions=store.questions.filter(q=>q.subjectId===subject?.id)
 return <div><div data-paste-store-count>{questions.length}</div>
  <pre data-paste-store-records>{JSON.stringify(questions)}</pre>
  <button type="button" data-open-paste-many onClick={()=>setOpen(true)}>Open Paste Many</button>
  <button type="button" data-show-real-question-bank onClick={()=>{setOpen(false);setShowBank(true)}}>Show Real Question Bank</button>
  {showBank?<QuestionBank/>:subject&&open&&<SupervisedPasteMany subject={subject} existingQuestions={store.questions}
    questionTypes={store.getFilteredQuestionTypes(subject.name)} onCommit={store.commitReviewedQuestionBatch}
    onClose={()=>setOpen(false)}/>}
 </div>
}
createRoot(document.getElementById('root')).render(<Harness/>)
