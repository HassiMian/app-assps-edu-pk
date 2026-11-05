import ReactDOM from 'react-dom/client'
import {MemoryRouter} from 'react-router-dom'
import {AuthProvider} from '../../../../context/AuthContext.jsx'
import {ThemeProvider} from '../../../../context/ThemeContext.jsx'
import PaperGenerator from '../../PaperGenerator.jsx'
import '@/index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider><ThemeProvider><MemoryRouter initialEntries={['/paper-generator?tab=saved']}><PaperGenerator/></MemoryRouter></ThemeProvider></AuthProvider>
)
