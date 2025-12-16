import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // State voor data
  const [onderdelen, setOnderdelen] = useState([])
  const [projects, setProjects] = useState([])
  const [reserveringen, setReserveringen] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Server status
  const [serverStatus, setServerStatus] = useState({ online: false, message: '' })

  // Authenticatie
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  // Tab schakelen
  const [activeTab, setActiveTab] = useState('shop')

  // Zoekfilter
  const [searchTerm, setSearchTerm] = useState('')

  // Selected part for modal
  const [modalPart, setModalPart] = useState(null)

  // Formulier voor nieuw onderdeel
  const [newPart, setNewPart] = useState({
    name: '', artikelnummer: '', description: '', location: '', total_quantity: 0
  })

  // Formulier voor nieuwe reservering
  const [newReservation, setNewReservation] = useState({
    onderdeel_id: '', project_id: '', aantal: 0
  })

  // Formulier voor nieuw project
  const [newProject, setNewProject] = useState({ name: '', category_id: '' })
  const [newCategory, setNewCategory] = useState({ name: '' })
  const [projectParts, setProjectParts] = useState({})
  const [selectedPart, setSelectedPart] = useState(null)
  const [editTotal, setEditTotal] = useState('')

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

  const loadCategories = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/categories')
      if (!res.ok) throw new Error('Kon categorieën niet laden')
      const data = await res.json()
      setCategories(data)
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

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login mislukt')

      setUser(data)
      setLoginForm({ username: '', password: '' })
      setError(null)
      
      // Laad data na login
      loadOnderdelen()
      loadProjects()
      loadCategories()
      loadReserveringen()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setActiveTab('shop')
  }
  
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

      setNewProject({ name: '', category_id: '' })
      loadProjects()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteProject = async (id) => {
    if (!confirm('Weet je zeker dat je dit project wilt verwijderen?')) return
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon project niet verwijderen')
      loadProjects()
      loadReserveringen()
      setProjectParts((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon categorie niet toevoegen')
      setNewCategory({ name: '' })
      loadCategories()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Verwijder categorie?')) return
    try {
      const res = await fetch(`http://localhost:3000/api/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon categorie niet verwijderen')
      loadCategories()
      loadProjects()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLoadProjectParts = async (projectId) => {
    // Toggle: als onderdelen al geladen zijn, verberg ze
    if (projectParts[projectId]) {
      setProjectParts((prev) => {
        const copy = { ...prev }
        delete copy[projectId]
        return copy
      })
      return
    }

    // Anders: laad de onderdelen
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${projectId}/onderdelen`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdelen niet ophalen')
      setProjectParts((prev) => ({ ...prev, [projectId]: data }))
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

  const handleSelectPart = (part) => {
    setSelectedPart(part)
    setEditTotal(part.total_quantity)
    setError(null)
  }

  const handleUpdatePart = async (e) => {
    e.preventDefault()
    if (!selectedPart) return

    const newTotal = Number(editTotal)
    if (Number.isNaN(newTotal) || newTotal < 0) {
      setError('Voer een geldig aantal in')
      return
    }

    if (newTotal < selectedPart.reserved_quantity) {
      setError(`Totaal kan niet lager zijn dan gereserveerd (${selectedPart.reserved_quantity})`)
      return
    }

    try {
      const res = await fetch(`http://localhost:3000/api/onderdelen/${selectedPart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedPart.name,
          artikelnummer: selectedPart.artikelnummer,
          description: selectedPart.description,
          location: selectedPart.location,
          total_quantity: newTotal
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdeel niet updaten')

      // Update lokale state en herladen voor zekerheid
      setSelectedPart((prev) => prev ? {
        ...prev,
        total_quantity: newTotal,
        available_quantity: newTotal - prev.reserved_quantity
      } : prev)
      loadOnderdelen()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Filter onderdelen op zoekterm (naam, artikelnummer, beschrijving)
  const searchNormalized = searchTerm.trim().toLowerCase()
  const filteredOnderdelen = onderdelen.filter(part =>
    part.name.toLowerCase().includes(searchNormalized) ||
    (part.artikelnummer && part.artikelnummer.toLowerCase().includes(searchNormalized)) ||
    (part.description && part.description.toLowerCase().includes(searchNormalized))
  )

  // Laad data bij mount
  useEffect(() => {
    checkServerStatus()
    loadOnderdelen() // Altijd laden, ook zonder login voor student view
    if (user) {
      loadProjects()
      loadCategories()
      loadReserveringen()
    }
    
    // Check server status elke 10 seconden
    const interval = setInterval(checkServerStatus, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Houd geselecteerde detail in sync wanneer lijst herlaadt
  useEffect(() => {
    if (!selectedPart) return
    const refreshed = onderdelen.find((o) => o.id === selectedPart.id)
    if (refreshed) {
      setSelectedPart(refreshed)
      setEditTotal(refreshed.total_quantity)
    }
  }, [onderdelen, selectedPart])

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Opslag Management Systeem</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Login knop wanneer niet ingelogd */}
          {!user && (
            <button
              onClick={() => setActiveTab('login')}
              style={{
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Inloggen
            </button>
          )}

          {/* User info */}
          {user && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--vscode-editor-background, rgba(0,0,0,0.05))',
              border: '1px solid var(--vscode-panel-border, #ddd)'
            }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Ingelogd als</div>
                <div style={{ fontWeight: 'bold' }}>
                  {user.username} ({user.role === 'student' ? 'Leerling' : user.role === 'teacher' ? 'Docent' : user.role === 'expert' ? 'Leerling-expert' : 'Admin'})
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '4px 8px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Uitloggen
              </button>
            </div>
          )}

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
      </div>

      {error && (
        <div style={{ 
          color: '#fff', 
          backgroundColor: '#ef4444', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16,
          fontWeight: 500
        }}>
          {error}
        </div>
      )}

      {/* Login scherm (als niet ingelogd) */}
      {!user && activeTab === 'login' ? (
        <div style={{ 
          maxWidth: 400, 
          margin: '80px auto', 
          padding: 32, 
          background: 'var(--vscode-editor-background, #fff)', 
          borderRadius: 12,
          border: '1px solid var(--vscode-panel-border, #ddd)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Inloggen</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Gebruikersnaam</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
                style={{ 
                  padding: 12, 
                  fontSize: 14, 
                  width: '100%', 
                  borderRadius: 4, 
                  border: '1px solid var(--vscode-input-border, #ccc)',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Wachtwoord</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                style={{ 
                  padding: 12, 
                  fontSize: 14, 
                  width: '100%', 
                  borderRadius: 4, 
                  border: '1px solid var(--vscode-input-border, #ccc)',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)'
                }}
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
                fontWeight: 'bold',
                marginTop: 8
              }}
            >
              Inloggen
            </button>
          </form>
          
          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
            borderRadius: 8,
            fontSize: 13
          }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>Test accounts:</strong>
            <div style={{ color: 'var(--vscode-descriptionForeground, #666)' }}>
              <div>• Admin: admin / admin123</div>
              <div>• Docent: docent / docent123</div>
              <div>• Expert: expert / expert123</div>
            </div>
          </div>
          
          <button
            onClick={() => setActiveTab('shop')}
            style={{
              marginTop: 16,
              width: '100%',
              padding: 10,
              background: 'transparent',
              color: 'inherit',
              border: '1px solid var(--vscode-panel-border, #ccc)',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Terug naar webshop
          </button>
        </div>
      ) : (
        <>
          {/* Tabs bar - alleen webshop wanneer niet ingelogd, alle tabs wanneer ingelogd */}
          <div style={{ marginBottom: 24, borderBottom: '2px solid var(--vscode-panel-border, #ccc)' }}>
            {/* Webshop tab - altijd zichtbaar */}
            <button
              onClick={() => setActiveTab('shop')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'shop' ? '#667eea' : 'transparent',
                color: activeTab === 'shop' ? '#fff' : 'inherit',
                border: activeTab === 'shop' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                cursor: 'pointer',
                marginRight: 8
              }}
            >
              Webshop
            </button>
            
            {/* Onderdelen beheer - alleen voor teacher, expert, admin */}
            {user && (user.role === 'teacher' || user.role === 'expert' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'list' ? '#667eea' : 'transparent',
                  color: activeTab === 'list' ? '#fff' : 'inherit',
                  border: activeTab === 'list' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Onderdelen Beheer
              </button>
            )}
            
            {/* Nieuw onderdeel - alleen voor teacher en admin */}
            {user && (user.role === 'teacher' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('add')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'add' ? '#667eea' : 'transparent',
                  color: activeTab === 'add' ? '#fff' : 'inherit',
                  border: activeTab === 'add' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Nieuw Onderdeel
              </button>
            )}
            
            {/* Reservering maken - alleen voor teacher, expert, admin */}
            {user && (user.role === 'teacher' || user.role === 'expert' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('reserve')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'reserve' ? '#667eea' : 'transparent',
                  color: activeTab === 'reserve' ? '#fff' : 'inherit',
                  border: activeTab === 'reserve' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Reservering Maken
              </button>
            )}
            
            {/* Actieve reserveringen - alleen voor teacher, expert, admin */}
            {user && (user.role === 'teacher' || user.role === 'expert' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('reservations')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'reservations' ? '#667eea' : 'transparent',
                  color: activeTab === 'reservations' ? '#fff' : 'inherit',
                  border: activeTab === 'reservations' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Actieve Reserveringen
              </button>
            )}
            
            {/* Projecten - alleen voor teacher en admin */}
            {user && (user.role === 'teacher' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('projects')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'projects' ? '#667eea' : 'transparent',
                  color: activeTab === 'projects' ? '#fff' : 'inherit',
                  border: activeTab === 'projects' ? 'none' : '1px solid var(--vscode-panel-border, #ccc)',
                  cursor: 'pointer'
                }}
              >
                Projecten
              </button>
            )}
          </div>

          {/* TAB: Webshop Grid View */}
          {activeTab === 'shop' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2>Onderdelen Overzicht</h2>
            <input
              type="text"
              placeholder="Zoek onderdeel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 10, width: 350, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
            />
          </div>

          {loading ? (
            <p>Laden...</p>
          ) : (() => {
            // Filter onderdelen: leerlingen zien alleen items met >= 3 beschikbaar
            const visibleParts = (!user || user.role === 'student')
              ? filteredOnderdelen.filter(p => p.available_quantity >= 3)
              : filteredOnderdelen
            
            return visibleParts.length === 0 ? (
              <p>Geen onderdelen gevonden.</p>
            ) : (
              <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: 20 
            }}>
              {visibleParts.map((part) => (
                <div 
                  key={part.id} 
                  onClick={() => setModalPart(part)}
                  style={{ 
                    border: '1px solid var(--vscode-panel-border, #ddd)', 
                    borderRadius: 12, 
                    padding: 20,
                    background: 'var(--vscode-editor-background, #fff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {part.low_stock_warning === 1 && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      background: '#fbbf24', 
                      color: '#92400e', 
                      padding: '4px 8px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 'bold' 
                    }}>
                      ⚠️ Laag
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{part.name}</h3>
                    {part.artikelnummer && (
                      <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 8 }}>
                        #{part.artikelnummer}
                      </div>
                    )}
                    {part.description && (
                      <p style={{ 
                        margin: '8px 0', 
                        fontSize: 13, 
                        color: 'var(--vscode-descriptionForeground, #666)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {part.description}
                      </p>
                    )}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--vscode-panel-border, #eee)'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 4 }}>
                        {(!user || user.role === 'student') ? 'Status' : 'Beschikbaar'}
                      </div>
                      <div style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        color: part.available_quantity < 5 ? '#f59e0b' : '#10b981' 
                      }}>
                        {(!user || user.role === 'student') ? 'Op voorraad' : part.available_quantity}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 4 }}>Locatie</div>
                      <div style={{ fontSize: 14, fontWeight: '500' }}>
                        {part.location || 'Onbekend'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )
          })()}

          {/* Modal voor details */}
          {modalPart && (
            <div 
              onClick={() => setModalPart(null)}
              style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                background: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  background: 'var(--vscode-editor-background, #fff)', 
                  borderRadius: 12, 
                  padding: 32,
                  maxWidth: 600,
                  width: '90%',
                  maxHeight: '80vh',
                  overflow: 'auto',
                  border: '1px solid var(--vscode-panel-border, #ddd)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0' }}>{modalPart.name}</h2>
                    {modalPart.artikelnummer && (
                      <div style={{ fontSize: 14, color: 'var(--vscode-descriptionForeground, #666)' }}>
                        Artikelnummer: {modalPart.artikelnummer}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setModalPart(null)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--vscode-panel-border, #ccc)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: 18,
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>

                {modalPart.description && (
                  <div style={{ marginBottom: 24 }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>Beschrijving</strong>
                    <p style={{ margin: 0, color: 'var(--vscode-descriptionForeground, #666)' }}>
                      {modalPart.description}
                    </p>
                  </div>
                )}

                {(!user || user.role === 'student') ? (
                  // Student view: alleen status en locatie
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: 16,
                    marginBottom: 24
                  }}>
                    <div style={{ 
                      padding: 16, 
                      background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Status</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>Op voorraad</div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Locatie</div>
                      <div style={{ fontSize: 18, fontWeight: '500' }}>{modalPart.location || 'Onbekend'}</div>
                    </div>
                  </div>
                ) : (
                  // Docent/Expert/Admin view: alle details
                  <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 16,
                  marginBottom: 24
                }}>
                  <div style={{ 
                    padding: 16, 
                    background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                    borderRadius: 8,
                    border: '1px solid var(--vscode-panel-border, #eee)'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Totaal</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{modalPart.total_quantity}</div>
                  </div>
                  <div style={{ 
                    padding: 16, 
                    background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                    borderRadius: 8,
                    border: '1px solid var(--vscode-panel-border, #eee)'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Gereserveerd</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>{modalPart.reserved_quantity}</div>
                  </div>
                  <div style={{ 
                    padding: 16, 
                    background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                    borderRadius: 8,
                    border: '1px solid var(--vscode-panel-border, #eee)'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Beschikbaar</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: modalPart.available_quantity < 5 ? '#f59e0b' : '#10b981' }}>
                      {modalPart.available_quantity}
                    </div>
                  </div>
                  <div style={{ 
                    padding: 16, 
                    background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                    borderRadius: 8,
                    border: '1px solid var(--vscode-panel-border, #eee)'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginBottom: 4 }}>Locatie</div>
                    <div style={{ fontSize: 18, fontWeight: '500' }}>{modalPart.location || 'Onbekend'}</div>
                  </div>
                </div>
                )}

                {modalPart.low_stock_warning === 1 && user && user.role !== 'student' && (
                  <div style={{ 
                    background: '#fef3c7', 
                    border: '1px solid #fbbf24', 
                    borderRadius: 8, 
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>⚠️</span>
                    <span style={{ color: '#92400e', fontWeight: '500' }}>Let op: weinig voorraad beschikbaar</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Onderdelen Lijst */}
      {activeTab === 'list' && (
        <div>
          {/* Waarschuwing samenvatting */}
          {onderdelen.filter(p => p.low_stock_warning === 1).length > 0 && (
            <div style={{ 
              background: '#fef3c7', 
              border: '2px solid #fbbf24', 
              borderRadius: 8, 
              padding: 16, 
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <strong style={{ color: '#92400e' }}>Waarschuwing: Weinig voorraad</strong>
                <div style={{ color: '#78350f', fontSize: 14, marginTop: 4 }}>
                  {onderdelen.filter(p => p.low_stock_warning === 1).length} onderde{onderdelen.filter(p => p.low_stock_warning === 1).length === 1 ? 'el heeft' : 'len hebben'} minder dan 5 stuks beschikbaar
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Onderdelen Overzicht</h2>
            <input
              type="text"
              placeholder="Zoek op naam of artikelnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 8, width: 300, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
            />
          </div>
          
          {loading ? (
            <p>Laden...</p>
          ) : filteredOnderdelen.length === 0 ? (
            <p>Geen onderdelen gevonden.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--vscode-panel-border, #333)', backgroundColor: 'var(--vscode-editor-background, rgba(0,0,0,0.05))' }}>
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
                  <tr key={part.id} style={{ borderBottom: '1px solid var(--vscode-panel-border, #ddd)', background: selectedPart?.id === part.id ? 'var(--vscode-list-activeSelectionBackground, #eef2ff)' : 'transparent' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{part.name}</strong>
                        {part.low_stock_warning === 1 && (
                          <span style={{ 
                            background: '#fbbf24', 
                            color: '#92400e', 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            fontSize: 11, 
                            fontWeight: 'bold' 
                          }}>
                            ⚠ Weinig voorraad
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{part.artikelnummer || '-'}</td>
                    <td style={{ padding: 12 }}>{part.location || '-'}</td>
                    <td style={{ textAlign: 'center', padding: 12 }}>{part.total_quantity}</td>
                    <td style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontWeight: 'bold' }}>
                      {part.reserved_quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12, color: part.available_quantity < 5 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                      {part.available_quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={() => handleSelectPart(part)}
                          style={{
                            padding: '6px 12px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          Details
                        </button>
                        {/* Verwijder knop alleen voor teacher en admin */}
                        {(user.role === 'teacher' || user.role === 'admin') && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedPart && (
            <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--vscode-panel-border, #ddd)', borderRadius: 8, background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))' }}>
              <h3>Onderdeel Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div><strong>Naam:</strong> {selectedPart.name}</div>
                <div><strong>Artikelnummer:</strong> {selectedPart.artikelnummer || '-'}</div>
                <div><strong>Locatie:</strong> {selectedPart.location || '-'}</div>
                <div><strong>Beschrijving:</strong> {selectedPart.description || '-'}</div>
                <div><strong>Gereserveerd:</strong> {selectedPart.reserved_quantity}</div>
                <div><strong>Beschikbaar:</strong> {selectedPart.available_quantity}</div>
              </div>

              {/* Update form alleen voor teacher en admin */}
              {(user.role === 'teacher' || user.role === 'admin') && (
                <form onSubmit={handleUpdatePart} style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Totaal aantal</label>
                    <input
                      type="number"
                      min={selectedPart.reserved_quantity}
                      value={editTotal}
                      onChange={(e) => setEditTotal(e.target.value)}
                      style={{ padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', width: 180, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                    />
                    <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)', marginTop: 4 }}>
                      Minimaal {selectedPart.reserved_quantity} door actieve reserveringen
                    </div>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Sla aantal op
                  </button>
                  <button
                  type="button"
                  onClick={() => setSelectedPart(null)}
                  style={{
                    padding: '10px 12px',
                    background: 'transparent',
                    color: 'inherit',
                    border: '1px solid var(--vscode-panel-border, #ccc)',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Sluit
                </button>
              </form>
              )}
            </div>
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
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Artikelnummer</label>
              <input
                type="text"
                placeholder="Bijv: ARD-UNO-R3"
                value={newPart.artikelnummer}
                onChange={(e) => setNewPart({ ...newPart, artikelnummer: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Beschrijving</label>
              <textarea
                placeholder="Extra details..."
                value={newPart.description}
                onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', minHeight: 80, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Locatie</label>
              <input
                type="text"
                placeholder="Bijv: Lade A3"
                value={newPart.location}
                onChange={(e) => setNewPart({ ...newPart, location: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
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
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
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
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
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
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
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
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
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
                <tr style={{ borderBottom: '2px solid var(--vscode-panel-border, #333)', backgroundColor: 'var(--vscode-editor-background, rgba(0,0,0,0.05))' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Project</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Aangemaakt</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Actie</th>
                </tr>
              </thead>
              <tbody>
                {reserveringen.map((res) => (
                  <tr key={res.id} style={{ borderBottom: '1px solid var(--vscode-panel-border, #ddd)' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{res.onderdeel_name}</strong>
                      {res.onderdeel_artikelnummer && <span style={{ color: 'var(--vscode-descriptionForeground, #666)', fontSize: 12 }}> ({res.onderdeel_artikelnummer})</span>}
                    </td>
                    <td style={{ padding: 12 }}>{res.project_name}</td>
                    <td style={{ textAlign: 'center', padding: 12, fontWeight: 'bold' }}>{res.aantal}</td>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--vscode-descriptionForeground, #666)' }}>
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
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                required
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  fontSize: 14, 
                  borderRadius: 4, 
                  border: '1px solid var(--vscode-input-border, #ccc)',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)'
                }}
              />
              <select
                value={newProject.category_id || ''}
                onChange={(e) => setNewProject({ ...newProject, category_id: e.target.value })}
                style={{ padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              >
                <option value="">(geen categorie)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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
                    background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', 
                    marginBottom: 8, 
                    borderRadius: 6,
                    border: '1px solid var(--vscode-panel-border, #ddd)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <strong>{proj.name}</strong>
                      {proj.category_name && (
                        <span style={{ marginLeft: 8, color: 'var(--vscode-descriptionForeground, #555)', fontSize: 12 }}>
                          ({proj.category_name})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleLoadProjectParts(proj.id)}
                        style={{ padding: '6px 10px', border: '1px solid var(--vscode-panel-border, #ccc)', background: 'transparent', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                      >
                        Onderdelen
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>

                  {projectParts[proj.id] && projectParts[proj.id].length === 0 && (
                    <div style={{ marginTop: 8, color: 'var(--vscode-descriptionForeground, #666)', fontSize: 13 }}>Geen onderdelen gereserveerd voor dit project.</div>
                  )}
                  {projectParts[proj.id] && projectParts[proj.id].length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--vscode-panel-border, #ddd)' }}>
                          <th style={{ textAlign: 'left', padding: 6 }}>Onderdeel</th>
                          <th style={{ textAlign: 'left', padding: 6 }}>Artikelnummer</th>
                          <th style={{ textAlign: 'center', padding: 6 }}>Gereserveerd</th>
                          <th style={{ textAlign: 'left', padding: 6 }}>Locatie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectParts[proj.id].map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--vscode-panel-border, #eee)' }}>
                            <td style={{ padding: 6 }}>{p.name}</td>
                            <td style={{ padding: 6 }}>{p.artikelnummer || '-'}</td>
                            <td style={{ padding: 6, textAlign: 'center' }}>{p.gereserveerd}</td>
                            <td style={{ padding: 6 }}>{p.location || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3>Categorieën</h3>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 12, maxWidth: 400, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Categorie naam..."
              value={newCategory.name}
              onChange={(e) => setNewCategory({ name: e.target.value })}
              required
              style={{ flex: 1, padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
            />
            <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
              Toevoegen
            </button>
          </form>

          {categories.length === 0 ? (
            <p>Geen categorieën.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {categories.map((cat) => (
                <li key={cat.id} style={{ padding: 10, background: 'var(--vscode-editor-background, rgba(0,0,0,0.03))', marginBottom: 8, borderRadius: 6, border: '1px solid var(--vscode-panel-border, #ddd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                  >
                    Verwijder
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </>
    )}
    </div>
  )
}

export default App