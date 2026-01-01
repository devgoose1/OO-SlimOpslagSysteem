import { useState, useEffect } from 'react';
import {
    getOrdernummers,
    getOrdernummer,
    searchOrdernummer,
    performAction,
    updateOrdernummer
} from '../services/ordernummerService';
import './Ordernummers.css';

export default function Ordernummers() {
    const [view, setView] = useState('search'); // 'search', 'detail', 'list'
    const [searchInput, setSearchInput] = useState('');
    const [selectedOrdernummer, setSelectedOrdernummer] = useState(null);
    const [ordernummers, setOrdernummers] = useState([]);
    const [filters, setFilters] = useState({ type: '', status: 'actief' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Haal ordernummers op als filter verandert
    useEffect(() => {
        if (view === 'list') {
            loadOrdernummers();
        }
    }, [filters, view]);
    
    const loadOrdernummers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getOrdernummers(filters);
            setOrdernummers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const ordernummer = await searchOrdernummer(searchInput.trim());
            setSelectedOrdernummer(ordernummer);
            setView('detail');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePerformAction = async (actionType) => {
        if (!selectedOrdernummer) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // TODO: Zorg dat user ID wordt meegegeven (uit context of localStorage)
            const userId = parseInt(localStorage.getItem('user_id')) || 1;
            
            const action = await performAction(selectedOrdernummer.id, actionType, userId);
            setSuccess(`Actie "${actionType}" succesvol uitgevoerd`);
            
            // Herlaad ordernummer details
            const updated = await getOrdernummer(selectedOrdernummer.id);
            setSelectedOrdernummer(updated);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleStatusChange = async (newStatus) => {
        if (!selectedOrdernummer) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const updated = await updateOrdernummer(selectedOrdernummer.id, { status: newStatus });
            setSelectedOrdernummer(updated);
            setSuccess(`Status gewijzigd naar "${newStatus}"`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const getTypeLabel = (type) => {
        const labels = {
            'anv': 'Aanvraag',
            'wto': 'Wijziging Totaal',
            'wao': 'Wijziging Aangewezen',
            'ret': 'Retour',
            'rvh': 'Review/Handeling'
        };
        return labels[type] || type;
    };
    
    const getStatusColor = (status) => {
        const colors = {
            'actief': '#007bff',
            'gesloten': '#28a745',
            'verwerkt': '#6c757d',
            'geannuleerd': '#dc3545'
        };
        return colors[status] || '#000';
    };
    
    return (
        <div className="ordernummers-container">
            <div className="ordernummers-header">
                <h2>Ordernummers</h2>
                <p>Beheer en zoeken naar ordernummers</p>
            </div>
            
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            
            {/* Navigatieknoppen */}
            <div className="ordernummers-tabs">
                <button 
                    className={`tab-btn ${view === 'search' ? 'active' : ''}`}
                    onClick={() => setView('search')}
                >
                    Zoeken
                </button>
                <button 
                    className={`tab-btn ${view === 'list' ? 'active' : ''}`}
                    onClick={() => setView('list')}
                >
                    Alle Ordernummers
                </button>
            </div>
            
            {/* ZOEKEN VIEW */}
            {view === 'search' && !selectedOrdernummer && (
                <div className="ordernummers-search">
                    <form onSubmit={handleSearch}>
                        <div className="search-group">
                            <input 
                                type="text"
                                placeholder="Voer ordernummer in (bijv. ordn-anv-001)"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" disabled={loading} className="search-btn">
                                {loading ? 'Zoeken...' : 'Zoeken'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* DETAIL VIEW */}
            {selectedOrdernummer && view === 'detail' && (
                <div className="ordernummers-detail">
                    <button 
                        className="back-btn"
                        onClick={() => {
                            setSelectedOrdernummer(null);
                            setSearchInput('');
                            setView('search');
                        }}
                    >
                        ← Terug naar zoeken
                    </button>
                    
                    <div className="detail-header">
                        <div className="detail-title">
                            <h3>{selectedOrdernummer.ordernummer}</h3>
                            <span 
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(selectedOrdernummer.status) }}
                            >
                                {selectedOrdernummer.status}
                            </span>
                        </div>
                        <div className="detail-meta">
                            <p><strong>Type:</strong> {getTypeLabel(selectedOrdernummer.type)}</p>
                            <p><strong>Aangemaakt:</strong> {new Date(selectedOrdernummer.created_at).toLocaleString('nl-NL')}</p>
                            <p><strong>Door:</strong> {selectedOrdernummer.created_by_username} ({selectedOrdernummer.created_by_role})</p>
                        </div>
                    </div>
                    
                    {/* Details */}
                    <div className="detail-content">
                        {selectedOrdernummer.onderdeel_name && (
                            <div className="detail-section">
                                <h4>Onderdeel</h4>
                                <p>{selectedOrdernummer.onderdeel_name}</p>
                            </div>
                        )}
                        
                        {selectedOrdernummer.project_name && (
                            <div className="detail-section">
                                <h4>Project</h4>
                                <p>{selectedOrdernummer.project_name}</p>
                            </div>
                        )}
                        
                        {selectedOrdernummer.change_description && (
                            <div className="detail-section">
                                <h4>Wijziging</h4>
                                <p>{selectedOrdernummer.change_description}</p>
                            </div>
                        )}
                        
                        {selectedOrdernummer.before_value && (
                            <div className="detail-section">
                                <h4>Voor</h4>
                                <pre>{JSON.stringify(JSON.parse(selectedOrdernummer.before_value), null, 2)}</pre>
                            </div>
                        )}
                        
                        {selectedOrdernummer.after_value && (
                            <div className="detail-section">
                                <h4>Na</h4>
                                <pre>{JSON.stringify(JSON.parse(selectedOrdernummer.after_value), null, 2)}</pre>
                            </div>
                        )}
                        
                        {selectedOrdernummer.notes && (
                            <div className="detail-section">
                                <h4>Notities</h4>
                                <p>{selectedOrdernummer.notes}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Acties */}
                    <div className="ordernummers-actions">
                        <h4>Beschikbare Acties</h4>
                        <div className="action-buttons">
                            {selectedOrdernummer.status === 'actief' && (
                                <>
                                    <button 
                                        className="action-btn action-process"
                                        onClick={() => handleStatusChange('verwerkt')}
                                        disabled={loading}
                                    >
                                        Verwerkt Markeren
                                    </button>
                                    <button 
                                        className="action-btn action-close"
                                        onClick={() => handleStatusChange('gesloten')}
                                        disabled={loading}
                                    >
                                        Afsluiten
                                    </button>
                                    <button 
                                        className="action-btn action-cancel"
                                        onClick={() => handleStatusChange('geannuleerd')}
                                        disabled={loading}
                                    >
                                        Annuleren
                                    </button>
                                </>
                            )}
                            
                            <button 
                                className="action-btn action-info"
                                onClick={() => handlePerformAction('notatie_toevoegen')}
                                disabled={loading}
                            >
                                Notatie Toevoegen
                            </button>
                        </div>
                    </div>
                    
                    {/* Uitgevoerde Acties */}
                    {selectedOrdernummer.actions && selectedOrdernummer.actions.length > 0 && (
                        <div className="ordernummers-history">
                            <h4>Actiegeschiedenis</h4>
                            <div className="history-list">
                                {selectedOrdernummer.actions.map((action) => (
                                    <div key={action.id} className="history-item">
                                        <div className="history-action">
                                            <strong>{action.action_type}</strong>
                                        </div>
                                        <div className="history-info">
                                            <small>
                                                Door: {action.performed_by_username} | 
                                                {new Date(action.performed_at).toLocaleString('nl-NL')}
                                            </small>
                                        </div>
                                        {action.action_data && (
                                            <div className="history-data">
                                                <pre>{JSON.stringify(JSON.parse(action.action_data), null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* LIJST VIEW */}
            {view === 'list' && (
                <div className="ordernummers-list">
                    <div className="list-filters">
                        <div className="filter-group">
                            <label>Type:</label>
                            <select 
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            >
                                <option value="">Alle types</option>
                                <option value="anv">Aanvraag</option>
                                <option value="wto">Wijziging Totaal</option>
                                <option value="wao">Wijziging Aangewezen</option>
                                <option value="ret">Retour</option>
                                <option value="rvh">Review/Handeling</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>Status:</label>
                            <select 
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">Alle statussen</option>
                                <option value="actief">Actief</option>
                                <option value="verwerkt">Verwerkt</option>
                                <option value="gesloten">Gesloten</option>
                                <option value="geannuleerd">Geannuleerd</option>
                            </select>
                        </div>
                    </div>
                    
                    {loading && <p className="loading">Laden...</p>}
                    
                    {!loading && ordernummers.length === 0 && (
                        <p className="no-results">Geen ordernummers gevonden</p>
                    )}
                    
                    {!loading && ordernummers.length > 0 && (
                        <div className="list-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ordernummer</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Project</th>
                                        <th>Onderdeel</th>
                                        <th>Aangemaakt</th>
                                        <th>Actie</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordernummers.map((ord) => (
                                        <tr key={ord.id} onClick={() => {
                                            setSelectedOrdernummer(ord);
                                            setView('detail');
                                        }} style={{ cursor: 'pointer' }}>
                                            <td><strong>{ord.ordernummer}</strong></td>
                                            <td>{getTypeLabel(ord.type)}</td>
                                            <td>
                                                <span 
                                                    className="status-badge"
                                                    style={{ backgroundColor: getStatusColor(ord.status) }}
                                                >
                                                    {ord.status}
                                                </span>
                                            </td>
                                            <td>{ord.project_name || '-'}</td>
                                            <td>{ord.onderdeel_name || '-'}</td>
                                            <td>{new Date(ord.created_at).toLocaleDateString('nl-NL')}</td>
                                            <td>
                                                <button 
                                                    className="detail-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrdernummer(ord);
                                                        setView('detail');
                                                    }}
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
