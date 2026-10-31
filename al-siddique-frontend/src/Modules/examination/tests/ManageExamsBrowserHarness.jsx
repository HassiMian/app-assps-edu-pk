import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ManageExams from '../ManageExams'
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/exams']}><ManageExams /></MemoryRouter>
)
