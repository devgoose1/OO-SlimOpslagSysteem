/**
 * notesService.js - Reservation Notes/Comments Service
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`).replace(/\/$/, '');

export async function getReservationNotes(reservation_id, userId, userRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reservations/${reservation_id}/notes?userId=${userId}&userRole=${userRole}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching notes:', error);
        return { success: false, notes: [] };
    }
}

export async function addReservationNote(reservation_id, content, userId, userRole, visible_to_teams = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reservations/${reservation_id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                userId,
                userRole,
                visible_to_teams
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error adding note:', error);
        return { success: false };
    }
}

export async function updateNoteVisibility(note_id, visible_to_teams, userId, userRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${note_id}/visibility`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visible_to_teams,
                userId,
                userRole
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error updating note visibility:', error);
        return { success: false };
    }
}

export async function deleteReservationNote(note_id, userId, userRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${note_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, userRole })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error deleting note:', error);
        return { success: false };
    }
}

/**
 * Format note for display
 */
export function formatNoteForDisplay(note, currentUserId, currentUserRole) {
    const isAuthor = note.author_id === currentUserId;
    const isPrivileged = ['teacher', 'expert', 'admin', 'toa'].includes(currentUserRole);
    
    return {
        ...note,
        isAuthor,
        canEdit: isAuthor || currentUserRole === 'admin',
        canDelete: isAuthor || currentUserRole === 'admin',
        isHidden: !note.visible_to_teams && !isAuthor && !isPrivileged,
        hiddenLabel: !note.visible_to_teams ? '🔒 Verborgen voor teams' : '👁️ Zichtbaar voor iedereen'
    };
}
