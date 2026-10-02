import {createRoot} from 'react-dom/client'
import {AuthProvider} from '../../../../context/AuthContext.jsx'
import SavedPapersTab from '../../SavedPapersTab.jsx'
export default function Harness(){
 return <AuthProvider><main><h1>Saved Papers Native Baseline Acceptance</h1>
  <SavedPapersTab onLoadPaper={()=>{}} onDuplicatePaper={()=>{}}/></main></AuthProvider>
}
createRoot(document.getElementById('root')).render(<Harness/>)
