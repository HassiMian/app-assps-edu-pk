import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router-dom'
import MarkAttendance from '../MarkAttendance'
import AttendanceModule from '../AttendanceModule'
const mode=new URL(location.href).searchParams.get('mode')||'mark'
createRoot(document.getElementById('root')).render(
 <MemoryRouter initialEntries={['/attendance']}>
  {mode==='module'? <AttendanceModule /> : <MarkAttendance />}
 </MemoryRouter>
)
