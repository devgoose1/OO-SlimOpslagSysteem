import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pwaService.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)

// Simple wrapper to register SW after mount
function RootApp() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <App />
}
