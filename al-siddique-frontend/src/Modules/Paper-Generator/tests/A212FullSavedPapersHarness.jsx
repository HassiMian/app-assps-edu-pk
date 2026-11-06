import React from 'react'
import {createRoot} from 'react-dom/client'
import {AuthProvider} from '../../../context/AuthContext'
import SavedPapersTab from '../SavedPapersTab'
createRoot(document.getElementById('root')).render(
  <AuthProvider><SavedPapersTab onLoadPaper={() => {}} onDuplicatePaper={() => {}}/></AuthProvider>
)
