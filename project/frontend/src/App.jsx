import { useState, useEffect, Fragment } from 'react'
import './App.css'
import ChatBot from './ChatBot'
import FavoriteButton from './components/FavoriteButton'
import ReservationNotes from './components/ReservationNotes'
import ReturnDatePicker from './components/ReturnDatePicker'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import PWAInstallButton from './components/PWAInstallButton'
import { getFavorites as fetchFavorites, getLocalFavorites } from './services/favoritesService'

function App() {
  // Theme detection
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  // Detect theme changes in real-time
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  // State voor data
  const [onderdelen, setOnderdelen] = useState([])
  const [projects, setProjects] = useState([])
  const [reserveringen, setReserveringen] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [favorites, setFavorites] = useState([])
  const [localFavorites, setLocalFavorites] = useState(() => getLocalFavorites())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Inline feedback messages (no popups)
  const [feedback, setFeedback] = useState(null) // { type: 'success'|'error'|'info', message }
  
  // Server status
  const [serverStatus, setServerStatus] = useState({ online: false, message: '' })

  // Authenticatie
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  // Helper: staff (full management rights): teacher, admin, TOA
  const isStaff = user && (['teacher', 'admin', 'toa'].includes(user.role))
  // Helper: student-like (limited visibility) includes team accounts
  const isStudentLike = (!user) || ['student', 'team'].includes(user?.role)
  const isExpert = user?.role === 'expert'

  // Tab schakelen
  const [activeTab, setActiveTab] = useState('shop')

  // Zoekfilter
  const [searchTerm, setSearchTerm] = useState('')

  // Advanced filters
  const [shopFilters, setShopFilters] = useState({ category: '', location: '', lowStock: false, takenHome: false, favoritesOnly: false })
  const [listFilters, setListFilters] = useState({ category: '', location: '', lowStock: false })
  const [reservationFilters, setReservationFilters] = useState({ project: '', takenHome: '', overdue: false })
  const [auditFilters, setAuditFilters] = useState({ action: '', user: '', dateFrom: '', dateTo: '' })
  const [unassignedFilters, setUnassignedFilters] = useState({ project: '', dateFrom: '', dateTo: '' })
  const [projectFilters, setProjectFilters] = useState({ category: '', hasReservations: '' })

  // Selected part for modal
  const [modalPart, setModalPart] = useState(null)

  // Formulier voor nieuw onderdeel
  const [newPart, setNewPart] = useState({
    name: '', artikelnummer: '', description: '', location: '', total_quantity: 0, links: '', image_url: ''
  })

  // Formulier voor nieuwe reservering
  const [newReservation, setNewReservation] = useState({
    onderdeel_id: '', project_id: '', aantal: 0
  })

  // Formulier voor nieuw project
  const [newProject, setNewProject] = useState({ name: '', category_id: '' })
  const [newCategory, setNewCategory] = useState({ name: '', start_date: '', end_date: '' })
  const [projectParts, setProjectParts] = useState({})
  const [selectedPart, setSelectedPart] = useState(null)
  const [editTotal, setEditTotal] = useState('')
  const [teams, setTeams] = useState([])
  const [teamProject, setTeamProject] = useState(null)
  const [teamStats, setTeamStats] = useState(null)
  const [teamReservations, setTeamReservations] = useState([])
  const [teamPending, setTeamPending] = useState([])
  const [teamLockerNumber, setTeamLockerNumber] = useState('')
  const [teamNewRequest, setTeamNewRequest] = useState({ onderdeel_id: '', qty: 1 })
  const [editingTeamRequestId, setEditingTeamRequestId] = useState(null)
  const [editingTeamRequestQty, setEditingTeamRequestQty] = useState('')
  const [editingTeamRequestOnderdeel, setEditingTeamRequestOnderdeel] = useState('')
  const [editingTeamRequestNote, setEditingTeamRequestNote] = useState('')
  const [createTeamForm, setCreateTeamForm] = useState({ team_username: '', team_password: '', project_id: '' })
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [managedTeam, setManagedTeam] = useState(null)
  const [managedAdviceForm, setManagedAdviceForm] = useState({ content: '', onderdeel_id: '', qty: 1 })
  const [managedAdviceLoading, setManagedAdviceLoading] = useState(false)
  const [editReservationQty, setEditReservationQty] = useState({})
  const [denyAdviceId, setDenyAdviceId] = useState(null)
  const [denyReason, setDenyReason] = useState('')
  const [adjustAdviceId, setAdjustAdviceId] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ search: '', alt_onderdeel_id: '', alt_qty: '', reason: '' })
  const [denyPendingRequestId, setDenyPendingRequestId] = useState(null)
  const [denyPendingReason, setDenyPendingReason] = useState('')
  const [counterOfferRequestId, setCounterOfferRequestId] = useState(null)
  const [counterOfferForm, setCounterOfferForm] = useState({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' })
  const [teamNewRequestComment, setTeamNewRequestComment] = useState('')
  const [teamCounterResponseId, setTeamCounterResponseId] = useState(null)
  const [teamCounterDeclineComment, setTeamCounterDeclineComment] = useState('')
  const [purchaseFormOpenPartId, setPurchaseFormOpenPartId] = useState(null)
  const [purchaseForm, setPurchaseForm] = useState({ qty: 1, urgency: 'normaal', needed_by: '', category_id: '' })
  const [purchaseDenyReasons, setPurchaseDenyReasons] = useState({})
  const [unassignedItems, setUnassignedItems] = useState([])
  const [unassignedPage, setUnassignedPage] = useState(1)
  const UNASSIGNED_PAGE_SIZE = 10
  const [confirmDeletePartId, setConfirmDeletePartId] = useState(null)
  const [confirmDeleteReservationId, setConfirmDeleteReservationId] = useState(null)
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState(null)
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState(null)
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null)
  const [confirmClearTest, setConfirmClearTest] = useState(false)
  
  // Admin: user management
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student' })
  const [systemStats, setSystemStats] = useState({ totalParts: 0, totalReservations: 0, totalProjects: 0, lowStockCount: 0 })
  
  // Test environment (admin only)
  const [testGenerateCount, setTestGenerateCount] = useState(20)
  const [testModeActive, setTestModeActive] = useState(false)
  
  // Backup management
  const [backupFiles, setBackupFiles] = useState([])
  const [selectedBackupFile, setSelectedBackupFile] = useState(null)
  // Audit log
  const [auditRows, setAuditRows] = useState([])
  const [auditPage, setAuditPage] = useState(1)
  const AUDIT_PAGE_SIZE = 50

  // Password change
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })

  // Helper function: construct full API URL with base URL and add testMode query parameter when needed
  const apiUrl = (path) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const fullUrl = `${baseUrl}${path}`
    if (testModeActive) {
      const separator = fullUrl.includes('?') ? '&' : '?'
      return `${fullUrl}${separator}testMode=true`
    }
    return fullUrl
  }

  // Helper function: get theme-aware colors
  const themeColors = {
    bg: isDarkMode ? '#1e1e1e' : '#ffffff',
    bgAlt: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    border: isDarkMode ? '#3e3e42' : '#e0e0e0',
    text: isDarkMode ? '#cccccc' : '#1e1e1e',
    textSecondary: isDarkMode ? '#999999' : '#666666',
    inputBg: isDarkMode ? '#3c3c3c' : '#ffffff',
    inputBorder: isDarkMode ? '#555555' : '#cccccc',
    inputText: isDarkMode ? '#cccccc' : '#1e1e1e',
    overlay: isDarkMode ? 'rgba(100,100,100,0.05)' : 'rgba(100,100,100,0.03)'
  }

  const lowStockThreshold = isStudentLike ? 3 : 5

  // === DATA LADEN ===
  const checkServerStatus = async () => {
    try {
      const res = await fetch(apiUrl('/status'))
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
      const res = await fetch(apiUrl('/api/onderdelen'))
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
      const res = await fetch(apiUrl('/api/projects'))
      if (!res.ok) throw new Error('Kon projecten niet laden')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch(apiUrl('/api/categories'))
      if (!res.ok) throw new Error('Kon categorieën niet laden')
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadReserveringen = async () => {
    try {
      const res = await fetch(apiUrl('/api/reserveringen'))
      if (!res.ok) throw new Error('Kon reserveringen niet laden')
      const data = await res.json()
      setReserveringen(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadPendingRequests = async () => {
    try {
      if (!user || !isStaff) return
      const res = await fetch(apiUrl(`/api/team/pending-requests?userRole=${user.role}`))
      if (!res.ok) {
        // Don't hard fail UI; just clear list
        setPendingRequests([])
        return
      }
      const data = await res.json()
      setPendingRequests(data)
    } catch (err) {
      // Non-fatal for UI
      setPendingRequests([])
    }
  }

  const loadTeams = async () => {
    if (!user || (!isStaff && !isExpert)) return
    try {
      const res = await fetch(apiUrl(`/api/team/list?userRole=${user.role}`))
      if (!res.ok) throw new Error('Kon teams niet laden')
      const data = await res.json()
      setTeams(data)
    } catch (err) {
      setError(err.message)
      setTeams([])
    }
  }

  const loadManagedTeam = async (projectId) => {
    if (!projectId || (!isStaff && !isExpert)) return
    try {
      setManagedAdviceLoading(true)
      const res = await fetch(apiUrl(`/api/team/manage/${projectId}?userRole=${user.role}`))
      if (!res.ok) throw new Error('Kon teamdetails niet laden')
      const data = await res.json()
      setManagedTeam(data)
    } catch (err) {
      setError(err.message)
      setManagedTeam(null)
    } finally {
      setManagedAdviceLoading(false)
    }
  }

  const handleCreateAdvice = async () => {
    if (!selectedTeamId) {
      setError('Kies eerst een team')
      return
    }
    if (!managedAdviceForm.content.trim()) {
      setError('Advies/opmerking mag niet leeg zijn')
      return
    }
    try {
      setManagedAdviceLoading(true)
      const payload = {
        userRole: user?.role,
        author_user_id: user?.id,
        content: managedAdviceForm.content.trim(),
        onderdeel_id: managedAdviceForm.onderdeel_id || null,
        qty: managedAdviceForm.qty || 1
      }
      const res = await fetch(apiUrl(`/api/team/${selectedTeamId}/advice`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error(text || 'Onbekende fout bij opslaan van advies')
      }
      if (!res.ok) throw new Error(data.error || data.details || 'Kon advies niet opslaan')
      setManagedAdviceForm({ content: '', onderdeel_id: '', qty: 1 })
      await loadManagedTeam(selectedTeamId)
    } catch (err) {
      setError(err.message)
    } finally {
      setManagedAdviceLoading(false)
    }
  }

  const handleApproveAdvice = async (adviceId) => {
    if (!isStaff) return
    try {
      setManagedAdviceLoading(true)
      const res = await fetch(apiUrl(`/api/team/advice/${adviceId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon advies niet goedkeuren')
      setFeedback({ type: 'success', message: 'Advies goedgekeurd en onderdeel toegevoegd.' })
      await loadManagedTeam(selectedTeamId)
      loadTeams()
    } catch (err) {
      setError(err.message)
    } finally {
      setManagedAdviceLoading(false)
    }
  }

  const handleDenyAdvice = async (adviceId) => {
    if (!isStaff) return
    const reason = denyReason.trim()
    if (!reason) { setFeedback({ type: 'error', message: 'Reden is verplicht bij afwijzen.' }); return }
    try {
      setManagedAdviceLoading(true)
      const res = await fetch(apiUrl(`/api/team/advice/${adviceId}/deny`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id, reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon advies niet afwijzen')
      setFeedback({ type: 'success', message: 'Advies afgewezen.' })
      setDenyAdviceId(null); setDenyReason('')
      await loadManagedTeam(selectedTeamId)
      loadTeams()
    } catch (err) {
      setError(err.message)
    } finally {
      setManagedAdviceLoading(false)
    }
  }

  const handleAdjustAdvice = async (adviceId) => {
    if (!isStaff) return
    const altOnderdeelId = adjustForm.alt_onderdeel_id || null
    const altQty = adjustForm.alt_qty ? Number(adjustForm.alt_qty) : null
    const reason = adjustForm.reason || ''
    if (!altOnderdeelId && !altQty) {
      setFeedback({ type: 'error', message: 'Geef een alternatief onderdeel of een aangepast aantal op.' })
      return
    }
    try {
      setManagedAdviceLoading(true)
      const res = await fetch(apiUrl(`/api/team/advice/${adviceId}/adjust`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole: user?.role,
          decided_by: user?.id,
          alt_onderdeel_id: altOnderdeelId || null,
          alt_qty: altQty,
          reason
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon alternatief niet opslaan')
      setFeedback({ type: 'success', message: 'Alternatief toegepast en onderdeel toegevoegd.' })
      setAdjustAdviceId(null); setAdjustForm({ search: '', alt_onderdeel_id: '', alt_qty: '', reason: '' })
      await loadManagedTeam(selectedTeamId)
      loadTeams()
    } catch (err) {
      setError(err.message)
    } finally {
      setManagedAdviceLoading(false)
    }
  }

  const loadPurchaseRequests = async () => {
    try {
      const res = await fetch(apiUrl(`/api/purchase_requests?userRole=${user?.role}`))
      if (!res.ok) throw new Error('Kon aankoopaanvragen niet laden')
      const data = await res.json()
      setPurchaseRequests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch(apiUrl('/api/users'))
      if (!res.ok) throw new Error('Kon gebruikers niet laden')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadSystemStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/stats'))
      if (!res.ok) throw new Error('Kon statistieken niet laden')
      const data = await res.json()
      setSystemStats(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadAudit = async (page=1) => {
    try {
      if (!user || !['teacher','toa','expert'].includes(user.role)) return
      const offset = (page - 1) * AUDIT_PAGE_SIZE
      console.log('[FRONTEND] Loading audit logs:', { page, offset, limit: AUDIT_PAGE_SIZE, userRole: user.role });
      const res = await fetch(apiUrl(`/api/audit?userRole=${user.role}&limit=${AUDIT_PAGE_SIZE}&offset=${offset}`))
      if (!res.ok) throw new Error('Kon audit log niet laden')
      const data = await res.json()
      console.log('[FRONTEND] Audit logs loaded:', { count: data.length, data });
      console.log('[FRONTEND] Setting auditRows state to:', data);
      setAuditRows(data)
    } catch (err) {
      console.error('[FRONTEND] Audit load error:', err);
      setError(err.message)
      setAuditRows([])
    }
  }

  // On-demand database backup (admin only)
  const handleBackup = async () => {
    try {
      const res = await fetch(apiUrl('/api/backup'), { method: 'POST' })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Backup mislukt')
      }

      // Get the backup file from response
      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `opslag-backup-${new Date().getTime()}.db`

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setFeedback({ type: 'success', message: `Backup gelukt. Bestand: ${filename}` })
      loadBackupFiles()
    } catch (err) {
      setError(err.message)
    }
  }

  const loadBackupFiles = async () => {
    try {
      const res = await fetch(apiUrl('/api/backup/list'))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon backup bestanden niet ophalen')
      setBackupFiles(data.files || [])
    } catch (err) {
      console.error('Error loading backup files:', err.message)
    }
  }

  const handleMergeBackup = async () => {
    if (!selectedBackupFile) {
      setError('Selecteer eerst een backup bestand')
      return
    }
    
    try {
      const formData = new FormData()
      formData.append('backupFile', selectedBackupFile)
      
      const res = await fetch(apiUrl('/api/backup/merge'), {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'Merge mislukt'
        throw new Error(errorMsg)
      }
      setFeedback({ type: 'success', message: `Merge voltooid: ${data.message}` })
      setSelectedBackupFile(null)
      loadOnderdelen()
      loadProjects()
      loadCategories()
      loadUsers()
    } catch (err) {
      console.error('Merge error:', err)
      setError(err.message)
    }
  }

  const handleDownloadBackup = async (filename) => {
    try {
      window.open(apiUrl(`/api/backup/download/${filename}`), '_blank')
    } catch (err) {
      setError(err.message)
    }
  }

  const loadTeamProject = async (explicitUserId) => {
    try {
      const uid = explicitUserId ?? user?.id
      if (!uid) return
      const res = await fetch(apiUrl(`/api/team/project?user_id=${uid}`))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon project data niet ophalen')
      setTeamProject(data.project)
      setTeamStats(data.stats)
      setTeamReservations(data.reservations || [])
      setTeamPending(data.pending || [])
      setTeamLockerNumber(data.project.locker_number || '')
    } catch (err) {
      console.error('Error loading team project:', err.message)
    }
  }

  const handleTeamRequestPart = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl('/api/team/request-parts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          onderdeel_id: Number(teamNewRequest.onderdeel_id),
          qty: Number(teamNewRequest.qty),
          note: teamNewRequestComment || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aanvraag mislukt')
      setFeedback({ type: 'success', message: 'Aanvraag ingediend, wacht op reactie van docent/TOA.' })
      setTeamNewRequest({ onderdeel_id: '', qty: 1 })
      setTeamNewRequestComment('')
      loadTeamProject()
    } catch (err) {
      setError(err.message)
    }
  }

  // Approve/Deny handlers for staff
  const handleApproveRequest = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/team/requests/${id}/approve`), {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id })
      })
        const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Goedkeuren mislukt')
      await loadPendingRequests()
      await loadReserveringen()
      await loadOnderdelen()
      if (selectedTeamId) await loadManagedTeam(selectedTeamId)
      loadTeams()
      if (user?.role === 'team') await loadTeamProject()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDenyRequest = async (id) => {
        const reason = (denyPendingReason || '').trim()
    if (!reason) { setFeedback({ type: 'error', message: 'Reden is verplicht bij afwijzen.' }); return }
    try {
      const res = await fetch(apiUrl(`/api/team/requests/${id}/deny`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id, reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Afwijzen mislukt')
      await loadPendingRequests()
      setFeedback({ type: 'success', message: 'Aanvraag afgewezen.' })
      setDenyPendingRequestId(null); setDenyPendingReason('')
      if (selectedTeamId) await loadManagedTeam(selectedTeamId)
      loadTeams()
      if (user?.role === 'team') await loadTeamProject()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCounterOffer = async (id) => {
    const newQty = counterOfferForm.new_qty ? Number(counterOfferForm.new_qty) : null
    const newOnderdeelId = counterOfferForm.new_onderdeel_id ? Number(counterOfferForm.new_onderdeel_id) : null
    if (!newQty && !newOnderdeelId) {
      setFeedback({ type: 'error', message: 'Geef minstens een aantal of onderdeel op.' })
      return
    }
    try {
      const res = await fetch(apiUrl(`/api/team/requests/${id}/counter`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole: user?.role,
          decided_by: user?.id,
          counter_type: counterOfferForm.type,
          new_qty: newQty,
          new_onderdeel_id: newOnderdeelId,
          note: counterOfferForm.note || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Tegenadvies mislukt')
      await loadPendingRequests()
      setFeedback({ type: 'success', message: counterOfferForm.type === 'forced' ? 'Verplichte wijziging toegepast.' : 'Tegenadvies voorgesteld.' })
      setCounterOfferRequestId(null)
      setCounterOfferForm({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' })
      if (selectedTeamId) await loadManagedTeam(selectedTeamId)
      loadTeams()
      if (user?.role === 'team') await loadTeamProject()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTeamLockerUpdate = async () => {
    try {
      const res = await fetch(apiUrl('/api/team/locker'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, locker_number: teamLockerNumber })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bijwerken mislukt')
      setFeedback({ type: 'success', message: 'Kluisjesnummer bijgewerkt.' })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTeamRespondToCounter = async (requestId, response, comment = '') => {
    if (response === 'decline' && !comment.trim()) {
      setError('Opmerking is verplicht bij weigeren')
      return
    }
    try {
      const res = await fetch(apiUrl(`/api/team/requests/${requestId}/respond`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          response,
          comment: comment || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reageren op voorstel mislukt')
      await loadTeamProject()
      setFeedback({ type: 'success', message: response === 'accept' ? 'Voorstel geaccepteerd.' : 'Voorstel afgewezen.' })
      setTeamCounterResponseId(null)
      setTeamCounterDeclineComment('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditTeamRequest = async (requestId, newQty, newOnderdeelId, newNote) => {
    if (!newQty || newQty < 1) {
      setError('Aantal moet minstens 1 zijn')
      return
    }
    try {
      const res = await fetch(apiUrl(`/api/team/request/${requestId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          qty: Number(newQty),
          onderdeel_id: newOnderdeelId ? Number(newOnderdeelId) : undefined,
          note: newNote !== undefined ? newNote : undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aanvraag bijwerken mislukt')
      await loadTeamProject()
      setFeedback({ type: 'success', message: 'Aanvraag bijgewerkt.' })
      setEditingTeamRequestId(null)
      setEditingTeamRequestQty('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteTeamRequest = async (requestId) => {
    try {
      const res = await fetch(apiUrl(`/api/team/request/${requestId}?user_id=${user?.id}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aanvraag verwijderen mislukt')
      await loadTeamProject()
      setFeedback({ type: 'success', message: 'Aanvraag verwijderd.' })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateTeamAccount = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl('/api/team/create-and-assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createTeamForm, userRole: user?.role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Team account aanmaken mislukt')
      setFeedback({ type: 'success', message: `Team account aangemaakt: ${data.username}` })
      setCreateTeamForm({ team_username: '', team_password: '', project_id: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  // === HANDLERS ===

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl('/api/login'), {
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
      if (['teacher','admin','toa','expert'].includes(data.role)) loadTeams()
      if (data.role === 'toa') loadPurchaseRequests()
      if (['teacher','admin','toa'].includes(data.role)) loadPendingRequests()
      if (data.role === 'admin') loadBackupFiles()
      if (data.role === 'team') loadTeamProject(data.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setActiveTab('shop')
  }

  // Refresh pending requests when navigating to reservations tab (for staff)
  useEffect(() => {
    if (activeTab === 'reservations' && isStaff) {
      loadPendingRequests()
      loadReserveringen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    // Load unassigned items when viewing the unassigned tab and authorized
    if (activeTab === 'unassigned' && user && (['teacher','admin','toa','expert'].includes(user.role))) {
      loadUnassignedItems()
    }
    if (activeTab === 'audit') {
      loadAudit(auditPage)
    }
    if (activeTab === 'toa' && user && user.role === 'toa') {
      loadPurchaseRequests()
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'teams' && (isStaff || isExpert)) {
      loadTeams()
      if (selectedTeamId) loadManagedTeam(selectedTeamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Debug: monitor activeTab changes
  useEffect(() => {
    console.log('[ACTIVETAB CHANGED]', { activeTab });
  }, [activeTab])

  // Debug: monitor auditRows changes
  useEffect(() => {
    console.log('[FRONTEND] auditRows state changed:', { count: auditRows.length, auditRows });
  }, [auditRows])
  
  const handleAddPart = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...newPart,
        total_quantity: Number(newPart.total_quantity),
        image_url: newPart.image_url || null,
        links: newPart.links.split('\n').filter(l => l.trim()).map(l => ({ url: l.trim(), name: new URL(l.trim()).hostname.replace('www.', '') }))
      , userRole: user?.role, user_id: user?.id };
      console.log('[FRONTEND] Sending POST /api/onderdelen:', payload);
      const res = await fetch(apiUrl('/api/onderdelen'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdeel niet toevoegen')

      setNewPart({ name: '', artikelnummer: '', description: '', location: '', total_quantity: 0, links: '', image_url: '' })
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
      const res = await fetch(apiUrl('/api/reserveringen'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onderdeel_id: Number(newReservation.onderdeel_id),
          project_id: Number(newReservation.project_id),
          aantal: Number(newReservation.aantal),
          userRole: user?.role
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

  const handleCreatePurchaseRequest = async (onderdeel_id, qty, form) => {
    try {
      if (!['teacher','toa'].includes(user?.role)) { throw new Error('Alleen docenten of TOA mogen aankoopaanvragen plaatsen') }
      const { urgency = 'normaal', needed_by = '', category_id = '' } = form || {}
      const body = {
        onderdeel_id: Number(onderdeel_id),
        user_id: user.id,
        qty: Number(qty),
        urgency,
        needed_by: needed_by || undefined,
        category_id: category_id ? Number(category_id) : undefined,
        userRole: user?.role
      }
      const res = await fetch(apiUrl('/api/purchase_requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon aankoopaanvraag niet plaatsen')
      setError(null)
      setFeedback({ type: 'success', message: 'Aankoopaanvraag geplaatst.' })
      if (user && user.role === 'toa') loadPurchaseRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, userRole: user?.role, user_id: user?.id })
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
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}?userRole=${user?.role}`), { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      })
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
      const res = await fetch(apiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCategory, userRole: user?.role, user_id: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon categorie niet toevoegen')
      setNewCategory({ name: '', start_date: '', end_date: '' })
      loadCategories()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/categories/${id}?userRole=${user?.role}`), { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon categorie niet verwijderen')
      loadCategories()
      loadProjects()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // === ADMIN HANDLERS ===

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, userRole: user.role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon gebruiker niet toevoegen')
      setNewUser({ username: '', password: '', role: 'student' })
      loadUsers()
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/users/${id}`), { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon gebruiker niet verwijderen')
      loadUsers()
      setFeedback({ type: 'success', message: 'Gebruiker verwijderd.' })
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateUserRole = async (id, newRole) => {
    try {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, user_id: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon rol niet wijzigen')
      loadUsers()
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
      const res = await fetch(apiUrl(`/api/projects/${projectId}/onderdelen`))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdelen niet ophalen')
      setProjectParts((prev) => ({ ...prev, [projectId]: data }))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }
  
  // ===== TEST ENVIRONMENT HANDLERS =====
  // Test mode is now CLIENT-SIDE - no server toggle needed!
  const handleToggleTestMode = async () => {
    const newMode = !testModeActive
    
    // Update state FIRST
    setTestModeActive(newMode)
    
    if (newMode) {
      setFeedback({ type: 'info', message: 'Test modus geactiveerd (alleen voor jou).' })
    } else {
      setFeedback({ type: 'info', message: 'Test modus gedeactiveerd.' })
    }
    
    // Force reload with the NEW mode (directly use the mode value instead of state)
    try {
      setLoading(true)
      const suffix = newMode ? '?testMode=true' : ''
      
      const [partsRes, projectsRes, reservationsRes, categoriesRes, statsRes] = await Promise.all([
        fetch(apiUrl(`/api/onderdelen${suffix}`)),
        fetch(apiUrl(`/api/projects${suffix}`)),
        fetch(apiUrl(`/api/reserveringen${suffix}`)),
        fetch(apiUrl(`/api/categories${suffix}`)),
        fetch(apiUrl(`/api/stats${suffix}`))
      ])
      
      const [parts, projects, reservations, categories, stats] = await Promise.all([
        partsRes.json(),
        projectsRes.json(),
        reservationsRes.json(),
        categoriesRes.json(),
        statsRes.json()
      ])
      
      setOnderdelen(parts)
      setProjects(projects)
      setReserveringen(reservations)
      setCategories(categories)
      setSystemStats(stats)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleGenerateTestData = async () => {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/test/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: testGenerateCount })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon test data niet genereren')
      
      setFeedback({ type: 'success', message: data.message })
      
      // Herlaad test data (test mode wordt automatisch geactiveerd)
      if (!testModeActive) {
        setTestModeActive(true)
      }
      loadOnderdelen()
      loadProjects()
      loadReserveringen()
      loadCategories()
      loadSystemStats()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleClearTestData = async () => {
    
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/test/clear'), {
        method: 'DELETE'
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon test data niet wissen')
      
      setFeedback({ type: 'success', message: data.message })
      
      // Herlaad data
      loadOnderdelen()
      loadProjects()
      loadReserveringen()
      loadCategories()
      loadSystemStats()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseReservation = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/reserveringen/${id}/release`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon reservering niet releasen')

      loadOnderdelen()
      loadReserveringen()
      if (selectedTeamId) loadManagedTeam(selectedTeamId)
      loadUnassignedItems()
      setFeedback({ type: 'success', message: 'Reservering verwijderd voor team.' })
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateReservationQty = async (id) => {
    try {
      const newQty = Number(editReservationQty[id])
      if (!newQty || newQty < 1) {
        setFeedback({ type: 'error', message: 'Aantal moet minimaal 1 zijn.' })
        return
      }
      const res = await fetch(apiUrl(`/api/reserveringen/${id}/qty`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, new_qty: newQty, decided_by: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon aantal niet aanpassen')
      setFeedback({ type: 'success', message: 'Aantal aangepast.' })
      if (selectedTeamId) await loadManagedTeam(selectedTeamId)
      loadOnderdelen()
      loadUnassignedItems()
    } catch (err) {
      setError(err.message)
    }
  }

  const loadUnassignedItems = async () => {
    try {
      const res = await fetch(apiUrl(`/api/reservations/unassigned?userRole=${user?.role}`))
      if (!res.ok) throw new Error('Kon onverdeelde onderdelen niet laden')
      const data = await res.json()
      setUnassignedItems(data)
      setUnassignedPage(1)
    } catch (err) {
      setUnassignedItems([])
      setError(err.message)
    }
  }

  const handleReturnUnassigned = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/reservations/${id}/return`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role, decided_by: user?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon item niet terugleggen')
      setFeedback({ type: 'success', message: 'Item gemarkeerd als teruggelegd.' })
      await loadUnassignedItems()
      loadOnderdelen()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeletePart = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/onderdelen/${id}?userRole=${user?.role}`), {
        method: 'DELETE'
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kon onderdeel niet verwijderen')

      loadOnderdelen()
      setFeedback({ type: 'success', message: 'Onderdeel verwijderd.' })
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
      const res = await fetch(apiUrl(`/api/onderdelen/${selectedPart.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedPart.name,
          artikelnummer: selectedPart.artikelnummer,
          description: selectedPart.description,
          location: selectedPart.location,
          total_quantity: newTotal,
          userRole: user?.role,
          user_id: user?.id
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

  const favoriteIds = user?.id
    ? favorites.map((f) => f.onderdeel_id)
    : localFavorites.map((f) => f.onderdeel_id)

  // Advanced filter logic for webshop
  const filteredShopParts = filteredOnderdelen.filter(part => {
    if (shopFilters.category && part.category_id !== Number(shopFilters.category)) return false
    if (shopFilters.location && !part.location?.toLowerCase().includes(shopFilters.location.toLowerCase())) return false
    if (shopFilters.lowStock && part.available_quantity >= 10) return false
    if (shopFilters.takenHome) {
      // Check if any reservation for this part is taken home
      const hasTakenHome = reserveringen.some(r => r.onderdeel_id === part.id && r.taken_home === 1)
      if (!hasTakenHome) return false
    }
    if (shopFilters.favoritesOnly && !favoriteIds.includes(part.id)) return false
    return part.available_quantity > 0
  })

  // Advanced filter logic for parts list (beheer)
  const filteredListParts = filteredOnderdelen.filter(part => {
    if (listFilters.category && part.category_id !== Number(listFilters.category)) return false
    if (listFilters.location && !part.location?.toLowerCase().includes(listFilters.location.toLowerCase())) return false
    if (listFilters.lowStock && part.available_quantity >= 10) return false
    return true
  })

  // Advanced filter logic for reservations
  const filteredReservations = reserveringen.filter(res => {
    if (reservationFilters.project && res.project_id !== Number(reservationFilters.project)) return false
    if (reservationFilters.takenHome === 'yes' && res.taken_home !== 1) return false
    if (reservationFilters.takenHome === 'no' && res.taken_home === 1) return false
    if (reservationFilters.overdue) {
      const isOverdue = res.taken_home === 1 && res.due_date && new Date(res.due_date) < new Date()
      if (!isOverdue) return false
    }
    return true
  })

  // Advanced filter logic for audit log
  const filteredAuditRows = auditRows.filter(row => {
    if (auditFilters.action && !row.action.toLowerCase().includes(auditFilters.action.toLowerCase())) return false
    if (auditFilters.user && !row.actor_name?.toLowerCase().includes(auditFilters.user.toLowerCase())) return false
    if (auditFilters.dateFrom && row.created_at < auditFilters.dateFrom) return false
    if (auditFilters.dateTo && row.created_at > auditFilters.dateTo + 'T23:59:59') return false
    return true
  })

  // Advanced filter logic for unassigned items
  const filteredUnassigned = unassignedItems.filter(item => {
    if (unassignedFilters.project && item.project_id !== Number(unassignedFilters.project)) return false
    if (unassignedFilters.dateFrom && item.decided_at && item.decided_at < unassignedFilters.dateFrom) return false
    if (unassignedFilters.dateTo && item.decided_at && item.decided_at > unassignedFilters.dateTo + 'T23:59:59') return false
    return true
  })

  // Advanced filter logic for projects
  const filteredProjects = projects.filter(proj => {
    if (projectFilters.category && proj.category_id !== Number(projectFilters.category)) return false
    if (projectFilters.hasReservations === 'yes') {
      const hasRes = reserveringen.some(r => r.project_id === proj.id)
      if (!hasRes) return false
    }
    if (projectFilters.hasReservations === 'no') {
      const hasRes = reserveringen.some(r => r.project_id === proj.id)
      if (hasRes) return false
    }
    return true
  })

  // Favorites loader
  const loadFavorites = async () => {
    if (user?.id) {
      const response = await fetchFavorites(user.id)
      if (response?.success) {
        setFavorites(response.favorites || [])
      }
    } else {
      setFavorites([])
      setLocalFavorites(getLocalFavorites())
    }
  }

  const handleFavoriteChange = (onderdeel_id, isFav) => {
    if (user?.id) {
      setFavorites((prev) => {
        if (isFav) {
          return [...prev, { onderdeel_id }]
        }
        return prev.filter((f) => f.onderdeel_id !== onderdeel_id)
      })
    } else {
      setLocalFavorites(getLocalFavorites())
    }
  }

  // Laad data bij mount
  useEffect(() => {
    checkServerStatus()
    loadOnderdelen() // Altijd laden, ook zonder login voor student view
    loadFavorites()
    if (user) {
      loadProjects()
      loadCategories()
      loadReserveringen()
      if (isStaff || isExpert) {
        loadTeams()
      }
      
      // Staff data (teacher/admin/TOA)
      if (isStaff) {
        loadUsers()
        loadSystemStats()
      }
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

  // Laad details voor geselecteerd team in het beheertabblad
  useEffect(() => {
    if (selectedTeamId) {
      loadManagedTeam(selectedTeamId)
    } else {
      setManagedTeam(null)
    }
  }, [selectedTeamId])

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <PWAInstallButton />
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

          
          {user && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.05))',
              border: '1px solid #e0e0e0'
            }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Ingelogd als</div>
                <div style={{ fontWeight: 'bold' }}>
                  {user.username} ({user.role === 'student' ? 'Leerling' : user.role === 'teacher' ? 'Docent' : user.role === 'toa' ? 'TOA' : user.role === 'expert' ? 'Leerling-expert' : user.role === 'team' ? 'Team' : 'Admin'})
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

          {user && ['teacher','toa','expert'].includes(user.role) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 12px', border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt, maxWidth: 280 }}>
              <div style={{ fontWeight: 'bold' }}>Wachtwoord wijzigen</div>
              <input type="password" placeholder="Oud wachtwoord" value={changePasswordForm.oldPassword} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })} style={{ padding: 6, borderRadius: 6, border: `1px solid ${themeColors.border}` }} />
              <input type="password" placeholder="Nieuw wachtwoord" value={changePasswordForm.newPassword} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })} style={{ padding: 6, borderRadius: 6, border: `1px solid ${themeColors.border}` }} />
              <input type="password" placeholder="Bevestig nieuw" value={changePasswordForm.confirm} onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirm: e.target.value })} style={{ padding: 6, borderRadius: 6, border: `1px solid ${themeColors.border}` }} />
              <button onClick={async () => {
                try {
                  if (!changePasswordForm.newPassword || changePasswordForm.newPassword !== changePasswordForm.confirm) {
                    setError('Nieuw wachtwoord komt niet overeen.');
                    return;
                  }
                  const res = await fetch(apiUrl('/api/change_password'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.id,
                      oldPassword: changePasswordForm.oldPassword,
                      newPassword: changePasswordForm.newPassword,
                      userRole: user.role
                    })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Kon wachtwoord niet wijzigen');
                  setFeedback({ type: 'success', message: 'Wachtwoord bijgewerkt.' });
                  setChangePasswordForm({ oldPassword: '', newPassword: '', confirm: '' });
                  setError(null);
                } catch (err) {
                  setError(err.message);
                }
              }} style={{ padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Opslaan</button>
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
          background: themeColors.bgAlt, 
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          color: themeColors.text,
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
                  border: '1px solid var(--vscode-input-border, #555)',
                  background: 'var(--vscode-input-background, #3c3c3c)',
                  color: 'var(--vscode-input-foreground, #cccccc)'
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
                  border: '1px solid var(--vscode-input-border, #555)',
                  background: 'var(--vscode-input-background, #3c3c3c)',
                  color: 'var(--vscode-input-foreground, #cccccc)'
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
            background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
            borderRadius: 8,
            fontSize: 13
          }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>Test accounts:</strong>
            <div style={{ color: themeColors.textSecondary }}>
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
              border: ("1px solid ${themeColors.border}"),
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
          <div style={{ marginBottom: 24, borderBottom: `2px solid ${themeColors.border}` }}>
            {/* Webshop tab - altijd zichtbaar */}
            <button
              onClick={() => setActiveTab('shop')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'shop' ? '#667eea' : 'transparent',
                color: activeTab === 'shop' ? '#fff' : 'inherit',
                border: activeTab === 'shop' ? 'none' : `1px solid ${themeColors.border}`,
                cursor: 'pointer',
                marginRight: 8
              }}
            >
              Webshop
            </button>
            
            {/* Onderdelen beheer - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'list' ? '#667eea' : 'transparent',
                  color: activeTab === 'list' ? '#fff' : 'inherit',
                  border: activeTab === 'list' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Onderdelen Beheer
              </button>
            )}
            
            {/* Nieuw onderdeel - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('add')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'add' ? '#667eea' : 'transparent',
                  color: activeTab === 'add' ? '#fff' : 'inherit',
                  border: activeTab === 'add' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Nieuw Onderdeel
              </button>
            )}
            
            {/* Reservering maken - voor full staff en experts */}
            {user && (isStaff || isExpert) && (
              <button
                onClick={() => setActiveTab('reserve')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'reserve' ? '#667eea' : 'transparent',
                  color: activeTab === 'reserve' ? '#fff' : 'inherit',
                  border: activeTab === 'reserve' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Reservering Maken
              </button>
            )}
            
            {/* Actieve reserveringen - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('reservations')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'reservations' ? '#667eea' : 'transparent',
                  color: activeTab === 'reservations' ? '#fff' : 'inherit',
                  border: activeTab === 'reservations' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Actieve Reserveringen
              </button>
            )}

            {/* Teams beheer - staff en experts */}
            {user && (isStaff || isExpert) && (
              <button
                onClick={() => setActiveTab('teams')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'teams' ? '#667eea' : 'transparent',
                  color: activeTab === 'teams' ? '#fff' : 'inherit',
                  border: activeTab === 'teams' ? 'none' : (`1px solid ${themeColors.border}`),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Teams
              </button>
            )}

            {/* Onverdeelde onderdelen - staff en experts */}
            {user && (isStaff || isExpert) && (
              <button
                onClick={() => setActiveTab('unassigned')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'unassigned' ? '#667eea' : 'transparent',
                  color: activeTab === 'unassigned' ? '#fff' : 'inherit',
                  border: activeTab === 'unassigned' ? 'none' : (`1px solid ${themeColors.border}`),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Onverdeelde Onderdelen
              </button>
            )}
            
            {/* Aankoopaanvragen - alleen voor TOA */}
            {user && user.role === 'toa' && (
              <button
                onClick={() => setActiveTab('toa')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'toa' ? '#667eea' : 'transparent',
                  color: activeTab === 'toa' ? '#fff' : 'inherit',
                  border: activeTab === 'toa' ? 'none' : (`1px solid ${themeColors.border}`),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Aankoopaanvragen
              </button>
            )}
            
            {/* Audit Log - docenten, TOA en experts */}
            {user && ['teacher','toa','expert'].includes(user.role) && (
              <>
                {console.log('[BUTTON RENDER] Audit Log button is visible')}
                <button
                  onClick={() => { 
                    console.log('[BUTTON CLICK] Audit tab clicked, setting activeTab to audit'); 
                    setActiveTab('audit');
                    console.log('[AFTER SETACTIVETAB] activeTab should be audit now');
                  }}
                  style={{ 
                    padding: '12px 24px', 
                    background: activeTab === 'audit' ? '#667eea' : 'transparent',
                    color: activeTab === 'audit' ? '#fff' : 'inherit',
                    border: activeTab === 'audit' ? 'none' : (`1px solid ${themeColors.border}`),
                    cursor: 'pointer',
                    marginRight: 8
                  }}
                >
                  Audit Log
                </button>
              </>
            )}
            
            {/* Projecten - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('projects')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'projects' ? '#667eea' : 'transparent',
                  color: activeTab === 'projects' ? '#fff' : 'inherit',
                  border: activeTab === 'projects' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Projecten
              </button>
            )}
            
            {/* Dashboard - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'dashboard' ? '#667eea' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : 'inherit',
                  border: activeTab === 'dashboard' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Dashboard
              </button>
            )}

            {/* Analytics Dashboard - docent, toa, expert */}
            {user && ['teacher','toa','expert'].includes(user.role) && (
              <button
                onClick={() => setActiveTab('analytics')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'analytics' ? '#667eea' : 'transparent',
                  color: activeTab === 'analytics' ? '#fff' : 'inherit',
                  border: activeTab === 'analytics' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Analytics
              </button>
            )}
            
            {/* User Management - alleen voor full staff */}
            {user && isStaff && (
              <button
                onClick={() => setActiveTab('users')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'users' ? '#667eea' : 'transparent',
                  color: activeTab === 'users' ? '#fff' : 'inherit',
                  border: activeTab === 'users' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Gebruikers
              </button>
            )}
            
            {/* Team Dashboard - alleen voor team accounts */}
            {user && user.role === 'team' && (
              <button
                onClick={() => setActiveTab('team')}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'team' ? '#667eea' : 'transparent',
                  color: activeTab === 'team' ? '#fff' : 'inherit',
                  border: activeTab === 'team' ? 'none' : `1px solid ${themeColors.border}`,
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Team Dashboard
              </button>
            )}
            
            {/* Test Environment - alleen voor admin */}
            {user && user.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('test')
                  loadTestData()
                }}
                style={{ 
                  padding: '12px 24px', 
                  background: activeTab === 'test' ? '#f59e0b' : 'transparent',
                  color: activeTab === 'test' ? '#fff' : 'inherit',
                  border: activeTab === 'test' ? 'none' : ("1px solid ${themeColors.border}"),
                  cursor: 'pointer'
                }}
              >
                🧪 Test Environment
              </button>
            )}
          </div>

          {feedback && (
            <div style={{
              margin: '12px 0',
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${themeColors.border}`,
              background: feedback.type === 'success' ? '#ecfdf5' : feedback.type === 'error' ? '#fef2f2' : '#eef2ff',
              color: feedback.type === 'success' ? '#065f46' : feedback.type === 'error' ? '#991b1b' : '#1f2937',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{feedback.message}</span>
              <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>Sluit</button>
            </div>
          )}

          {/* TAB: TOA - Aankoopaanvragen */}
          {activeTab === 'toa' && user && user.role === 'toa' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Aankoopaanvragen</h2>
                <button
                  onClick={() => loadPurchaseRequests()}
                  style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${themeColors.border}`, background: 'transparent', cursor: 'pointer' }}
                >
                  Refresh
                </button>
              </div>
              {purchaseRequests.length === 0 ? (
                <p>Geen openstaande aanvragen.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Artikelnummer</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Urgentie</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Benodigd voor</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Categorie</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Aangevraagd door</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Links</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Datum</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Status</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Reden afwijzing</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRequests.map(pr => (
                      <tr key={pr.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                        <td style={{ padding: 12, fontWeight: 'bold' }}>{pr.onderdeel_name || pr.onderdeel_name}</td>
                        <td style={{ padding: 12 }}>{pr.onderdeel_sku || '-'}</td>
                        <td style={{ padding: 12 }}>{pr.urgency || 'normaal'}</td>
                        <td style={{ padding: 12 }}>{pr.needed_by || '-'}</td>
                        <td style={{ padding: 12 }}>{pr.category_name ? `${pr.category_name}${pr.category_start_date ? ` (start ${pr.category_start_date})` : ''}` : '-'}</td>
                        <td style={{ padding: 12 }}>{pr.requested_by}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{pr.qty}</td>
                        <td style={{ padding: 12 }}>
                          {pr.links && pr.links.map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                              {l.name}
                            </a>
                          ))}
                        </td>
                        <td style={{ padding: 12 }}>{new Date(pr.created_at).toLocaleString('nl-NL')}</td>
                        <td style={{ padding: 12, textTransform: 'capitalize' }}>{pr.status}</td>
                        <td style={{ padding: 12 }}>
                          <input
                            type="text"
                            placeholder="Reden (verplicht bij afwijzen)"
                            value={purchaseDenyReasons[pr.id] || ''}
                            onChange={(e) => setPurchaseDenyReasons((prev) => ({ ...prev, [pr.id]: e.target.value }))}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${themeColors.border}` }}
                          />
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {pr.status === 'open' && (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button onClick={async () => {
                                try {
                                  const res = await fetch(apiUrl(`/api/purchase_requests/${pr.id}/ordered`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userRole: user?.role, decided_by: user?.id }) })
                                  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Mislukt')
                                  setFeedback({ type: 'success', message: 'Gemarkeerd als besteld.' }); loadPurchaseRequests();
                                } catch (e) { setError(e.message) }
                              }} style={{ padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Besteld</button>
                              <button onClick={async () => {
                                try {
                                  const reason = (purchaseDenyReasons[pr.id] || '').trim()
                                  if (!reason) { setError('Reden is verplicht bij afwijzen.'); return; }
                                  const res = await fetch(apiUrl(`/api/purchase_requests/${pr.id}/deny`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userRole: user?.role, decided_by: user?.id, reason }) })
                                  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Mislukt')
                                  setFeedback({ type: 'success', message: 'Aanvraag afgewezen.' }); loadPurchaseRequests();
                                } catch (e) { setError(e.message) }
                              }} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Afwijzen</button>
                            </div>
                          )}
                          {pr.status === 'ordered' && (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button onClick={async () => {
                                try {
                                  const res = await fetch(apiUrl(`/api/purchase_requests/${pr.id}/received`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userRole: user?.role, decided_by: user?.id }) })
                                  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Mislukt')
                                  setFeedback({ type: 'success', message: 'Ontvangen en voorraad bijgewerkt.' }); loadPurchaseRequests(); loadOnderdelen();
                                } catch (e) { setError(e.message) }
                              }} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Ontvangen</button>
                              <button onClick={async () => {
                                try {
                                  const reason = (purchaseDenyReasons[pr.id] || '').trim()
                                  if (!reason) { setError('Reden is verplicht bij afwijzen.'); return; }
                                  const res = await fetch(apiUrl(`/api/purchase_requests/${pr.id}/deny`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userRole: user?.role, decided_by: user?.id, reason }) })
                                  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Mislukt')
                                  setFeedback({ type: 'success', message: 'Aanvraag afgewezen.' }); loadPurchaseRequests();
                                } catch (e) { setError(e.message) }
                              }} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Afwijzen</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: Onverdeelde Onderdelen (staff + experts) */}
          {activeTab === 'unassigned' && user && (isStaff || isExpert) && (
            <div>
              <div style={{ marginTop: 12 }}>
                {/* Pagination bovenaan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setUnassignedPage((p) => Math.max(1, p - 1))}
                    disabled={unassignedPage === 1}
                    style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${themeColors.border}`, background: unassignedPage === 1 ? '#ccc' : 'transparent', cursor: unassignedPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Vorige
                  </button>
                  <div style={{ fontSize: 13, color: themeColors.textSecondary }}>
                    Pagina {unassignedPage} van {Math.max(1, Math.ceil(filteredUnassigned.length / UNASSIGNED_PAGE_SIZE))} (totaal {filteredUnassigned.length})
                  </div>
                  <button
                    onClick={() => setUnassignedPage((p) => Math.min(Math.ceil(filteredUnassigned.length / UNASSIGNED_PAGE_SIZE), p + 1))}
                    disabled={unassignedPage >= Math.ceil(filteredUnassigned.length / UNASSIGNED_PAGE_SIZE)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${themeColors.border}`, background: unassignedPage >= Math.ceil(filteredUnassigned.length / UNASSIGNED_PAGE_SIZE) ? '#ccc' : 'transparent', cursor: unassignedPage >= Math.ceil(filteredUnassigned.length / UNASSIGNED_PAGE_SIZE) ? 'not-allowed' : 'pointer' }}
                  >
                    Volgende
                  </button>
                </div>

                <h2>Onverdeelde Onderdelen</h2>
                <p style={{ color: themeColors.textSecondary, fontSize: 14 }}>Onderdelen die van teams/projecten zijn gehaald en teruggelegd moeten worden.</p>

                {/* Advanced Filters */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: 12, background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Project</label>
                    <select value={unassignedFilters.project} onChange={(e) => setUnassignedFilters({...unassignedFilters, project: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                      <option value="">Alle</option>
                      {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Van datum</label>
                    <input type="date" value={unassignedFilters.dateFrom} onChange={(e) => setUnassignedFilters({...unassignedFilters, dateFrom: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Tot datum</label>
                    <input type="date" value={unassignedFilters.dateTo} onChange={(e) => setUnassignedFilters({...unassignedFilters, dateTo: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={() => setUnassignedFilters({ project: '', dateFrom: '', dateTo: '' })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
                  </div>
                </div>

                {filteredUnassigned.length === 0 ? (
                  <p>Geen onverdeelde onderdelen.</p>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${themeColors.border}`, color: themeColors.text }}>
                          <th style={{ textAlign: 'left', padding: 8 }}>Onderdeel</th>
                          <th style={{ textAlign: 'left', padding: 8 }}>Project</th>
                          <th style={{ textAlign: 'center', padding: 8 }}>Aantal</th>
                          <th style={{ textAlign: 'left', padding: 8 }}>Vrijgegeven</th>
                          {(isStaff || isExpert) && <th style={{ textAlign: 'center', padding: 8 }}>Acties</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnassigned
                          .slice((unassignedPage - 1) * UNASSIGNED_PAGE_SIZE, unassignedPage * UNASSIGNED_PAGE_SIZE)
                          .map((item) => (
                            <tr key={item.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                              <td style={{ padding: 8 }}>
                                <strong>{item.onderdeel_name}</strong>
                                {item.onderdeel_sku && <span style={{ fontSize: 12, color: themeColors.textSecondary }}> ({item.onderdeel_sku})</span>}
                              </td>
                              <td style={{ padding: 8 }}>{item.project_name || 'Onbekend'}</td>
                              <td style={{ textAlign: 'center', padding: 8 }}>{item.qty}</td>
                              <td style={{ padding: 8 }}>{item.decided_at ? new Date(item.decided_at).toLocaleString('nl-NL') : new Date(item.created_at).toLocaleString('nl-NL')}</td>
                              {(isStaff || isExpert) && (
                                <td style={{ textAlign: 'center', padding: 8 }}>
                                  <button onClick={() => handleReturnUnassigned(item.id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Teruggelegd</button>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: Webshop Grid View */}
          {activeTab === 'shop' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Onderdelen Overzicht</h2>
            <input
              type="text"
              placeholder="Zoek onderdeel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: 10, width: 350, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
            />
          </div>

          {/* Advanced Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Categorie</label>
              <select value={shopFilters.category} onChange={(e) => setShopFilters({...shopFilters, category: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Locatie</label>
              <input type="text" placeholder="Bijv. Kast A1" value={shopFilters.location} onChange={(e) => setShopFilters({...shopFilters, location: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, width: 150 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={shopFilters.lowStock} onChange={(e) => setShopFilters({...shopFilters, lowStock: e.target.checked})} />
                Lage voorraad
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={shopFilters.favoritesOnly} onChange={(e) => setShopFilters({...shopFilters, favoritesOnly: e.target.checked})} />
                Favorieten
              </label>
            </div>
            {(isStaff || isExpert) && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={shopFilters.takenHome} onChange={(e) => setShopFilters({...shopFilters, takenHome: e.target.checked})} />
                  Mee naar huis
                </label>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setShopFilters({ category: '', location: '', lowStock: false, takenHome: false, favoritesOnly: false })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          {loading ? (
            <p>Laden...</p>
          ) : (() => {
            // Visible parts: toon alle items met > 0 beschikbaar
            const visibleParts = filteredShopParts
            
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
                    border: `1px solid ${themeColors.border}`, 
                    borderRadius: 12, 
                    padding: 20,
                    background: themeColors.bgAlt,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    color: themeColors.text
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
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <FavoriteButton
                      onderdeel_id={part.id}
                      user={user}
                      favorites={favorites}
                      onFavoriteChange={handleFavoriteChange}
                    />
                    {isStaff && part.low_stock_warning === 1 && (
                      <div style={{ 
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
                  </div>

                  {part.image_url && (
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <img src={part.image_url} alt={part.name} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, border: `1px solid ${themeColors.border}` }} />
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{part.name}</h3>
                    {part.artikelnummer && (
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 8 }}>
                        #{part.artikelnummer}
                      </div>
                    )}
                    {part.description && (
                      <p style={{ 
                        margin: '8px 0', 
                        fontSize: 13, 
                        color: themeColors.textSecondary,
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
                        {isStudentLike ? 'Status' : 'Beschikbaar'}
                      </div>
                      <div style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        color: part.available_quantity < lowStockThreshold ? '#f59e0b' : '#10b981' 
                      }}>
                        {isStudentLike 
                          ? (part.available_quantity < 3 ? 'Lage voorraad' : 'Op voorraad') 
                          : part.available_quantity}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 4 }}>Locatie</div>
                      <div style={{ fontSize: 14, fontWeight: '500' }}>
                        {part.location || 'Onbekend'}
                      </div>
                    </div>
                    <div>
                      {(part.ordered_quantity > 0 || part.requested_quantity > 0) && (
                        <div style={{ fontSize: 12, color: themeColors.textSecondary }}>
                          {part.ordered_quantity > 0 && <span style={{ marginRight: 8 }}>In bestelling: {part.ordered_quantity}</span>}
                          {part.requested_quantity > 0 && <span>Aangevraagd: {part.requested_quantity}</span>}
                        </div>
                      )}
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
                  background: themeColors.bgAlt, 
                  borderRadius: 12, 
                  padding: 32,
                  maxWidth: 600,
                  width: '90%',
                  maxHeight: '80vh',
                  overflow: 'auto',
                  border: `1px solid ${themeColors.border}`,
                  color: themeColors.text
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0' }}>{modalPart.name}</h2>
                    {modalPart.artikelnummer && (
                      <div style={{ fontSize: 14, color: themeColors.textSecondary }}>
                        Artikelnummer: {modalPart.artikelnummer}
                      </div>
                    )}
                  </div>
                  {modalPart.image_url && (
                    <div style={{ marginLeft: 12 }}>
                      <img src={modalPart.image_url} alt={modalPart.name} style={{ maxWidth: 180, maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: `1px solid ${themeColors.border}` }} />
                    </div>
                  )}
                  <button
                    onClick={() => setModalPart(null)}
                    style={{
                      background: 'transparent',
                      border: ("1px solid ${themeColors.border}"),
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
                    <p style={{ margin: 0, color: themeColors.textSecondary }}>
                      {modalPart.description}
                    </p>
                  </div>
                )}

                {isStudentLike ? (
                  // Student view: status + locatie
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 16,
                    marginBottom: 24
                  }}>
                    <div style={{
                      padding: 16,
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Status</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: modalPart.available_quantity > 0 ? '#10b981' : '#ef4444' }}>
                        {modalPart.available_quantity > 0 ? 'Op voorraad' : 'Niet beschikbaar'}
                      </div>
                    </div>
                    <div style={{
                      padding: 16,
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Locatie</div>
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
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Totaal</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>{modalPart.total_quantity}</div>
                    </div>
                    <div style={{
                      padding: 16,
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Gereserveerd</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>{modalPart.reserved_quantity}</div>
                    </div>
                    <div style={{
                      padding: 16,
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Beschikbaar</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: modalPart.available_quantity < lowStockThreshold ? '#f59e0b' : '#10b981' }}>
                        {modalPart.available_quantity}
                      </div>
                    </div>
                    <div style={{
                      padding: 16,
                      background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))',
                      borderRadius: 8,
                      border: '1px solid var(--vscode-panel-border, #eee)'
                    }}>
                      <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Locatie</div>
                      <div style={{ fontSize: 18, fontWeight: '500' }}>{modalPart.location || 'Onbekend'}</div>
                    </div>
                    {(isStaff || isExpert) && (modalPart.ordered_quantity > 0 || modalPart.requested_quantity > 0) && (
                      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: themeColors.textSecondary }}>
                        {modalPart.ordered_quantity > 0 && <span style={{ marginRight: 8 }}>In bestelling: {modalPart.ordered_quantity}</span>}
                        {modalPart.requested_quantity > 0 && <span>Aangevraagd: {modalPart.requested_quantity}</span>}
                      </div>
                    )}
                  </div>
                )}

                {modalPart.low_stock_warning === 1 && isStaff && (
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

      {/* TAB: Audit Log */}
      {activeTab === 'audit' && user && ['teacher','toa','expert'].includes(user.role) && (
        <div>
          <h2>Audit Log</h2>
          <p style={{ color: themeColors.textSecondary, fontSize: 14 }}>Overzicht van acties met gebruiker en details.</p>
          
          {/* Advanced Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Actie</label>
              <input type="text" placeholder="Bijv. part:created" value={auditFilters.action} onChange={(e) => setAuditFilters({...auditFilters, action: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, width: 150 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Gebruiker</label>
              <input type="text" placeholder="Naam" value={auditFilters.user} onChange={(e) => setAuditFilters({...auditFilters, user: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, width: 150 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Van datum</label>
              <input type="date" value={auditFilters.dateFrom} onChange={(e) => setAuditFilters({...auditFilters, dateFrom: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Tot datum</label>
              <input type="date" value={auditFilters.dateTo} onChange={(e) => setAuditFilters({...auditFilters, dateTo: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setAuditFilters({ action: '', user: '', dateFrom: '', dateTo: '' })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          {console.log('[AUDIT TAB RENDER] This should show when activeTab is audit!', { auditRowsCount: auditRows.length })}
          {filteredAuditRows.length === 0 ? (
            <p>Geen logs gevonden.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Tijd</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Actie</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Gebruiker</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditRows.map(row => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                    <td style={{ padding: 12 }}>{new Date(row.created_at).toLocaleString('nl-NL')}</td>
                    <td style={{ padding: 12 }}>{row.action}</td>
                    <td style={{ padding: 12 }}>{row.actor_name || '-'}</td>
                    <td style={{ padding: 12 }}>
                      <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>{row.details ? JSON.stringify(row.details) : '-'}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button onClick={() => { const p = Math.max(1, auditPage - 1); setAuditPage(p); loadAudit(p); }} disabled={auditPage === 1} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${themeColors.border}` }}>Vorige</button>
            <span style={{ color: themeColors.textSecondary }}>Pagina {auditPage}</span>
            <button onClick={() => { const p = auditPage + 1; setAuditPage(p); loadAudit(p); }} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${themeColors.border}` }}>Volgende</button>
          </div>
        </div>
      )}

      {/* GLOBAL DEBUG - always rendered */}
      {console.log('[GLOBAL DEBUG]', { activeTab, user: !!user, userRole: user?.role, auditRowsCount: auditRows.length })}

      {/* TAB: Onderdelen Lijst */}
      {activeTab === 'list' && (
        <div>
          {user && user.role === 'toa' && (
            <div style={{ marginBottom: 24, padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
              <h3 style={{ marginTop: 0 }}>Aankoopaanvragen (TOA Overzicht)</h3>
              {purchaseRequests.length === 0 ? (
                <p>Geen openstaande aanvragen.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Artikelnummer</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Urgentie</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Benodigd voor</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Categorie</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Aangevraagd door</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Links</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRequests.map(pr => (
                      <tr key={pr.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                        <td style={{ padding: 12, fontWeight: 'bold' }}>{pr.onderdeel_name || pr.onderdeel_name}</td>
                        <td style={{ padding: 12 }}>{pr.onderdeel_sku || '-'}</td>
                        <td style={{ padding: 12 }}>{pr.urgency || 'normaal'}</td>
                        <td style={{ padding: 12 }}>{pr.needed_by || '-'}</td>
                        <td style={{ padding: 12 }}>{pr.category_name ? `${pr.category_name}${pr.category_start_date ? ` (start ${pr.category_start_date})` : ''}` : '-'}</td>
                        <td style={{ padding: 12 }}>{pr.requested_by}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{pr.qty}</td>
                        <td style={{ padding: 12 }}>
                          {pr.links && pr.links.map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ marginRight: 8, color: '#667eea', textDecoration: 'none' }}>
                              {l.name}
                            </a>
                          ))}
                        </td>
                        <td style={{ padding: 12 }}>{new Date(pr.created_at).toLocaleString('nl-NL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

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
          
          {/* Advanced Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Categorie</label>
              <select value={listFilters.category} onChange={(e) => setListFilters({...listFilters, category: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Locatie</label>
              <input type="text" placeholder="Bijv. Kast A1" value={listFilters.location} onChange={(e) => setListFilters({...listFilters, location: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, width: 150 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={listFilters.lowStock} onChange={(e) => setListFilters({...listFilters, lowStock: e.target.checked})} />
                Lage voorraad
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setListFilters({ category: '', location: '', lowStock: false })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          {loading ? (
            <p>Laden...</p>
          ) : filteredListParts.length === 0 ? (
            <p>Geen onderdelen gevonden.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Naam</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Artikelnummer</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Locatie</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Totaal</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Aangevraagd</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Gereserveerd</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Beschikbaar</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredListParts.map((part) => (
                  <tr key={part.id} style={{ borderBottom: `1px solid ${themeColors.border}`, background: selectedPart?.id === part.id ? (isDarkMode ? '#2a3a52' : '#eef2ff') : 'transparent', color: themeColors.text }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{part.name}</strong>
                        {isStaff && part.low_stock_warning === 1 && (
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
                        {(part.ordered_quantity > 0 || part.requested_quantity > 0) && (
                          <span style={{ 
                            background: themeColors.overlay,
                            color: themeColors.textSecondary,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11
                          }}>
                            {part.ordered_quantity > 0 ? `In bestelling: ${part.ordered_quantity}` : ''}
                            {part.ordered_quantity > 0 && part.requested_quantity > 0 ? ' · ' : ''}
                            {part.requested_quantity > 0 ? `Aangevraagd: ${part.requested_quantity}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{part.artikelnummer || '-'}</td>
                    <td style={{ padding: 12 }}>{part.location || '-'}</td>
                    <td style={{ textAlign: 'center', padding: 12 }}>{part.total_quantity}</td>
                    <td style={{ textAlign: 'center', padding: 12, color: '#2563eb', fontWeight: 'bold' }}>
                      {part.requested_quantity ?? 0}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontWeight: 'bold' }}>
                      {part.reserved_quantity}
                    </td>
                    <td style={{ textAlign: 'center', padding: 12, color: part.available_quantity < lowStockThreshold ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
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
                        {['teacher','toa'].includes(user?.role) && (
                          purchaseFormOpenPartId === part.id ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 8, alignItems: 'end' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aantal</label>
                                <input type="number" min="1" value={purchaseForm.qty} onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) || 1 })} style={{ width: 80, padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}` }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Urgentie</label>
                                <select value={purchaseForm.urgency} onChange={(e) => setPurchaseForm({ ...purchaseForm, urgency: e.target.value })} style={{ padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}` }}>
                                  <option value="laag">laag</option>
                                  <option value="normaal">normaal</option>
                                  <option value="hoog">hoog</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Benodigd voor</label>
                                <input type="date" value={purchaseForm.needed_by} onChange={(e) => setPurchaseForm({ ...purchaseForm, needed_by: e.target.value })} style={{ padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}` }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Categorie</label>
                                <select value={purchaseForm.category_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, category_id: e.target.value })} style={{ padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}` }}>
                                  <option value="">(geen)</option>
                                  {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { handleCreatePurchaseRequest(part.id, purchaseForm.qty, purchaseForm); setPurchaseFormOpenPartId(null); setPurchaseForm({ qty: 1, urgency: 'normaal', needed_by: '', category_id: '' }) }} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Plaats aanvraag</button>
                                <button onClick={() => { setPurchaseFormOpenPartId(null); setPurchaseForm({ qty: 1, urgency: 'normaal', needed_by: '', category_id: '' }) }} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Annuleer</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setPurchaseFormOpenPartId(part.id)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Bestellen aankoop</button>
                          )
                        )}
                        {/* Verwijder knop alleen voor personeel (teacher/admin/TOA) */}
                        {isStaff && (
                          confirmDeletePartId === part.id ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => { handleDeletePart(part.id); setConfirmDeletePartId(null) }} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Bevestig</button>
                              <button onClick={() => setConfirmDeletePartId(null)} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Annuleer</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeletePartId(part.id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Verwijder</button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedPart && (
            <div style={{ marginTop: 24, padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))' }}>
              <h3>Onderdeel Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div><strong>Naam:</strong> {selectedPart.name}</div>
                <div><strong>Artikelnummer:</strong> {selectedPart.artikelnummer || '-'}</div>
                <div><strong>Locatie:</strong> {selectedPart.location || '-'}</div>
                <div><strong>Beschrijving:</strong> {selectedPart.description || '-'}</div>
                <div><strong>Gereserveerd:</strong> {selectedPart.reserved_quantity}</div>
                <div><strong>Beschikbaar:</strong> {selectedPart.available_quantity}</div>
              </div>

              {/* Update alleen voor personeel (teacher/admin/TOA) */}
              {isStaff && (
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
                    <div style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 4 }}>
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
                    border: ("1px solid ${themeColors.border}"),
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

      {/* TAB: Teams beheer (staff + experts) */}
      {activeTab === 'teams' && (
        <div>
          <h2>Teams Beheer</h2>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={{ padding: 10, fontSize: 14, borderRadius: 4, border: `1px solid ${themeColors.border}`, minWidth: 260, background: themeColors.inputBg, color: themeColors.inputText }}
            >
              <option value="">-- Kies een team --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {(t.open_advice_count > 0 || t.pending_request_count > 0) ? '🟡 ' : ''}{t.name}{t.team_username ? ` (login: ${t.team_username})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                loadTeams()
                if (selectedTeamId) loadManagedTeam(selectedTeamId)
              }}
              style={{ padding: '10px 14px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
            >
              Herlaad
            </button>
          </div>

          {managedAdviceLoading && <p>Bezig met laden...</p>}

          {!selectedTeamId && <p>Kies een team om details te bekijken.</p>}

          {managedTeam && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Team</div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{managedTeam.project.name}</div>
                {managedTeam.project.team_username && (
                  <div style={{ fontSize: 13, color: themeColors.textSecondary }}>Account: {managedTeam.project.team_username}</div>
                )}
              </div>
              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Categorie</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{managedTeam.project.category_name || 'Onbekend'}</div>
                {managedTeam.project.category_start_date && (
                  <div style={{ fontSize: 13, color: themeColors.textSecondary }}>Start: {managedTeam.project.category_start_date}</div>
                )}
              </div>
              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Kluisjesnummer</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{managedTeam.project.locker_number || 'n.v.t.'}</div>
              </div>
              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <div style={{ fontSize: 12, color: themeColors.textSecondary, marginBottom: 4 }}>Reserveringen</div>
                <div style={{ fontSize: 16 }}>Actief: {managedTeam.stats.totalActive}</div>
                <div style={{ fontSize: 16 }}>Totaal: {managedTeam.stats.totalReserved}</div>
              </div>
            </div>
          )}

          {managedTeam && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <h3 style={{ marginTop: 0 }}>Pending aanvragen</h3>
                {managedTeam.pending.length === 0 ? (
                  <p>Geen openstaande aanvragen.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {managedTeam.pending.map((p) => (
                      <li key={p.id} style={{ borderBottom: `1px solid ${themeColors.border}`, padding: '8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div>
                            <strong>{p.onderdeel_name}</strong> ({p.qty} st.)
                            <div style={{ fontSize: 12, color: themeColors.textSecondary }}>SKU: {p.onderdeel_sku || 'n.v.t.'}</div>
                            <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Aangevraagd: {new Date(p.created_at).toLocaleString('nl-NL')}</div>
                            {p.request_note && (
                              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4, fontStyle: 'italic' }}>💬 Team: {p.request_note}</div>
                            )}
                            {p.status === 'denied' && p.decision_reason && (
                              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontStyle: 'italic' }}>❌ Afkeuring: {p.decision_reason}</div>
                            )}
                          </div>
                          {isStaff && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <button onClick={() => handleApproveRequest(p.id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Goedkeuren</button>
                              <button onClick={() => { setCounterOfferRequestId(p.id); setCounterOfferForm({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' }) }} style={{ padding: '6px 10px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Tegenadvies</button>
                              {denyPendingRequestId === p.id ? (
                                <>
                                  <input type="text" placeholder="Reden" value={denyPendingReason} onChange={(e) => setDenyPendingReason(e.target.value)} style={{ padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                                  <button onClick={() => handleDenyRequest(p.id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Afwijzen</button>
                                  <button onClick={() => { setDenyPendingRequestId(null); setDenyPendingReason('') }} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer' }}>Annuleer</button>
                                </>
                              ) : (
                                <button onClick={() => { setDenyPendingRequestId(p.id); setDenyPendingReason('') }} style={{ padding: '6px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Afwijzen</button>
                              )}
                            </div>
                          )}

                          {counterOfferRequestId === p.id && (
                            <div style={{ gridColumn: '1/-1', padding: 12, background: themeColors.bgAlt, borderRadius: 6, border: `1px solid ${themeColors.border}` }}>
                              <h4 style={{ marginTop: 0 }}>Tegenadvies geven</h4>
                              <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Type</label>
                                  <select value={counterOfferForm.type} onChange={(e) => setCounterOfferForm({...counterOfferForm, type: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                                    <option value="proposal">Voorstel (team kan ja/nee zeggen)</option>
                                    <option value="forced">Verplichte wijziging (direct toegepast)</option>
                                  </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Aantal (optioneel)</label>
                                    <input type="number" min="1" placeholder={p.qty} value={counterOfferForm.new_qty} onChange={(e) => setCounterOfferForm({...counterOfferForm, new_qty: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Onderdeel (optioneel)</label>
                                    <select value={counterOfferForm.new_onderdeel_id} onChange={(e) => setCounterOfferForm({...counterOfferForm, new_onderdeel_id: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                                      <option value="">-- Origineel: {p.onderdeel_name} --</option>
                                      {onderdelen.filter(o => o.id !== p.onderdeel_id).map(o => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Opmerking (optioneel)</label>
                                  <textarea placeholder="Bijv. Alternatieven zijn ook geschikt..." value={counterOfferForm.note} onChange={(e) => setCounterOfferForm({...counterOfferForm, note: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, minHeight: 60 }} maxLength={500} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => handleCounterOffer(p.id)} style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Verstuur {counterOfferForm.type === 'forced' ? 'Verplichting' : 'Voorstel'}</button>
                                  <button onClick={() => { setCounterOfferRequestId(null); setCounterOfferForm({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' }) }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer' }}>Annuleer</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8, background: themeColors.bgAlt }}>
                <h3 style={{ marginTop: 0 }}>Actieve reserveringen</h3>
                {managedTeam.reservations.length === 0 ? (
                  <p>Geen actieve reserveringen.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}`, color: themeColors.text }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>Onderdeel</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Aantal</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Status</th>
                        {(isStaff || isExpert) && <th style={{ textAlign: 'center', padding: 8 }}>Acties</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {managedTeam.reservations.map((r) => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                          <td style={{ padding: 8 }}>
                            <strong>{r.onderdeel_name}</strong>
                            {r.onderdeel_sku && <span style={{ fontSize: 12, color: themeColors.textSecondary }}> ({r.onderdeel_sku})</span>}
                          </td>
                          <td style={{ textAlign: 'center', padding: 8 }}>{r.qty}</td>
                          <td style={{ textAlign: 'center', padding: 8 }}>{r.status}</td>
                          {(isStaff || isExpert) && (
                            <td style={{ textAlign: 'center', padding: 8 }}>
                              {r.status === 'active' ? (
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editReservationQty[r.id] ?? r.qty}
                                      onChange={(e) => setEditReservationQty({ ...editReservationQty, [r.id]: e.target.value })}
                                      style={{ width: 80, padding: 6, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                                    />
                                    <button onClick={() => handleUpdateReservationQty(r.id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Opslaan</button>
                                  </div>
                                  {isStaff && (
                                    confirmDeleteReservationId === r.id ? (
                                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                        <button onClick={() => { handleReleaseReservation(r.id); setConfirmDeleteReservationId(null) }} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Bevestig</button>
                                        <button onClick={() => setConfirmDeleteReservationId(null)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer' }}>Annuleer</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => setConfirmDeleteReservationId(r.id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Verwijder</button>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: themeColors.textSecondary }}>n.v.t.</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {managedTeam && (
            <div style={{ marginTop: 24, padding: 16, border: `1px solid ${themeColors.border}`, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Adviezen & Opmerkingen</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Advies / opmerking</label>
                  <textarea
                    value={managedAdviceForm.content}
                    onChange={(e) => setManagedAdviceForm({ ...managedAdviceForm, content: e.target.value })}
                    placeholder="Bijv. Gebruik kleinere motor, of bestel setje X..."
                    style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 6, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Onderdeel (optioneel)</label>
                  <select
                    value={managedAdviceForm.onderdeel_id}
                    onChange={(e) => setManagedAdviceForm({ ...managedAdviceForm, onderdeel_id: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                  >
                    <option value="">-- geen --</option>
                    {onderdelen.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.available_quantity} beschikbaar)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Aantal (optioneel)</label>
                  <input
                    type="number"
                    min="1"
                    value={managedAdviceForm.qty}
                    onChange={(e) => setManagedAdviceForm({ ...managedAdviceForm, qty: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                  />
                </div>
                <div>
                  <button
                    onClick={handleCreateAdvice}
                    disabled={managedAdviceLoading}
                    style={{ padding: '12px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', width: '100%', fontWeight: 'bold' }}
                  >
                    Voeg advies toe
                  </button>
                </div>
              </div>

              {managedTeam.advice.length === 0 ? (
                <p>Geen adviezen/opmerkingen.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {managedTeam.advice.map((a) => (
                    <div key={a.id} style={{ border: `1px solid ${themeColors.border}`, borderRadius: 8, padding: 12, background: themeColors.bgAlt }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <strong>{a.author_name || 'Onbekend'}</strong>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: '#eef2ff', color: '#1f2937', border: `1px solid ${themeColors.border}` }}>{a.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: themeColors.textSecondary }}>{new Date(a.created_at).toLocaleString('nl-NL')}</div>
                      </div>
                      <div style={{ marginBottom: 6 }}>{a.content}</div>
                      {a.onderdeel_name && (
                        <div style={{ fontSize: 13, color: themeColors.textSecondary }}>Onderdeel: {a.onderdeel_name} {a.qty ? `(${a.qty} st.)` : ''}</div>
                      )}
                      {a.status === 'adjusted' && (a.alt_onderdeel_name || a.alt_qty) && (
                        <div style={{ fontSize: 13, color: '#92400e' }}>Alternatief: {a.alt_onderdeel_name || 'ander onderdeel'} {a.alt_qty ? `(${a.alt_qty} st.)` : ''}</div>
                      )}
                      {a.decision_reason && (
                        <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Toelichting: {a.decision_reason}</div>
                      )}
                      {a.decided_by_name && (
                        <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Beslist door: {a.decided_by_name}</div>
                      )}

                      {isStaff && a.status === 'open' && a.onderdeel_id && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => handleApproveAdvice(a.id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Goedkeuren</button>
                          <button onClick={() => { setDenyAdviceId(a.id); setDenyReason('') }} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Afwijzen</button>
                          <button onClick={() => { setAdjustAdviceId(a.id); setAdjustForm({ search: '', alt_onderdeel_id: '', alt_qty: a.qty || '', reason: '' }) }} style={{ padding: '6px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Ander onderdeel</button>
                        </div>
                      )}

                      {denyAdviceId === a.id && a.onderdeel_id && (
                        <div style={{ marginTop: 8, padding: 10, border: `1px solid ${themeColors.border}`, borderRadius: 6, background: themeColors.bgAlt }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="text" placeholder="Reden voor afwijzing" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                            <button onClick={() => handleDenyAdvice(a.id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Opslaan</button>
                            <button onClick={() => { setDenyAdviceId(null); setDenyReason('') }} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer' }}>Annuleer</button>
                          </div>
                        </div>
                      )}

                      {adjustAdviceId === a.id && a.onderdeel_id && (
                        <div style={{ marginTop: 8, padding: 10, border: `1px solid ${themeColors.border}`, borderRadius: 6, background: themeColors.bgAlt }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Zoek onderdeel</label>
                              <input type="text" placeholder="Zoek op naam, artikelnummer of beschrijving" value={adjustForm.search} onChange={(e) => setAdjustForm({ ...adjustForm, search: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                              <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6, border: `1px solid ${themeColors.border}`, borderRadius: 4 }}>
                                {onderdelen.filter(p => p.available_quantity > 0).filter(p => {
                                  const q = adjustForm.search.trim().toLowerCase();
                                  if (!q) return true;
                                  return p.name.toLowerCase().includes(q) 
                                    || (p.artikelnummer || '').toLowerCase().includes(q)
                                    || (p.description || '').toLowerCase().includes(q);
                                }).slice(0, 20).map(p => (
                                  <div key={p.id} onClick={() => setAdjustForm({ ...adjustForm, alt_onderdeel_id: p.id })} style={{ padding: 8, cursor: 'pointer', background: adjustForm.alt_onderdeel_id === String(p.id) || adjustForm.alt_onderdeel_id === p.id ? (isDarkMode ? '#2a3a52' : '#eef2ff') : 'transparent' }}>
                                    <strong>{p.name}</strong> <span style={{ color: themeColors.textSecondary }}>({p.available_quantity} beschikbaar)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aantal</label>
                              <input type="number" min="1" value={adjustForm.alt_qty} onChange={(e) => setAdjustForm({ ...adjustForm, alt_qty: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Toelichting (optioneel)</label>
                              <input type="text" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleAdjustAdvice(a.id)} style={{ padding: '6px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Opslaan</button>
                              <button onClick={() => { setAdjustAdviceId(null); setAdjustForm({ search: '', alt_onderdeel_id: '', alt_qty: '', reason: '' }) }} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer' }}>Annuleer</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Aankoop Links (voor TOA)</label>
              <textarea
                placeholder="Bijv: https://bol.com/nl/p/arduino-uno/... (één per regel)"
                value={newPart.links}
                onChange={(e) => setNewPart({ ...newPart, links: e.target.value })}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', minHeight: 60, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
              <small style={{ color: themeColors.textSecondary }}>URLs die TOAs kunnen gebruiken om dit onderdeel te kopen (één per regel)</small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Foto/Afbeelding</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      setNewPart({ ...newPart, image_url: event.target?.result })
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                style={{ padding: 10, fontSize: 14, width: '100%', borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
              <small style={{ color: themeColors.textSecondary }}>Selecteer een afbeelding van het onderdeel</small>
              {newPart.image_url && (
                <div style={{ marginTop: 12, padding: 10, background: themeColors.bgAlt, borderRadius: 4 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, color: themeColors.textSecondary }}>Voorbeeld:</p>
                  <img src={newPart.image_url} alt="Preview" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4 }} />
                </div>
              )}
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
          {isStaff && (
            <div style={{ marginBottom: 24 }}>
              <h2>Ingediende Team Aanvragen</h2>
              {pendingRequests.length === 0 ? (
                <p>Geen openstaande team-aanvragen.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Project</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Aangevraagd</th>
                      <th style={{ textAlign: 'center', padding: 12 }}>Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((r) => (
                      <Fragment key={r.id}>
                        <tr style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text, background: r.counter_status === 'proposed' ? 'rgba(139,92,246,0.08)' : r.counter_status === 'declined' ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                          <td style={{ padding: 12 }}>
                            <strong>{r.onderdeel_name}</strong>
                            {r.onderdeel_sku && <span style={{ color: themeColors.textSecondary, fontSize: 12 }}> ({r.onderdeel_sku})</span>}
                            {r.request_note && (
                              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4, fontStyle: 'italic' }}>💬 Team: {r.request_note}</div>
                            )}
                            {r.status === 'denied' && r.decision_reason && (
                              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontStyle: 'italic' }}>❌ Afkeuring: {r.decision_reason}</div>
                            )}
                            {r.counter_status === 'proposed' && r.counter_onderdeel_name && (
                              <div style={{ fontSize: 12, color: '#8b5cf6', marginTop: 4 }}>Voorstel: {r.counter_onderdeel_name}</div>
                            )}
                            {r.counter_status === 'declined' && r.counter_response_note && (
                              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontStyle: 'italic' }}>❌ Team zegt nee: {r.counter_response_note}</div>
                            )}
                            {r.counter_status === 'accepted' && (
                              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>✅ Team geaccepteerd</div>
                            )}
                          </td>
                          <td style={{ padding: 12 }}>{r.project_name}</td>
                          <td style={{ textAlign: 'center', padding: 12, fontWeight: 'bold' }}>
                            {r.qty}
                            {r.counter_status === 'proposed' && r.counter_qty && r.counter_qty !== r.qty && (
                              <div style={{ fontSize: 12, color: '#8b5cf6' }}>→ {r.counter_qty}</div>
                            )}
                          </td>
                          <td style={{ padding: 12, fontSize: 12, color: themeColors.textSecondary }}>
                            {new Date(r.created_at).toLocaleString('nl-NL')}
                            {r.counter_note && (
                              <div style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>💬 {r.counter_note}</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: 12, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {!counterOfferRequestId ? (
                              <>
                                <button onClick={() => handleApproveRequest(r.id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Goedkeuren</button>
                                <button onClick={() => { setCounterOfferRequestId(r.id); setCounterOfferForm({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' }) }} style={{ padding: '6px 10px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Tegenadvies</button>
                                <button onClick={() => handleDenyRequest(r.id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Afwijzen</button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                        {counterOfferRequestId === r.id && (
                          <tr style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                            <td colSpan={5} style={{ padding: 12, background: themeColors.bgAlt }}>
                              <h4 style={{ marginTop: 0 }}>Tegenadvies geven</h4>
                              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Type</label>
                                  <select value={counterOfferForm.type} onChange={(e) => setCounterOfferForm({...counterOfferForm, type: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                                    <option value="proposal">Voorstel (team kan ja/nee zeggen)</option>
                                    <option value="forced">Verplichte wijziging (direct toegepast)</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Aantal (optioneel)</label>
                                  <input type="number" min="1" placeholder={r.qty} value={counterOfferForm.new_qty} onChange={(e) => setCounterOfferForm({...counterOfferForm, new_qty: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Onderdeel (optioneel)</label>
                                  <select value={counterOfferForm.new_onderdeel_id} onChange={(e) => setCounterOfferForm({...counterOfferForm, new_onderdeel_id: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                                    <option value="">-- Origineel: {r.onderdeel_name} --</option>
                                    {onderdelen.filter(o => o.id !== r.onderdeel_id).map(o => (
                                      <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Opmerking (optioneel)</label>
                                <textarea placeholder="Bijv. Alternatief is ook geschikt..." value={counterOfferForm.note} onChange={(e) => setCounterOfferForm({...counterOfferForm, note: e.target.value})} style={{ padding: 8, width: '100%', borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, minHeight: 60 }} maxLength={500} />
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button onClick={() => handleCounterOffer(r.id)} style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Verstuur {counterOfferForm.type === 'forced' ? 'Verplichting' : 'Voorstel'}</button>
                                <button onClick={() => { setCounterOfferRequestId(null); setCounterOfferForm({ type: 'proposal', new_qty: '', new_onderdeel_id: '', note: '' }) }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Annuleer</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <h2>Actieve Reserveringen</h2>
          
          {/* Advanced Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Project</label>
              <select value={reservationFilters.project} onChange={(e) => setReservationFilters({...reservationFilters, project: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Mee naar huis</label>
              <select value={reservationFilters.takenHome} onChange={(e) => setReservationFilters({...reservationFilters, takenHome: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                <option value="yes">Ja</option>
                <option value="no">Nee</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={reservationFilters.overdue} onChange={(e) => setReservationFilters({...reservationFilters, overdue: e.target.checked})} />
                Alleen te laat
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setReservationFilters({ project: '', takenHome: '', overdue: false })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          {filteredReservations.length === 0 ? (
            <p>Geen actieve reserveringen.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Project</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Aangemaakt</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Mee naar huis</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Uiterste datum</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Actie</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map((res) => {
                  const overdue = res.taken_home === 1 && res.due_date && new Date(res.due_date) < new Date();
                  return (
                  <Fragment key={res.id}>
                    <tr style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text, background: overdue ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                      <td style={{ padding: 12 }}>
                        <strong>{res.onderdeel_name}</strong>
                        {res.onderdeel_artikelnummer && <span style={{ color: themeColors.textSecondary, fontSize: 12 }}> ({res.onderdeel_artikelnummer})</span>}
                      </td>
                      <td style={{ padding: 12 }}>{res.project_name}</td>
                      <td style={{ textAlign: 'center', padding: 12, fontWeight: 'bold' }}>{res.aantal}</td>
                      <td style={{ padding: 12, fontSize: 12, color: themeColors.textSecondary }}>
                        {new Date(res.created_at).toLocaleString('nl-NL')}
                      </td>
                      <td style={{ textAlign: 'center', padding: 12 }}>
                        {(isStaff || isExpert) ? (
                          <input
                            type="checkbox"
                            checked={res.taken_home === 1}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                const body = {
                                  userRole: user?.role,
                                  user_id: user?.id,
                                  taken_home: checked,
                                  due_date: checked ? (res.due_date || '') : undefined
                                };
                                const resp = await fetch(apiUrl(`/api/reserveringen/${res.id}/home`), {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(body)
                                });
                                const data = await resp.json();
                                if (!resp.ok) throw new Error(data.error || 'Kon status niet bijwerken');
                                setFeedback({ type: 'success', message: checked ? 'Gemarkeerd als mee naar huis.' : 'Gemarkeerd als teruggebracht.' });
                                loadReserveringen();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          />
                        ) : (
                          <span style={{ color: themeColors.textSecondary }}>{res.taken_home === 1 ? 'Ja' : 'Nee'}</span>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {(isStaff || isExpert) ? (
                          <ReturnDatePicker
                            reservation={{ ...res, return_date: res.due_date }}
                            readOnly={false}
                            onReturnDateChange={async (newDate) => {
                              try {
                                const resp = await fetch(apiUrl(`/api/reserveringen/${res.id}/home`), {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userRole: user?.role, user_id: user?.id, taken_home: true, due_date: newDate })
                                });
                                const data = await resp.json();
                                if (!resp.ok) throw new Error(data.error || 'Kon datum niet bijwerken');
                                setFeedback({ type: 'success', message: 'Uiterste datum bijgewerkt.' });
                                loadReserveringen();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          />
                        ) : (
                          <span style={{ color: overdue ? '#ef4444' : themeColors.textSecondary }}>
                            {res.due_date ? new Date(res.due_date).toLocaleDateString('nl-NL') : '-'}
                          </span>
                        )}
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
                    {user && (
                      <tr>
                        <td colSpan={7} style={{ padding: '8px 12px', background: themeColors.bgAlt }}>
                          <ReservationNotes reservation_id={res.id} user={user} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );})}
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

          {/* Advanced Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Categorie</label>
              <select value={projectFilters.category} onChange={(e) => setProjectFilters({...projectFilters, category: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>Heeft reserveringen</label>
              <select value={projectFilters.hasReservations} onChange={(e) => setProjectFilters({...projectFilters, hasReservations: e.target.value})} style={{ padding: 8, fontSize: 13, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}>
                <option value="">Alle</option>
                <option value="yes">Ja</option>
                <option value="no">Nee</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => setProjectFilters({ category: '', hasReservations: '' })} style={{ padding: '8px 12px', fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          <h3>Bestaande Projecten</h3>
          {filteredProjects.length === 0 ? (
            <p>Geen projecten aangemaakt.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {filteredProjects.map((proj) => (
                <li 
                  key={proj.id} 
                  style={{ 
                    padding: 12, 
                    background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
                    marginBottom: 8, 
                    borderRadius: 6,
                    border: '1px solid #e0e0e0'
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
                        style={{ padding: '6px 10px', border: ("1px solid ${themeColors.border}"), background: 'transparent', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                      >
                        Onderdelen
                      </button>
                      {confirmDeleteProjectId === proj.id ? (
                        <>
                          <button onClick={() => { handleDeleteProject(proj.id); setConfirmDeleteProjectId(null) }} style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Bevestig</button>
                          <button onClick={() => setConfirmDeleteProjectId(null)} style={{ padding: '6px 10px', border: `1px solid ${themeColors.border}`, background: 'transparent', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Annuleer</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteProjectId(proj.id)} style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Verwijder</button>
                      )}
                    </div>
                  </div>

                  {projectParts[proj.id] && projectParts[proj.id].length === 0 && (
                    <div style={{ marginTop: 8, color: themeColors.textSecondary, fontSize: 13 }}>Geen onderdelen gereserveerd voor dit project.</div>
                  )}
                  {projectParts[proj.id] && projectParts[proj.id].length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
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
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 12, maxWidth: 800, marginBottom: 16, alignItems: 'end', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Categorie naam..."
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              required
              style={{ flex: 1, padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
            />
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Startdatum</label>
              <input
                type="date"
                value={newCategory.start_date || ''}
                onChange={(e) => setNewCategory({ ...newCategory, start_date: e.target.value })}
                style={{ padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Einddatum</label>
              <input
                type="date"
                value={newCategory.end_date || ''}
                onChange={(e) => setNewCategory({ ...newCategory, end_date: e.target.value })}
                style={{ padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
              />
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
              Toevoegen
            </button>
          </form>

          {categories.length === 0 ? (
            <p>Geen categorieën.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {categories.map((cat) => (
                <li key={cat.id} style={{ padding: 10, background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', marginBottom: 8, borderRadius: 6, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span>
                    <strong>{cat.name}</strong>
                    <span style={{ marginLeft: 8, color: themeColors.textSecondary, fontSize: 12 }}>
                      {cat.start_date ? `Start: ${cat.start_date}` : ''}
                      {cat.end_date ? ` · Eind: ${cat.end_date}` : ''}
                    </span>
                  </span>
                  {confirmDeleteCategoryId === cat.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { handleDeleteCategory(cat.id); setConfirmDeleteCategoryId(null) }} style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Bevestig</button>
                      <button onClick={() => setConfirmDeleteCategoryId(null)} style={{ padding: '6px 10px', border: `1px solid ${themeColors.border}`, background: 'transparent', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Annuleer</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteCategoryId(cat.id)} style={{ padding: '6px 10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}>Verwijder</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* TAB: Dashboard */}
      {activeTab === 'dashboard' && user && isStaff && (
        <div>
          <h2>Systeem Dashboard</h2>
          {/* Overdue warnings */}
          <OverdueBanner role={user.role} themeColors={themeColors} />
          {user.role === 'admin' && (
            <div style={{ margin: '12px 0 24px', display: 'flex', gap: 12 }}>
              <button onClick={handleBackup} style={{ padding: '10px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                💾 Back-up database nu
              </button>
              <div style={{ color: themeColors.textSecondary, fontSize: 12, alignSelf: 'center' }}>
                Wekelijkse automatische back-up: iedere maandag 09:00
              </div>
            </div>
          )}

          {user.role === 'admin' && (
            <div style={{ marginBottom: 24, padding: 16, background: themeColors.bgAlt, borderRadius: 8, border: `1px solid ${themeColors.border}` }}>
              <h3 style={{ marginTop: 0 }}>Backup Beheer</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ flex: '1 1 300px' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Upload en merge oudere backup</label>
                  <input
                    type="file"
                    accept=".db"
                    onChange={(e) => setSelectedBackupFile(e.target.files?.[0] || null)}
                    style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                  />
                  <button
                    onClick={handleMergeBackup}
                    disabled={!selectedBackupFile}
                    style={{
                      marginTop: 8,
                      padding: '8px 16px',
                      background: selectedBackupFile ? '#667eea' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: selectedBackupFile ? 'pointer' : 'not-allowed'
                    }}
                  >
                    🔄 Merge en verwerk
                  </button>
                  <small style={{ display: 'block', marginTop: 4, color: themeColors.textSecondary }}>
                    Selecteer een .db bestand van een oudere server versie. Gegevens worden intelligent samengevoegd.
                  </small>
                </div>
              </div>

              <h4 style={{ marginTop: 16, marginBottom: 12 }}>Beschikbare backups</h4>
              {backupFiles.length === 0 ? (
                <p style={{ color: themeColors.textSecondary }}>Geen backups gevonden.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${themeColors.border}`, backgroundColor: themeColors.overlay }}>
                      <th style={{ textAlign: 'left', padding: 8 }}>Bestandsnaam</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Datum</th>
                      <th style={{ textAlign: 'center', padding: 8 }}>Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupFiles.map((bf, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: 8 }}>{bf.name}</td>
                        <td style={{ padding: 8 }}>{new Date(bf.date).toLocaleString('nl-NL')}</td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <button
                            onClick={() => handleDownloadBackup(bf.name)}
                            style={{
                              padding: '4px 12px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            ⬇️ Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 20, 
            marginBottom: 32 
          }}>
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 }}>
                Totaal Onderdelen
              </div>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: '#667eea' }}>
                {systemStats.totalParts}
              </div>
            </div>
            
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 }}>
                Actieve Reserveringen
              </div>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: '#2563eb' }}>
                {systemStats.totalReservations}
              </div>
            </div>
            
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 }}>
                Totaal Projecten
              </div>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: '#10b981' }}>
                {systemStats.totalProjects}
              </div>
            </div>
            
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 }}>
                Weinig Voorraad
              </div>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: '#f59e0b' }}>
                {systemStats.lowStockCount}
              </div>
            </div>
            
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 }}>
                Totaal Gebruikers
              </div>
              <div style={{ fontSize: 36, fontWeight: 'bold', color: '#8b5cf6' }}>
                {systemStats.totalUsers}
              </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <div style={{ 
              padding: 24, 
              background: 'var(--vscode-editor-background, rgba(100,100,100,0.03))', 
              borderRadius: 12,
              border: '1px solid #e0e0e0'
            }}>
              <h3>Systeeminformatie</h3>
              <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                <div><strong>Backend:</strong> Node.js + Express + SQLite</div>
                <div><strong>Frontend:</strong> React + Vite</div>
                <div><strong>Authenticatie:</strong> Bcrypt password hashing</div>
                <div><strong>Database:</strong> SQLite met relationele structuur</div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: Analytics */}
      {activeTab === 'analytics' && user && ['teacher','toa','expert','admin'].includes(user.role) && (
        <AnalyticsDashboard user={user} />
      )}

      {/* TAB: User Management */}
      {activeTab === 'users' && user && isStaff && (
        <div>
          <h2>Gebruikersbeheer</h2>
          
          <div style={{ marginBottom: 32 }}>
            <h3>Nieuwe Gebruiker Aanmaken</h3>
            <form onSubmit={handleAddUser} style={{ display: 'flex', gap: 12, maxWidth: 800, flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Gebruikersnaam</label>
                <input
                  type="text"
                  placeholder="gebruikersnaam"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Wachtwoord</label>
                <input
                  type="password"
                  placeholder="wachtwoord"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                />
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Rol</label>
                <select 
                  value={newUser.role} 
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                >
                  <option value="student">Leerling</option>
                  <option value="teacher">Docent</option>
                  <option value="expert">Leerling-expert</option>
                  <option value="toa">TOA</option>
                  <option value="team">Team</option>
                  {user.role === 'admin' && <option value="admin">Admin</option>}
                </select>
              </div>
              <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                Aanmaken
              </button>
            </form>
          </div>

          {(user.role === 'teacher' || user.role === 'admin') && (
            <div style={{ marginBottom: 32, paddingTop: 16, borderTop: `1px solid ${themeColors.border}` }}>
              <h3>Team Account aanmaken en koppelen aan project</h3>
              <form onSubmit={handleCreateTeamAccount} style={{ display: 'flex', gap: 12, maxWidth: 900, flexWrap: 'wrap', alignItems: 'end' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Project</label>
                  <select
                    value={createTeamForm.project_id}
                    onChange={(e) => setCreateTeamForm({ ...createTeamForm, project_id: e.target.value })}
                    required
                    style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                  >
                    <option value="">-- Kies Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.category_name ? ` (${p.category_name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Team gebruikersnaam</label>
                  <input
                    type="text"
                    placeholder="teamnaam"
                    value={createTeamForm.team_username}
                    onChange={(e) => setCreateTeamForm({ ...createTeamForm, team_username: e.target.value })}
                    required
                    style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                  />
                </div>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 'bold' }}>Wachtwoord</label>
                  <input
                    type="password"
                    placeholder="wachtwoord"
                    value={createTeamForm.team_password}
                    onChange={(e) => setCreateTeamForm({ ...createTeamForm, team_password: e.target.value })}
                    required
                    style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                  />
                </div>
                <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                  Maak en koppel team
                </button>
              </form>
            </div>
          )}

          <h3>Bestaande Gebruikers</h3>
          {users.length === 0 ? (
            <p>Geen gebruikers.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Gebruikersnaam</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Rol</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Aangemaakt</th>
                  <th style={{ textAlign: 'center', padding: 12 }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                    <td style={{ padding: 12 }}>{u.id}</td>
                    <td style={{ padding: 12, fontWeight: 'bold' }}>{u.username}</td>
                    <td style={{ padding: 12 }}>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        disabled={(user.role === 'teacher' || user.role === 'toa') && u.role === 'admin'}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 13, 
                          borderRadius: 4, 
                          border: '1px solid var(--vscode-input-border, #ccc)',
                          background: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          cursor: (user.role === 'teacher' || user.role === 'toa') && u.role === 'admin' ? 'not-allowed' : 'pointer',
                          opacity: (user.role === 'teacher' || user.role === 'toa') && u.role === 'admin' ? 0.6 : 1
                        }}
                      >
                        <option value="student">Leerling</option>
                        <option value="teacher">Docent</option>
                        <option value="expert">Leerling-expert</option>
                        <option value="toa">TOA</option>
                        <option value="team">Team</option>
                        {(user.role === 'admin' || u.role === 'admin') && <option value="admin">Admin</option>}
                      </select>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: themeColors.textSecondary }}>
                      {new Date(u.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {confirmDeleteUserId === u.id ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            onClick={() => { handleDeleteUser(u.id); setConfirmDeleteUserId(null) }}
                            style={{ padding: '6px 12px', border: 'none', background: '#ef4444', color: 'white', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Bevestig
                          </button>
                          <button
                            onClick={() => setConfirmDeleteUserId(null)}
                            style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Annuleer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteUserId(u.id)}
                          disabled={u.id === user.id || ((user.role === 'teacher' || user.role === 'toa') && u.role === 'admin')}
                          style={{ 
                            padding: '6px 12px', 
                            border: 'none', 
                            background: (u.id === user.id || ((user.role === 'teacher' || user.role === 'toa') && u.role === 'admin')) ? '#ccc' : '#ef4444', 
                            color: 'white', 
                            cursor: (u.id === user.id || ((user.role === 'teacher' || user.role === 'toa') && u.role === 'admin')) ? 'not-allowed' : 'pointer', 
                            borderRadius: 4, 
                            fontSize: 12 
                          }}
                        >
                          Verwijder
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: Team Dashboard (alleen team accounts) */}
      {activeTab === 'team' && user && user.role === 'team' && (
        <div>
          <h2>Team Dashboard</h2>
          {!teamProject ? (
            <div>
              <p>Er is nog geen project gekoppeld aan dit team.</p>
              <button onClick={loadTeamProject} style={{ padding: '8px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Vernieuw projectgegevens
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{teamProject.name}</h3>
                {teamProject.category_id && (
                  <div style={{ color: themeColors.textSecondary, fontSize: 13 }}>
                    Categorie ID: {teamProject.category_id}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: themeColors.bgAlt, border: `1px solid ${themeColors.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Totaal aangevraagd</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{teamStats.totalReserved}</div>
                </div>
                <div style={{ padding: 16, background: themeColors.bgAlt, border: `1px solid ${themeColors.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Actief</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{teamStats.totalActive}</div>
                </div>
                <div style={{ padding: 16, background: themeColors.bgAlt, border: `1px solid ${themeColors.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: themeColors.textSecondary }}>Kluisjesnummer</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      type="text"
                      value={teamLockerNumber}
                      onChange={(e) => setTeamLockerNumber(e.target.value)}
                      placeholder="Bijv. B12"
                      style={{ padding: 8, flex: 1, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                    />
                    <button onClick={handleTeamLockerUpdate} style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Opslaan</button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3>Vraag onderdelen aan</h3>
                <form onSubmit={handleTeamRequestPart} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Onderdeel</label>
                      <select
                        value={teamNewRequest.onderdeel_id}
                        onChange={(e) => setTeamNewRequest({ ...teamNewRequest, onderdeel_id: e.target.value })}
                        required
                        style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                      >
                        <option value="">-- Kies Onderdeel --</option>
                        {onderdelen.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 140 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Aantal</label>
                      <input
                        type="number"
                        min="1"
                        value={teamNewRequest.qty}
                        onChange={(e) => setTeamNewRequest({ ...teamNewRequest, qty: e.target.value })}
                        required
                        style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }}
                      />
                    </div>
                    <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                      Aanvragen
                    </button>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Opmerking (optioneel)</label>
                    <textarea
                      value={teamNewRequestComment}
                      onChange={(e) => setTeamNewRequestComment(e.target.value)}
                      placeholder="Bijv. We hebben haast nodig, alternatieve onderdelen zijn ook geschikt..."
                      style={{ padding: 10, width: '100%', fontSize: 14, borderRadius: 4, border: '1px solid var(--vscode-input-border, #ccc)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', minHeight: 80 }}
                      maxLength={500}
                    />
                  </div>
                </form>
              </div>

              <div style={{ marginTop: 24 }}>
                <h3>In aanvraag</h3>
                {teamPending.length === 0 ? (
                  <p>Geen openstaande aanvragen.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                        <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                        <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>Status</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>Aangevraagd</th>
                        <th style={{ textAlign: 'center', padding: 12 }}>Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPending.map((r) => {
                        const hasProposal = r.counter_type === 'proposal' && r.counter_status === 'proposed';
                        const isDenied = r.status === 'denied';
                        const proposalQty = hasProposal ? r.counter_qty : r.qty;
                        const proposalPartName = hasProposal && r.counter_onderdeel_name ? r.counter_onderdeel_name : r.name;
                        return (
                          <Fragment key={r.id}>
                            <tr style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text, background: hasProposal ? 'rgba(139,92,246,0.08)' : isDenied ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                              <td style={{ padding: 12 }}>
                                <strong>{r.name}</strong>
                                {r.request_note && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4, fontStyle: 'italic' }}>💬 {r.request_note}</div>}
                                {hasProposal && <div style={{ fontSize: 12, color: '#8b5cf6', marginTop: 4 }}>Voorstel: {proposalPartName} ({proposalQty})</div>}
                                {r.counter_note && hasProposal && <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 4, fontStyle: 'italic' }}>💬 {r.counter_note}</div>}
                                {isDenied && r.decision_reason && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontStyle: 'italic' }}>❌ {r.decision_reason}</div>}
                              </td>
                              <td style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>{r.qty}</td>
                              <td style={{ padding: 12 }}>
                                {isDenied && '❌ Afgewezen'}
                                {r.counter_status === 'proposed' && '⏳ Voorstel in afwachting'}
                                {!r.counter_status && !isDenied && 'In afwachting van reactie'}
                                {r.counter_status === 'accepted' && '✅ Voorstel geaccepteerd'}
                                {r.counter_status === 'declined' && '❌ Voorstel afgewezen'}
                                {r.counter_status === 'applied' && '🔨 Verplicht toegepast'}
                              </td>
                              <td style={{ padding: 12 }}>{new Date(r.created_at).toLocaleString('nl-NL')}</td>
                              <td style={{ padding: 12, textAlign: 'center' }}>
                                {hasProposal && (
                                  <>
                                    {teamCounterResponseId === r.id ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <input
                                          type="text"
                                          value={teamCounterDeclineComment}
                                          onChange={(e) => setTeamCounterDeclineComment(e.target.value)}
                                          placeholder="Waarom wil je dit voorstel afwijzen?"
                                          maxLength={200}
                                          style={{ padding: 6, fontSize: 12, borderRadius: 3, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, minWidth: 200 }}
                                        />
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <button onClick={() => handleTeamRespondToCounter(r.id, 'decline', teamCounterDeclineComment)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>Afwijzen</button>
                                          <button onClick={() => { setTeamCounterResponseId(null); setTeamCounterDeclineComment(''); }} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>Annuleer</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                        <button onClick={() => handleTeamRespondToCounter(r.id, 'accept')} style={{ padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Ja</button>
                                        <button onClick={() => { setTeamCounterResponseId(r.id); setTeamCounterDeclineComment(''); }} style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Nee</button>
                                      </div>
                                    )}
                                  </>
                                )}
                                {!hasProposal && !isDenied && (
                                  <>
                                    {editingTeamRequestId === r.id ? (
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <input
                                          type="number"
                                          min="1"
                                          value={editingTeamRequestQty}
                                          onChange={(e) => setEditingTeamRequestQty(e.target.value)}
                                          placeholder={r.qty}
                                          style={{ padding: 4, width: 50, fontSize: 12, borderRadius: 3, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText }}
                                        />
                                        <select
                                          value={editingTeamRequestOnderdeel}
                                          onChange={(e) => setEditingTeamRequestOnderdeel(e.target.value)}
                                          style={{ padding: 4, fontSize: 12, borderRadius: 3, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, minWidth: 150 }}
                                        >
                                          <option value={r.onderdeel_id}>{r.name}</option>
                                          {onderdelen.map(o => o.id !== r.onderdeel_id && <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
1                                        <textarea
                                          value={editingTeamRequestNote}
                                          onChange={(e) => setEditingTeamRequestNote(e.target.value)}
                                          placeholder="Opmerking (optioneel)"
                                          maxLength={500}
                                          style={{ padding: 6, fontSize: 12, borderRadius: 3, border: `1px solid ${themeColors.border}`, background: themeColors.inputBg, color: themeColors.inputText, minWidth: 200, minHeight: 50 }}
                                        />
                                        <button onClick={() => handleEditTeamRequest(r.id, editingTeamRequestQty, editingTeamRequestOnderdeel || r.onderdeel_id, editingTeamRequestNote)} style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>✓ Opslaan</button>
                                        <button onClick={() => { setEditingTeamRequestId(null); setEditingTeamRequestQty(''); setEditingTeamRequestOnderdeel(''); setEditingTeamRequestNote(''); }} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${themeColors.border}`, borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>✕ Annuleer</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                        <button onClick={() => { setEditingTeamRequestId(r.id); setEditingTeamRequestQty(r.qty); setEditingTeamRequestOnderdeel(r.onderdeel_id); setEditingTeamRequestNote(r.request_note || ''); }} style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>✏️ Bewerk</button>
                                        <button onClick={() => handleDeleteTeamRequest(r.id)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>🗑️ Verwijder</button>
                                      </div>
                                    )}
                                  </>
                                )}
                                {isDenied && (
                                  <span style={{ fontSize: 11, color: themeColors.textSecondary }}>Aanvraag afgewezen</span>
                                )}
                                {r.counter_status === 'declined' && r.counter_response_note && (
                                  <div style={{ fontSize: 11, color: themeColors.textSecondary, marginTop: 4 }}>Reden: {r.counter_response_note}</div>
                                )}
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3>Jullie reserveringen</h3>
                {!teamProject || !teamProject.id ? null : null}
                {(!teamProject || !teamStats) ? (
                  <p>Geen gegevens.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: themeColors.overlay, color: themeColors.text }}>
                        <th style={{ textAlign: 'left', padding: 12 }}>Onderdeel</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>Artikelnummer</th>
                        <th style={{ textAlign: 'center', padding: 12 }}>Aantal</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>Status</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>Aangemaakt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamReservations.map((r) => (
                        <Fragment key={r.id}>
                          <tr style={{ borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>
                            <td style={{ padding: 12 }}>{r.name}</td>
                            <td style={{ padding: 12 }}>{r.sku || '-'}</td>
                            <td style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>{r.qty}</td>
                            <td style={{ padding: 12 }}>{r.status}</td>
                            <td style={{ padding: 12 }}>{new Date(r.created_at).toLocaleString('nl-NL')}</td>
                          </tr>
                          {user && (
                            <tr>
                              <td colSpan={5} style={{ padding: '8px 12px', background: themeColors.bgAlt }}>
                                <ReservationNotes reservation_id={r.id} user={user} isVisible />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* TAB: Test Environment (alleen admin) */}
      {activeTab === 'test' && user && user.role === 'admin' && (
        <div>
          {/* Status banner */}
          <div style={{
            background: testModeActive 
              ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' 
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{testModeActive ? '⚠️' : '🔒'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  {testModeActive ? 'TEST MODE ACTIEF (alleen voor jou!)' : 'Productie Modus'}
                </div>
                <div style={{ fontSize: 14, opacity: 0.95 }}>
                  {testModeActive 
                    ? 'Dit is een persoonlijke testomgeving - andere gebruikers zien normale productiedata!' 
                    : 'Activeer test mode om te testen zonder productiedata aan te raken'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleTestMode}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: testModeActive ? '#dc2626' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap'
              }}
            >
              {testModeActive ? '❌ Test Mode UIT' : '✅ Test Mode AAN'}
            </button>
          </div>

          {testModeActive ? (
            <>
              <h2>🧪 Test Environment</h2>
              
              {/* Test stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                gap: 16, 
                marginBottom: 24 
              }}>
                <div style={{ 
                  padding: 16, 
                  background: themeColors.bgAlt, 
                  border: `1px solid ${themeColors.border}`, 
                  borderRadius: 8,
                  textAlign: 'center',
                  color: themeColors.text
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#667eea' }}>{systemStats.totalParts || 0}</div>
                  <div style={{ marginTop: 6, color: themeColors.textSecondary, fontSize: 12 }}>Onderdelen</div>
                </div>
                <div style={{ 
                  padding: 16, 
                  background: themeColors.bgAlt, 
                  border: `1px solid ${themeColors.border}`, 
                  borderRadius: 8,
                  textAlign: 'center',
                  color: themeColors.text
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#10b981' }}>{systemStats.totalProjects || 0}</div>
                  <div style={{ marginTop: 6, color: themeColors.textSecondary, fontSize: 12 }}>Projecten</div>
                </div>
                <div style={{ 
                  padding: 16, 
                  background: themeColors.bgAlt, 
                  border: `1px solid ${themeColors.border}`, 
                  borderRadius: 8,
                  textAlign: 'center',
                  color: themeColors.text
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b' }}>{systemStats.totalReservations || 0}</div>
                  <div style={{ marginTop: 6, color: themeColors.textSecondary, fontSize: 12 }}>Reserveringen</div>
                </div>
                <div style={{ 
                  padding: 16, 
                  background: themeColors.bgAlt, 
                  border: `1px solid ${themeColors.border}`, 
                  borderRadius: 8,
                  textAlign: 'center',
                  color: themeColors.text
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#8b5cf6' }}>{categories.length || 0}</div>
                  <div style={{ marginTop: 6, color: themeColors.textSecondary, fontSize: 12 }}>Categorieën</div>
                </div>
              </div>
              
              {/* Setup test data */}
              <div style={{ 
                marginBottom: 24, 
                padding: 20, 
                background: themeColors.bgAlt, 
                border: `1px solid ${themeColors.border}`, 
                borderRadius: 8,
                color: themeColors.text
              }}>
                <h3 style={{ marginTop: 0, marginBottom: 12 }}>📊 Test Data Genereren</h3>
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
                      Aantal onderdelen:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={testGenerateCount}
                      onChange={(e) => setTestGenerateCount(parseInt(e.target.value) || 20)}
                      style={{
                        padding: '8px 10px',
                        border: '1px solid var(--vscode-input-border, #ccc)',
                        borderRadius: 4,
                        width: 120,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <button
                    onClick={handleGenerateTestData}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      background: loading ? '#ccc' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: 13
                    }}
                  >
                    {loading ? '⏳ Genereer...' : '🎲 Genereer Data'}
                  </button>
                  {confirmClearTest ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { handleClearTestData(); setConfirmClearTest(false) }}
                        disabled={loading}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          fontSize: 13
                        }}
                      >
                        Bevestig wissen
                      </button>
                      <button
                        onClick={() => setConfirmClearTest(false)}
                        style={{
                          padding: '8px 16px',
                          background: 'transparent',
                          border: `1px solid ${themeColors.border}`,
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: 13
                        }}
                      >
                        Annuleer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClearTest(true)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        background: loading ? '#ccc' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        fontSize: 13
                      }}
                    >
                      {loading ? '⏳ Wissen...' : '🗑️ Wis Alles'}
                    </button>
                  )}
                </div>
                
                <div style={{ fontSize: 12, color: themeColors.textSecondary }}>
                  💡 Tip: Genereer test data en test vervolgens alle features (onderdelen, projecten, reserveringen, etc.)
                </div>
              </div>

              {/* Now show all normal tabs when in test mode */}
              <div style={{ marginTop: 32 }}>
                <h3>🔧 Test alle features:</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 12 
                }}>
                  <button
                    onClick={() => setActiveTab('shop')}
                    style={{
                      padding: '12px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}
                  >
                    🛍️ Webshop testen
                  </button>
                  <button
                    onClick={() => setActiveTab('list')}
                    style={{
                      padding: '12px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}
                  >
                    📋 Beheer testen
                  </button>
                  <button
                    onClick={() => setActiveTab('reserve')}
                    style={{
                      padding: '12px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}
                  >
                    ✋ Reservering testen
                  </button>
                  <button
                    onClick={() => setActiveTab('projects')}
                    style={{
                      padding: '12px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}
                  >
                    🏗️ Projecten testen
                  </button>
                  <button
                    onClick={() => setActiveTab('reservations')}
                    style={{
                      padding: '12px 16px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}
                  >
                    ✅ Reserveringen testen
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: themeColors.textSecondary,
              border: '2px dashed var(--vscode-panel-border, #ccc)',
              borderRadius: 8
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Test Mode is UIT</div>
              <div style={{ fontSize: 14, marginBottom: 16 }}>
                Klik op de knop "✅ Test Mode AAN" om test mode in te schakelen
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                In test mode kun je alle functies testen zonder productiedata aan te raken
              </div>
            </div>
          )}
        </div>
      )}
      </>
    )}

    {/* Chatbot - floating button */}
    <ChatBot user={user} />
    </div>
  )
}

export default App

// Lightweight component showing overdue home checkouts for staff/experts
function OverdueBanner({ role, themeColors }) {
  const [overdue, setOverdue] = useState([])
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/reserveringen/overdue?userRole=${role}`))
        if (!res.ok) return setOverdue([])
        const data = await res.json()
        setOverdue(data || [])
      } catch {
        setOverdue([])
      }
    }
    load()
  }, [role])
  if (!overdue || overdue.length === 0) return null
  return (
    <div style={{ margin: '12px 0', padding: 12, borderRadius: 8, background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412' }}>
      <strong>Let op:</strong> {overdue.length} item(s) zijn niet tijdig teruggebracht.
      <div style={{ marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${themeColors.border}` }}>
              <th style={{ textAlign: 'left', padding: 6 }}>Onderdeel</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Project</th>
              <th style={{ textAlign: 'center', padding: 6 }}>Aantal</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Uiterste datum</th>
            </tr>
          </thead>
          <tbody>
            {overdue.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <td style={{ padding: 6 }}>{r.onderdeel_name}</td>
                <td style={{ padding: 6 }}>{r.project_name}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{r.aantal}</td>
                <td style={{ padding: 6 }}>{r.due_date ? new Date(r.due_date).toLocaleDateString('nl-NL') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
