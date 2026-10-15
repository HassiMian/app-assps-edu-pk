/* eslint-disable react-refresh/only-export-components -- Test-only Vite bootstrap is not a hot-reloaded component. */
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom'
import MarksRegister from '../MarksRegister'
function EditLanding(){const loc=useLocation();return <div data-testid="edit-destination">{loc.pathname+loc.search}</div>}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/exams/marks/review']}><Routes><Route path="/exams/marks/review" element={<MarksRegister/>}/><Route path="/exams/marks" element={<EditLanding/>}/></Routes></MemoryRouter>)
