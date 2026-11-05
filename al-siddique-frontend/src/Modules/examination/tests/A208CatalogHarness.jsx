import React from 'react'
import { createRoot } from 'react-dom/client'
import AssessmentCatalogReview from '../AssessmentCatalogReview'
createRoot(document.getElementById('root')).render(<AssessmentCatalogReview exam={{id:14,name:'Assessment 1',type:'Assessment'}} onClose={() => {document.body.dataset.closed='true'}} />)
