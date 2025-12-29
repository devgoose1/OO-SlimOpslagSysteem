import { useState, useEffect } from 'react'
import './AdminPanel.css'

export default function AdminPanel({ user }) {
  const [adminTab, setAdminTab] = useState('email')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [notificationReport, setNotificationReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Haal notificatie rapport op
  const loadNotificationReport = async () => {
    setReportLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/admin/notifications-report?userRole=${user.role}`)
      if (!response.ok) throw new Error('Fout bij laden rapport')
      const data = await response.json()
      setNotificationReport(data)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setReportLoading(false)
    }
  }

  // Load rapport op mount
  useEffect(() => {
    if (adminTab === 'email') {
      loadNotificationReport()
    }
  }, [adminTab])

  // Trigger email notificaties
  const sendNotifications = async () => {
    if (!window.confirm('Weet je zeker dat je notificaties nu wilt sturen?')) return
    
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('http://localhost:3000/api/admin/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userRole: user.role })
      })
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || 'Fout bij verzenden')
      setMessage({ type: 'success', text: `✅ ${data.message} - ${data.summary.successful} verzonden` })
      loadNotificationReport() // Refresh rapport
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Export naar Excel
  const exportToExcel = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('http://localhost:3000/api/admin/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userRole: user.role })
      })
      
      if (!response.ok) throw new Error('Fout bij exporteren')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SlimOpslagsysteem_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setMessage({ type: 'success', text: '✅ Excel bestand gedownload!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        <button
          onClick={() => setAdminTab('email')}
          className={adminTab === 'email' ? 'active' : ''}
        >
          📧 Email Notificaties
        </button>
        <button
          onClick={() => setAdminTab('export')}
          className={adminTab === 'export' ? 'active' : ''}
        >
          📊 Excel Export
        </button>
        <button
          onClick={() => setAdminTab('settings')}
          className={adminTab === 'settings' ? 'active' : ''}
        >
          ⚙️ Instellingen
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* EMAIL NOTIFICATIES TAB */}
      {adminTab === 'email' && (
        <div className="admin-section">
          <h2>📧 Wekelijkse Email Notificaties</h2>
          <p className="info-text">
            Stuur automatische emails naar docenten met updates over lage voorraad, 
            nieuwe reserveringen en te late items.
          </p>

          <div className="email-controls">
            <button
              onClick={sendNotifications}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '⏳ Verzenden...' : '📧 Stuur Nu Notificaties'}
            </button>
            <button
              onClick={loadNotificationReport}
              disabled={reportLoading}
              className="btn-secondary"
            >
              {reportLoading ? '⏳ Laden...' : '🔄 Vernieuwen Rapport'}
            </button>
          </div>

          {notificationReport && (
            <div className="report-section">
              <h3>📊 Volgende Notificatie (Preview)</h3>
              
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-number">{notificationReport.summary?.lowStockCount || 0}</div>
                  <div className="summary-label">⚠️ Lage Voorraad</div>
                </div>
                <div className="summary-card">
                  <div className="summary-number">{notificationReport.summary?.newReservationsCount || 0}</div>
                  <div className="summary-label">📋 Nieuwe Reserveringen</div>
                </div>
                <div className="summary-card">
                  <div className="summary-number">{notificationReport.summary?.overdueItemsCount || 0}</div>
                  <div className="summary-label">🚨 Te Late Items</div>
                </div>
                <div className="summary-card">
                  <div className="summary-number">{notificationReport.summary?.teacherCount || 0}</div>
                  <div className="summary-label">👥 Ontvangers</div>
                </div>
              </div>

              <div className="report-details">
                {notificationReport.lowStock && notificationReport.lowStock.length > 0 && (
                  <div className="report-section-item">
                    <h4>⚠️ Lage Voorraad Items</h4>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Naam</th>
                            <th>Categorie</th>
                            <th>Aantal</th>
                            <th>Minimum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notificationReport.lowStock.map(item => (
                            <tr key={item.id}>
                              <td>{item.naam}</td>
                              <td>{item.categorie}</td>
                              <td className="low">{item.aantal}</td>
                              <td>{item.min_hoeveelheid}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {notificationReport.newReservations && notificationReport.newReservations.length > 0 && (
                  <div className="report-section-item">
                    <h4>📋 Nieuwe Reserveringen (Afgelopen Week)</h4>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Onderdeel</th>
                            <th>Aantal</th>
                            <th>Gereserveerd Door</th>
                            <th>Datum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notificationReport.newReservations.map(res => (
                            <tr key={res.id}>
                              <td>{res.onderdeel_naam}</td>
                              <td>{res.aantal}</td>
                              <td>{res.gereserveerd_door}</td>
                              <td>{new Date(res.aanvraag_datum).toLocaleDateString('nl-NL')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {notificationReport.overdueItems && notificationReport.overdueItems.length > 0 && (
                  <div className="report-section-item">
                    <h4>🚨 Te Late Items</h4>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Onderdeel</th>
                            <th>Aantal</th>
                            <th>Gereserveerd Door</th>
                            <th>Dagen Verlopen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notificationReport.overdueItems.map(item => (
                            <tr key={item.id} className="overdue">
                              <td>{item.onderdeel_naam}</td>
                              <td>{item.aantal}</td>
                              <td>{item.gereserveerd_door}</td>
                              <td className="days-overdue">{item.dagen_verlopen} dagen</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {notificationReport.teachers && notificationReport.teachers.length > 0 && (
                <div className="recipients-section">
                  <h4>👥 Ontvangers ({notificationReport.teachers.length})</h4>
                  <div className="recipients-list">
                    {notificationReport.teachers.map(teacher => (
                      <div key={teacher.id} className="recipient-item">
                        <span className="recipient-name">{teacher.username}</span>
                        <span className="recipient-email">{teacher.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXCEL EXPORT TAB */}
      {adminTab === 'export' && (
        <div className="admin-section">
          <h2>📊 Export naar Excel</h2>
          <p className="info-text">
            Exporteer alle data (onderdelen, reserveringen, statistieken) naar een Excel bestand.
          </p>

          <div className="export-controls">
            <button
              onClick={exportToExcel}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '⏳ Exporteren...' : '📥 Download Excel'}
            </button>
          </div>

          <div className="export-info">
            <h3>📋 Wat wordt geëxporteerd?</h3>
            <ul>
              <li>✅ <strong>Onderdelen</strong> - Volledige inventaris met aantallen</li>
              <li>✅ <strong>Reserveringen</strong> - Actieve en voltooide reserveringen</li>
              <li>✅ <strong>Projecten</strong> - Alle projecten en categorieën</li>
              <li>✅ <strong>Statistieken</strong> - Samengevatte cijfers</li>
              <li>✅ <strong>Onderdelen per Categorie</strong> - Gegroepeerde overzicht</li>
            </ul>
            <p className="export-note">
              Het Excel bestand bevat meerdere sheets met gedetailleerde informatie. 
              Perfect voor rapportages en analyses!
            </p>
          </div>
        </div>
      )}

      {/* INSTELLINGEN TAB */}
      {adminTab === 'settings' && (
        <div className="admin-section">
          <h2>⚙️ Admin Instellingen</h2>
          <p className="info-text">
            Configureer automatische taken en systeem instellingen.
          </p>

          <div className="settings-grid">
            <div className="setting-card">
              <h3>📧 Email Notificaties</h3>
              <p>Automatisch verzonden op <strong>maandag om 09:15</strong></p>
              <p className="setting-status">Status: ✅ Actief</p>
            </div>

            <div className="setting-card">
              <h3>💾 Database Backup</h3>
              <p>Automatisch backup gemaakt op <strong>maandag om 09:00</strong></p>
              <p className="setting-status">Status: ✅ Actief</p>
            </div>

            <div className="setting-card">
              <h3>📊 Excel Export</h3>
              <p>Export beschikbaar op aanvraag</p>
              <p className="setting-status">Status: ✅ Beschikbaar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
