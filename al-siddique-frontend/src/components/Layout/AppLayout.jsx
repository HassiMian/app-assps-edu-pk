import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './sidebar'
import Topbar from './topbar'

export default function AppLayout({ children }) {
 const [collapsed, setCollapsed] = useState(true)
 const [mobileOpen, setMobileOpen] = useState(false)
 const [isMobile, setIsMobile] = useState(false)
 const [sidebarHovered, setSidebarHovered] = useState(false)

 useEffect(() => {
 const check = () => setIsMobile(window.innerWidth <= 1024)
 check()
 window.addEventListener('resize', check)
 return () => window.removeEventListener('resize', check)
 }, [])

 const desktopSidebarWidth = collapsed && !sidebarHovered ? 68 : 224

 const location = useLocation()
 const navType = useNavigationType()
 const mainRef = useRef(null)

 // Close mobile sidebar on route change
 useEffect(() => {
 if (mobileOpen) setMobileOpen(false)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [location.pathname])

 // Lock body scroll while mobile drawer is open (iOS-safe)
 useEffect(() => {
 if (!isMobile) {
 document.body.classList.remove('app-drawer-open')
 document.body.style.top = ''
 document.body.style.width = ''
 return
 }
 if (mobileOpen) {
 const scrollY = window.scrollY || 0
 document.body.dataset.scrollY = String(scrollY)
 document.body.style.top = `-${scrollY}px`
 document.body.style.width = '100%'
 document.body.classList.add('app-drawer-open')
 } else {
 const scrollY = parseInt(document.body.dataset.scrollY || '0', 10)
 document.body.classList.remove('app-drawer-open')
 document.body.style.top = ''
 document.body.style.width = ''
 delete document.body.dataset.scrollY
 window.scrollTo(0, scrollY)
 }
 return () => {
 document.body.classList.remove('app-drawer-open')
 document.body.style.top = ''
 document.body.style.width = ''
 }
 }, [isMobile, mobileOpen])

 useEffect(() => {
 if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
 }, [])

 // Scroll restoration for main content
 useLayoutEffect(() => {
 const main = mainRef.current
 if (!main) return

 const key = `al_siddique_scroll_${location.pathname}${location.search}`
 const saved = sessionStorage.getItem(key)

 let raf1
 let raf2
 let timeoutId
 const restore = () => {
 if (!mainRef.current) return
 const target = navType === 'POP' && saved != null ? parseInt(saved, 10) : 0
 mainRef.current.scrollTop = Number.isFinite(target) ? target : 0
 }

 if (navType === 'POP' && saved != null) {
 raf1 = requestAnimationFrame(() => {
 raf2 = requestAnimationFrame(restore)
 })
 timeoutId = window.setTimeout(restore, 180)
 } else {
 raf1 = requestAnimationFrame(() => { main.scrollTop = 0 })
 }

 return () => {
 if (raf1) cancelAnimationFrame(raf1)
 if (raf2) cancelAnimationFrame(raf2)
 if (timeoutId) window.clearTimeout(timeoutId)
 }
 }, [location.pathname, location.search, navType])

 // Save scroll position for main content
 useEffect(() => {
 const main = mainRef.current
 if (!main) return
 
 let rafId = 0
 const handleScroll = (e) => {
 if (rafId) cancelAnimationFrame(rafId)
 rafId = requestAnimationFrame(() => {
 const key = `al_siddique_scroll_${location.pathname}${location.search}`
 sessionStorage.setItem(key, e.target.scrollTop.toString())
 })
 }

 main.addEventListener('scroll', handleScroll, { passive: true })
 return () => {
 const key = `al_siddique_scroll_${location.pathname}${location.search}`
 sessionStorage.setItem(key, main.scrollTop.toString())
 main.removeEventListener('scroll', handleScroll)
 if (rafId) cancelAnimationFrame(rafId)
 }
 }, [location.pathname, location.search])

 const shellStyle = isMobile
   ? {
       display: 'flex',
       flexDirection: 'column',
       height: '100dvh',
       minHeight: '100dvh',
       maxHeight: '100dvh',
       overflow: 'hidden',
       background: 'var(--app-bg)',
       fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
       position: 'relative',
     }
   : {
       display: 'flex',
       height: '100dvh',
       minHeight: '100vh',
       overflow: 'hidden',
       background: 'var(--app-bg)',
       fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
       position: 'relative',
     }

 return (
 <div className={`app-shell ${isMobile ? 'app-shell--mobile' : 'app-shell--desktop'} ${mobileOpen ? 'app-shell--drawer-open' : ''} ${collapsed ? 'app-shell--collapsed' : 'app-shell--expanded'} ${!isMobile && collapsed && sidebarHovered ? 'app-shell--sidebar-hover' : ''}`} style={shellStyle}>
 {/* Mobile overlay backdrop */}
 {isMobile && mobileOpen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setMobileOpen(false)}
 style={{
 position: 'fixed',
 inset: 0,
 background: 'rgba(0,0,0,0.6)',
 backdropFilter: 'blur(4px)',
 zIndex: 70,
 }}
 />
 )}

 {/* Sidebar */}
 <div className="app-sidebar-slot" style={{
 position: isMobile ? 'fixed' : 'relative',
 left: isMobile ? 0 : 0,
 top: 0,
 height: '100dvh',
 minHeight: '100vh',
 zIndex: 120,
 width: isMobile ? 'min(86vw, 288px)' : desktopSidebarWidth,
 minWidth: isMobile ? undefined : desktopSidebarWidth,
 maxWidth: isMobile ? undefined : desktopSidebarWidth,
 transition: isMobile ? undefined : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s, max-width 0.3s',
 flexShrink: 0,
 overflow: isMobile ? 'hidden' : 'hidden',
 pointerEvents: isMobile && !mobileOpen ? 'none' : 'auto',
 }}>
 <Sidebar
 collapsed={isMobile ? false : collapsed}
 setCollapsed={isMobile ? () => setMobileOpen(false) : setCollapsed}
 isHovered={sidebarHovered}
 setIsHovered={setSidebarHovered}
 />
 </div>

 {/* Main content */}
 <div className="app-main-column" style={{
 display: 'flex',
 flexDirection: 'column',
 flex: 1,
 minWidth: 0,
 width: isMobile ? '100%' : undefined,
 overflow: 'hidden',
 position: 'relative',
 zIndex: 1,
 minHeight: 0,
 }}>
 <div style={{ position: 'relative', zIndex: 100, flexShrink: 0 }}>
 <Topbar
 collapsed={isMobile ? false : collapsed}
 onMenuToggle={isMobile ? () => setMobileOpen(v => !v) : undefined}
 isMobile={isMobile}
 />
 </div>
 <motion.main 
   key={location.pathname}
   initial={{ opacity: 0, y: 15 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.3, ease: 'easeOut' }}
   ref={mainRef} 
   className="super-module-viewport" 
   style={{
     flex: isMobile ? '1 1 auto' : 1,
     minHeight: isMobile ? 0 : undefined,
     overflowY: isMobile ? 'auto' : 'auto',
     overflowX: 'hidden',
     WebkitOverflowScrolling: 'touch',
     padding: location.pathname === '/paper-generator' ? 0 : (isMobile ? 12 : 18),
   }}
 >
 {children}
 </motion.main>
 </div>
 </div>
 )
}
