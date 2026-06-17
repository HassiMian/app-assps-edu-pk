import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/mobile-responsive-v3.css'
import './styles/mobile-responsive-v4-iphone.css'
import { seedPaperStore } from './services/demoSeeder'

// Auto-seed dummy questions for Paper Generator
seedPaperStore();

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <App />
 </StrictMode>
)