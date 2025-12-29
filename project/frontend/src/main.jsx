import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom' // <<< toegevoegd
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pwaService.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter> {/* <<< toegevoegd */}
      <RootApp />
    </HashRouter>
  </StrictMode>,
)

// Simple wrapper to register SW after mount
function RootApp() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <App />
}
