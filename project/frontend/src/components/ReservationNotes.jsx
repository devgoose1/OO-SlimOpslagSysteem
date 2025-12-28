/**
 * ReservationNotes.jsx - SMS/Chat style comments on reservations
 */

import { useState, useEffect, useRef } from 'react';
import { getReservationNotes, addReservationNote, updateNoteVisibility, deleteReservationNote, formatNoteForDisplay } from '../services/notesService';
import './ReservationNotes.css';

export default function ReservationNotes({ reservation_id, user, isVisible = false }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [showNotes, setShowNotes] = useState(isVisible);
    const [visibilityToggle, setVisibilityToggle] = useState(false);
    const notesEndRef = useRef(null);

    const isPrivileged = ['teacher', 'expert', 'admin', 'toa'].includes(user?.role);

    // Load notes
    useEffect(() => {
        if (showNotes && user?.id) {
            loadNotes();
        }
    }, [showNotes, reservation_id, user?.id]);

    // Auto-scroll to bottom
    useEffect(() => {
        notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [notes]);

    // Default visibility: privileged roles share with teams unless explicitly hidden
    useEffect(() => {
        setVisibilityToggle(isPrivileged);
    }, [isPrivileged]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const response = await getReservationNotes(reservation_id, user.id, user.role);
            if (response.success) {
                setNotes(response.notes || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        const noteText = newNote;
        setNewNote('');
        
        const response = await addReservationNote(
            reservation_id,
            noteText,
            user.id,
            user.role,
            visibilityToggle
        );

        if (response.success) {
            loadNotes();
            setVisibilityToggle(false);
        }
    };

    const handleToggleVisibility = async (note_id, currentVisibility) => {
        const response = await updateNoteVisibility(
            note_id,
            !currentVisibility,
            user.id,
            user.role
        );
        if (response.success) {
            loadNotes();
        }
    };

    const handleDeleteNote = async (note_id) => {
        if (confirm('Weet je zeker dat je deze opmerking wilt verwijderen?')) {
            const response = await deleteReservationNote(note_id, user.id, user.role);
            if (response.success) {
                loadNotes();
            }
        }
    };

    return (
        <div className="reservation-notes-container">
            <button
                className="notes-toggle-btn"
                onClick={() => setShowNotes(!showNotes)}
            >
                💬 Opmerkingen ({notes.length})
            </button>

            {showNotes && (
                <div className="notes-panel">
                    {/* Notes display */}
                    <div className="notes-list">
                        {loading && <div className="notes-loading">Opmerkingen laden...</div>}

                        {notes.length === 0 && !loading && (
                            <div className="notes-empty">Geen opmerkingen nog</div>
                        )}

                        {notes.map((note) => {
                            const formatted = formatNoteForDisplay(note, user.id, user.role);
                            const isAuthor = note.author_id === user.id;

                            return (
                                <div
                                    key={note.id}
                                    className={`note-bubble ${isAuthor ? 'sent' : 'received'} ${formatted.isHidden ? 'hidden' : ''}`}
                                >
                                    <div className="note-header">
                                        <span className="note-author">
                                            {note.username} ({note.author_role})
                                        </span>
                                        <span className="note-time">
                                            {new Date(note.created_at).toLocaleTimeString('nl-NL', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <div className="note-content">{note.content}</div>

                                    <div className="note-footer">
                                        {formatted.isHidden && (
                                            <span className="note-hidden-badge">🔒 Verborgen</span>
                                        )}

                                        {isPrivileged && (
                                            <button
                                                className="note-visibility-btn"
                                                onClick={() => handleToggleVisibility(note.id, note.visible_to_teams)}
                                                title={note.visible_to_teams ? 'Verberg voor teams' : 'Toon voor teams'}
                                            >
                                                {note.visible_to_teams ? '👁️' : '🔒'}
                                            </button>
                                        )}

                                        {formatted.canDelete && (
                                            <button
                                                className="note-delete-btn"
                                                onClick={() => handleDeleteNote(note.id)}
                                                title="Verwijder opmerking"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div ref={notesEndRef} />
                    </div>

                    {/* Note input form */}
                    <form className="note-input-form" onSubmit={handleAddNote}>
                        <textarea
                            className="note-input-field"
                            placeholder="Voeg een opmerking toe..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={2}
                            maxLength={500}
                        />

                        {isPrivileged && (
                            <label className="visibility-toggle">
                                <input
                                    type="checkbox"
                                    checked={visibilityToggle}
                                    onChange={(e) => setVisibilityToggle(e.target.checked)}
                                />
                                <span>Zichtbaar voor teams</span>
                            </label>
                        )}

                        <button
                            type="submit"
                            className="note-submit-btn"
                            disabled={!newNote.trim()}
                        >
                            Verstuur
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
