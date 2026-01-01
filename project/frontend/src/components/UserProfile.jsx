import { useState, useEffect } from 'react'
import './UserProfile.css'

export default function UserProfile({ user }) {
  const [email, setEmail] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Load current email
  useEffect(() => {
    if (user?.id) {
      fetch(`http://localhost:3000/api/user/${user.id}/email`)
        .then(res => res.json())
        .then(data => {
          setEmail(data.email || '')
          setEditEmail(data.email || '')
        })
        .catch(err => console.error('Error loading email:', err))
    }
  }, [user])

  const handleSaveEmail = async (e) => {
    e.preventDefault()
    if (!editEmail || !editEmail.includes('@')) {
      setMessage({ type: 'error', text: '❌ Voer een geldig email adres in' })
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('http://localhost:3000/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newEmail: editEmail })
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Fout bij opslaan')
      
      setEmail(editEmail)
      setMessage({ type: 'success', text: '✅ Email bijgewerkt!' })
      setIsEditing(false)
    } catch (error) {
      setMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="user-profile">
      <div className="profile-card">
        <h2>👤 Mijn Profiel</h2>
        
        <div className="profile-section">
          <h3>Gebruikersinformatie</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Gebruikersnaam</label>
              <div className="info-value">{user?.username || '-'}</div>
            </div>
            <div className="info-item">
              <label>Rol</label>
              <div className="info-value role-badge">{user?.role || '-'}</div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>📧 Email Notificaties</h3>
          <p className="email-info">
            Je email wordt gebruikt voor automatische notificaties over lage voorraad, 
            nieuwe reserveringen en items die te laat zijn.
          </p>

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          {!isEditing ? (
            <div className="email-display">
              <div className="email-current">
                <span className="email-label">Huidig email:</span>
                <span className="email-value">
                  {email ? `✅ ${email}` : '⚠️ Niet ingesteld'}
                </span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-edit"
              >
                ✏️ Wijzigen
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveEmail} className="email-form">
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                className="email-input"
                required
              />
              <div className="form-buttons">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-save"
                >
                  {loading ? '⏳ Opslaan...' : '💾 Opslaan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setEditEmail(email)
                    setMessage(null)
                  }}
                  className="btn-cancel"
                >
                  ✖️ Annuleren
                </button>
              </div>
            </form>
          )}

          <div className="email-benefits">
            <h4>📬 Je ontvangt:</h4>
            <ul>
              <li>⚠️ Waarschuwingen voor lage voorraad</li>
              <li>📋 Updates over nieuwe reserveringen</li>
              <li>🚨 Reminders voor items die te laat zijn</li>
            </ul>
            <p className="frequency-note">
              <strong>Frequentie:</strong> Elke maandag om 09:15
            </p>
          </div>
        </div>

        <div className="profile-section privacy-section">
          <h3>🔒 Privacy</h3>
          <p>
            Je email adres wordt alleen gebruikt voor notificaties en nooit gedeeld met derden.
          </p>
        </div>
      </div>
    </div>
  )
}
