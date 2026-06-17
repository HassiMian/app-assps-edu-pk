import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'al_siddique_theme'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

export function ThemeProvider({ children }) {
 const [theme, setTheme] = useState(() => {
 try {
 return getStorage()?.getItem(THEME_KEY) || 'dark'
 } catch {
 return 'dark'
 }
 })

 useEffect(() => {
 const next = theme === 'light' ? 'light' : 'dark'
 try {
 getStorage()?.setItem(THEME_KEY, next)
 } catch {}
 if (typeof document !== 'undefined') {
 document.documentElement.dataset.theme = next
 document.body.dataset.theme = next
 }
 }, [theme])

 const value = useMemo(() => ({
 theme,
 isLight: theme === 'light',
 setTheme,
 toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light'),
 }), [theme])

 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
 const ctx = useContext(ThemeContext)
 if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
 return ctx
}
