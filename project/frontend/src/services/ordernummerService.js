/**
 * Service voor interactie met ordernummers API
 */

const API_BASE = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`).replace(/\/$/, '');

/**
 * Haal alle ordernummers op
 */
export async function getOrdernummers(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.project_id) params.append('project_id', filters.project_id);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await fetch(`${API_BASE}/api/ordernummers?${params}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kon ordernummers niet ophalen');
    }
    
    return response.json();
}

/**
 * Haal een specifiek ordernummer op met alle details en acties
 */
export async function getOrdernummer(id) {
    const response = await fetch(`${API_BASE}/api/ordernummers/${id}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kon ordernummer niet ophalen');
    }
    
    return response.json();
}

/**
 * Zoek een ordernummer op ordernummer-code (bijv. ordn-anv-001)
 */
export async function searchOrdernummer(ordernummerCode) {
    const response = await fetch(`${API_BASE}/api/ordernummers/zoeken/${ordernummerCode}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ordernummer niet gevonden');
    }
    
    return response.json();
}

/**
 * Voer een actie uit op een ordernummer
 */
export async function performAction(ordernummerId, actionType, performedBy, actionData = null) {
    const response = await fetch(`${API_BASE}/api/ordernummers/${ordernummerId}/actie`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action_type: actionType,
            performed_by: performedBy,
            action_data: actionData
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kon actie niet uitvoeren');
    }
    
    return response.json();
}

/**
 * Update ordernummer status of notities
 */
export async function updateOrdernummer(id, updates) {
    const response = await fetch(`${API_BASE}/api/ordernummers/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kon ordernummer niet bijwerken');
    }
    
    return response.json();
}

/**
 * Maak een ordernummer aan (intern - voor andere services)
 */
export async function createOrdernummerInternal(type, createdBy, data = {}) {
    const response = await fetch(`${API_BASE}/api/ordernummers/intern/aanmaken`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type,
            created_by: createdBy,
            ...data
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kon ordernummer niet aanmaken');
    }
    
    return response.json();
}
