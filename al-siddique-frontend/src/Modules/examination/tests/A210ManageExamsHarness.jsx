import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ManageExams from '../ManageExams'
const view = <MemoryRouter initialEntries={['/exams']}><ManageExams /></MemoryRouter>
createRoot(document.getElementById('root')).render(
 window.location.search.includes('strict=1') ? <React.StrictMode>{view}</React.StrictMode> : view
)
