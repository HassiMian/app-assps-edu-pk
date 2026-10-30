/* eslint-disable react-refresh/only-export-components -- Standalone test bootstrap intentionally has no exports. */
import {createRoot} from 'react-dom/client'
import {AuthProvider} from '../../../context/AuthContext'
import SavedPapersTab from '../SavedPapersTab'
function Harness(){
 const open=async paper=>{
  window.__cloudOpened = {...paper}
  if(window.__rejectCloud)throw Error('Server revision cannot be reopened.')
 }
 return <AuthProvider><SavedPapersTab onLoadPaper={open} onDuplicatePaper={()=>{}}/></AuthProvider>
}
createRoot(document.getElementById('root')).render(<Harness/>)
