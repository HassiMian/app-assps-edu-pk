import React from 'react'
import ReactDOM from 'react-dom/client'
import LessonPlanTab from '../../LessonPlanTab.jsx'
import DailyDiaryFeature from '../../DailyDiaryFeature.jsx'
import '@/index.css'
ReactDOM.createRoot(document.getElementById('root')).render(new URLSearchParams(window.location.search).has('legacyDiary') ? <DailyDiaryFeature/> : <LessonPlanTab settings={{ schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL' }} />)
