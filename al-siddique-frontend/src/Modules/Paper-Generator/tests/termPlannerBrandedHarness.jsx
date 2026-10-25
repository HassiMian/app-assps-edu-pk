import {createRoot} from 'react-dom/client'
import {AuthProvider} from '../../../context/AuthContext.jsx'
import {TenantBrandingProvider} from '../../../context/TenantBrandingContext.jsx'
import WeeklyNotebookStudio from '../WeeklyNotebookStudio.jsx'
createRoot(document.getElementById('root')).render(
  <AuthProvider><TenantBrandingProvider><WeeklyNotebookStudio/></TenantBrandingProvider></AuthProvider>
)
