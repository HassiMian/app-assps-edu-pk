import React,{useState} from 'react'
import ReactDOM from 'react-dom/client'
import QuickQuestionEntry from '../../QuickQuestionEntry.jsx'

export function Harness(){
 const [questions,setQuestions]=useState([])
 const [visible,setVisible]=useState(true)
 const subject={id:'subj-browser',name:'English',classLevel:'8'}
 const types=[{value:'short',label:'Short Question',marks:2},{value:'long',label:'Long Question',marks:5}]
 const add=record=>{const next={...record,id:'browser-'+String(questions.length+1)};setQuestions(before=>[...before,next]);return next}
 return <main>
 <div data-quick-count>{questions.length}</div>
 <div data-quick-records>{JSON.stringify(questions)}</div>
 <button onClick={()=>setVisible(true)}>Reopen Quick Add</button>
 {visible&&<QuickQuestionEntry subject={subject} types={types} existingQuestions={questions} onSave={add} onClose={()=>setVisible(false)} onAdvanced={()=>setVisible(false)}/>}
 </main>
}
ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>)
