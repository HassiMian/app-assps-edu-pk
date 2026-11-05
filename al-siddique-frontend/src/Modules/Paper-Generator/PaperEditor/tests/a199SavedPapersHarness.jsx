import ReactDOM from 'react-dom/client'
import {AuthProvider} from '../../../../context/AuthContext.jsx'
import SavedPapersTab from '../../SavedPapersTab.jsx'
import '@/index.css'

const load=async (paper,tab)=>{
  if(window.__A199_OPEN_FAIL__)throw new Error('Authentic server revision not available (synthetic)')
  window.__A199_OPENED__={paper,tab}
}
ReactDOM.createRoot(document.getElementById('root')).render(<AuthProvider><SavedPapersTab onLoadPaper={load}/></AuthProvider>)
