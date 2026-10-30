/* eslint-disable react-refresh/only-export-components */
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ExaminationModule from '../ExaminationModule'
createRoot(document.getElementById('root')).render(
 <MemoryRouter initialEntries={['/examination/manage']}><ExaminationModule /></MemoryRouter>
)
