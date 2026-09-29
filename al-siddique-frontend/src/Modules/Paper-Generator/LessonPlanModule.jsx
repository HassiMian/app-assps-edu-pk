import React from 'react'
import { usePaperStore } from './usePaperStore'
import LessonPlanTab from './LessonPlanTab'

export default function LessonPlanModule() {
  const { paperSettings } = usePaperStore()
  return <LessonPlanTab settings={paperSettings} />
}
