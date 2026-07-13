import { useEffect } from 'react'
import WorkbenchLayout from './pages/WorkbenchLayout'
import { ToastProvider } from './components/workbench/Toast'

const THEME_KEY = 'wb_theme'

export function getTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function toggleTheme() {
  const current = getTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function App() {
  useEffect(() => {
    applyTheme(getTheme())
  }, [])

  return (
    <ToastProvider>
      <WorkbenchLayout />
    </ToastProvider>
  )
}

export default App
