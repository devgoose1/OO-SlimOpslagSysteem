import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // State voor data
  const [onderdelen, setOnderdelen] = useState([])
  const [projects, setProjects] = useState([])
  const [reserveringen, setReserveringen] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Server status
  const [serverStatus, setServerStatus] = useState({ online: false, message: '' })

  // Tab schakelen
  const [activeTab, setActiveTab] = useState('list')

  // Zoekfilter
  const [searchTerm, setSearchTerm] = useState('')

  // Formulier voor nieuw onderdeel
  const [newPart, setNewPart] = useState({
    name: '', artikelnummer: '', description: '', location: '', total_quantity: 0
  })

  // Formulier voor nieuwe reservering
  const [newReservation, setNewReservation] = useState({
    onderdeel_id: '', project_id: '', aantal: 0
  })

  // Formulier voor nieuw project
  const [newProject, setNewProject] = useState({ name: '' })

  // === DATA LADEN ===
  
  const checkServerStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/status')
      if (res.ok) {
        const data = await res.json()
        setServerStatus({ online: true, message: data.status })
      } else {
        setServerStatus({ online: false, message: 'Server reageert niet correct' })
      }
    } catch (err) {
      setServerStatus({ online: false, message: 'Kan server niet bereiken' })
    }
  }
  
  const loadOnderdelen = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://localhost:3000/api/onderdelen')
      if (!res.ok) throw new Error('Backend niet bereikbaar')
      const data = await res.json()
      setOnderdelen(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/projects')
      if (!res.ok) throw new Error('Kon projecten niet laden')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadReserveringen = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/reserveringen')
      if (!res.ok) throw new Error('Kon reserveringen niet laden')
      const data = await res.json()
      setReserveringen(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // === HANDLERS ===
  
  const handleAddPart = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/onderdelen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPart,
          total_quantity: Number(newPart.total_quantity)
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdeel niet toevoegen')

      setNewPart({ name: '', artikelnummer: '', description: '', location: '', total_quantity: 0 })
      setActiveTab('list')
      loadOnderdelen()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReservation = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/reserveringen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onderdeel_id: Number(newReservation.onderdeel_id),
          project_id: Number(newReservation.project_id),
          aantal: Number(newReservation.aantal)
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon reservering niet plaatsen')

      setNewReservation({ onderdeel_id: '', project_id: '', aantal: 0 })
      loadOnderdelen()
      loadReserveringen()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon project niet toevoegen')

      setNewProject({ name: '' })
      loadProjects()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReleaseReservation = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/reserveringen/${id}/release`, {
        method: 'PATCH'
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon reservering niet releasen')

      loadOnderdelen()
      loadReserveringen()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeletePart = async (id) => {
    if (!confirm('Weet je zeker dat je dit onderdeel wilt verwijderen?')) return
    
    try {
      const res = await fetch(`http://localhost:3000/api/onderdelen/${id}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdeel niet verwijderen')

      loadOnderdelen()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Filter onderdelen op zoekterm
  const filteredOnderdelen = onderdelen.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.artikelnummer && part.artikelnummer.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Laad data bij mount
  useEffect(() => {
    checkServerStatus()
    loadOnderdelen()
    loadProjects()
    loadReserveringen()
    
    // Check server status elke 10 seconden
    const interval = setInterval(checkServerStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Opslag Management Systeem</h1>
        
        {/* Server Status Indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          padding: '12px 20px',
          borderRadius: 8,
          background: serverStatus.online ? '#10b981' : '#ef4444',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            background: 'white',
            animation: serverStatus.online ? 'pulse 2s infinite' : 'none'
          }} />
          <div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Backend Server</div>
            <div style={{ fontSize: 14 }}>
              {serverStatus.online ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#ef4444', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 24, borderBottom: '2px solid #ccc' }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'list' ? '#667eea' : '#ccc',
            color: activeTab === 'list' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: 8
          }}
        >
          Onderdelen
        </button>
        <button
          onClick={() => setActiveTab('add')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'add' ? '#667eea' : '#ccc',
            color: activeTab === 'add' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: 8
          }}
        >
          Nieuw Onderdeel
        </button>
        <button
          onClick={() => setActiveTab('reserve')}
          style={{ 
            padding: '12px 24px', 
            background: activeTab === 'reserve' ? '#667eea' : '#ccc',
            color: activeTab === 'reserve' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: 8
          }}
        >
          Reservering Maken
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          style={{ 
            padding: '12px 24px', 
            background: activeTab === 'reservations' ? '#667eea' : '#ccc',
            color: activeTab === 'reservations' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: 8
          }}
        >
          Actieve Reserveringen
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          style={{ 
            padding: '12px 24px', 
            background: activeTab === 'projects' ? '#667eea' : '#ccc',
            color: activeTab === 'projects' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Projecten
        </button>
      </div>

      {/* TAB: Onderdelen Lijst */}
      {activeTab === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Onderdelen Overzicht</h2>
            <input
              type="text"
              placeholder="Zoek op naam of artikelnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 8, width: 300, fontSize: 14, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>
          
          {loading ? (
            <p>Laden...</p>
          ) : filteredOnderdelen.length === 0 ? (
            <p>Geen onderdelen gevonden.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', backgroundColor: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Naam</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Artikelnummer</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Locatie</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Totaal</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Gereserveerd</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Beschikbaar</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredOnderdelen.map((part) => (
                  <tr key={part.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 12 }}><strong>{part.name}</strong></td>
                    <td style={{ padding: 12 }}>{part.artikelnummer || '-'}</td>
                    <td style={{ padding: 12 }}>{part.location || '-'}</td>
                    <td style={{ textAlign: 'center', padding: 12 }}>{part.total_quantity}</td>
                    <td style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontWeight: 'bold' }}>
                      {part.reserved_quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12, color: '#10b981', fontWeight: 'bold' }}>
                      {part.available_quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12 }}>
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Verwijder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: Nieuw Onderdeel */}
      {activeTab === 'add' && (
        <div>
          <h2>Voeg Nieuw Onderdeel Toe</h2>
          <form onSubmit={handleAddPart} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Naam *</label>
              <input
                type="text"
                placeholder="Bijv: Arduino Uno"
                value={newPart.name}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                required
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Artikelnummer</label>
              <input
                type="text"
                placeholder="Bijv: ARD-UNO-R3"
                value={newPart.artikelnummer}
                onChange={(e) => setNewPart({ ...newPart, artikelnummer: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Beschrijving</label>
              <textarea
                placeholder="Extra details..."
                value={newPart.description}
                onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc', minHeight: 80 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Locatie</label>
              <input
                type="text"
                placeholder="Bijv: Lade A3"
                value={newPart.location}
                onChange={(e) => setNewPart({ ...newPart, location: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Totaal Hoeveelheid *</label>
              <input
                type="number"
                min="0"
                value={newPart.total_quantity}
                onChange={(e) => setNewPart({ ...newPart, total_quantity: e.target.value })}
                required
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <button 
              type="submit" 
              style={{ 
                padding: 14, 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              Onderdeel Toevoegen
            </button>
          </form>
        </div>
      )}

      {/* TAB: Reservering Maken */}
      {activeTab === 'reserve' && (
        <div>
          <h2>Maak Reservering</h2>
          <form onSubmit={handleReservation} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Onderdeel *</label>
              <select
                value={newReservation.onderdeel_id}
                onChange={(e) => setNewReservation({ ...newReservation, onderdeel_id: e.target.value })}
                required
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="">-- Kies Onderdeel --</option>
                {onderdelen.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} ({part.available_quantity} beschikbaar)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Project *</label>
              <select
                value={newReservation.project_id}
                onChange={(e) => setNewReservation({ ...newReservation, project_id: e.target.value })}
                required
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="">-- Kies Project --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Aantal *</label>
              <input
                type="number"
                min="1"
                value={newReservation.aantal}
                onChange={(e) => setNewReservation({ ...newReservation, aantal: e.target.value })}
                required
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <button 
              type="submit" 
              style={{ 
                padding: 14, 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              Reserveer
            </button>
          </form>
        </div>
      )}

      {/* TAB: Actieve Reserveringen */}
      {activeTab === 'reservations' && (
        <div>
          <h2>Actieve Reserveringen</h2>
          {reserveringen.length === 0 ? (
            <p>Geen actieve reserveringen.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', backgroundColor: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Project</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Aangemaakt</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Actie</th>
                </tr>
              </thead>
              <tbody>
                {reserveringen.map((res) => (
                  <tr key={res.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{res.onderdeel_name}</strong>
                      {res.onderdeel_artikelnummer && <span style={{ color: '#666', fontSize: 12 }}> ({res.onderdeel_artikelnummer})</span>}
                    </td>
                    <td style={{ padding: 12 }}>{res.project_name}</td>
                    <td style={{ textAlign: 'center', padding: 12, fontWeight: 'bold' }}>{res.aantal}</td>
                    <td style={{ padding: 12, fontSize: 12, color: '#666' }}>
                      {new Date(res.created_at).toLocaleString('nl-NL')}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12 }}>
                      <button
                        onClick={() => handleReleaseReservation(res.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: Projecten */}
      {activeTab === 'projects' && (
        <div>
          <h2>Projecten Beheren</h2>
          
          <div style={{ marginBottom: 32 }}>
            <h3>Nieuw Project Aanmaken</h3>
            <form onSubmit={handleAddProject} style={{ display: 'flex', gap: 12, maxWidth: 500 }}>
              <input
                type="text"
                placeholder="Project naam..."
                value={newProject.name}
                onChange={(e) => setNewProject({ name: e.target.value })}
                required
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  fontSize: 14, 
                  borderRadius: 4, 
                  border: '1px solid #ccc' 
                }}
              />
              <button 
                type="submit" 
                style={{ 
                  padding: '10px 20px', 
                  background: '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Toevoegen
              </button>
            </form>
          </div>

          <h3>Bestaande Projecten</h3>
          {projects.length === 0 ? (
            <p>Geen projecten aangemaakt.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {projects.map((proj) => (
                <li 
                  key={proj.id} 
                  style={{ 
                    padding: 12, 
                    background: '#f9f9f9', 
                    marginBottom: 8, 
                    borderRadius: 6,
                    border: '1px solid #ddd'
                  }}
                >
                  <strong>{proj.name}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default App
