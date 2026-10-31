import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router-dom'
import MarksSheet from '../MarksSheet'
createRoot(document.getElementById('root')).render(
 <MemoryRouter initialEntries={['/exams/marks']}><MarksSheet/></MemoryRouter>
)
