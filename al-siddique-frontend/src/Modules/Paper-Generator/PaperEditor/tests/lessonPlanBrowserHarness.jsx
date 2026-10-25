import { AuthProvider } from '../../../../context/AuthContext'
import ReactDOM from 'react-dom/client'
import LessonPlanTab from '../../LessonPlanTab.jsx'
import '@/index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<AuthProvider><LessonPlanTab settings={{ schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL' }} /></AuthProvider>)
