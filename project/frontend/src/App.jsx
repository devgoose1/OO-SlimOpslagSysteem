import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Functie om de backend status op te halen
  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:3000/status')
      if (!response.ok) {
        throw new Error('Kan geen verbinding maken met de server')
      }
      const data = await response.json()
      setStatus(data.status)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Haal status op bij het laden van de pagina
  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Slim Opslag Systeem</h1>
        <p className="vite-badge">⚡ Powered by Vite</p>
        
        <div className="status-container">
          <h2>Backend Status</h2>
          
          {loading && <p>Laden...</p>}
          
          {error && (
            <div className="error">
              <p>❌ Fout: {error}</p>
              <p>Zorg ervoor dat de backend server draait op http://localhost:3000</p>
            </div>
          )}
          
          {status && !loading && (
            <div className="success">
              <p>✅ {status}</p>
            </div>
          )}
          
          <button onClick={fetchStatus} disabled={loading}>
            {loading ? 'Laden...' : 'Status opnieuw controleren'}
          </button>
        </div>
      </header>
    </div>
  )
}

export default App
