import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppStateProvider } from './state/AppState'
import './index.css'

// Safari iOS mengabaikan user-scalable=no; cegah cubit dan zoom ketuk-dua-kali secara eksplisit.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault())
}
let lastTouch = 0
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    if (now - lastTouch < 300) e.preventDefault()
    lastTouch = now
  },
  { passive: false },
)
document.addEventListener('contextmenu', (e) => {
  const t = e.target as HTMLElement
  if (!/^(INPUT|TEXTAREA)$/.test(t.tagName)) e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
