/**
 * notesApi.js - Reservation Notes/Comments API
 * 
 * SMS/Chat style comments op reserveringen
 * Permission logic:
 * - Team (students) - Zien alleen hun eigen notes, kunnen notes toevoegen (default hidden)
 * - Docent/Toa/Expert - Zien alles, kunnen notes toevoegen + visibility toggle
 * 
 * Endpoints:
 * - GET /api/reservations/:reservation_id/notes - Haal notes op (met permission check)
 * - POST /api/reservations/:reservation_id/notes - Voeg note toe
 * - DELETE /api/notes/:note_id - Verwijder note
 */

const { db } = require('./database');

const PRIVILEGED_ROLES = ['teacher', 'expert', 'admin', 'toa'];
const TEAM_ROLE = 'team';

/**
 * GET /api/reservations/:reservation_id/notes
 * Haal notes op voor een reservering (met permission checks)
 * Requires: req.body.userId, req.body.userRole
 */
async function getReservationNotes(req, res) {
    try {
        const { reservation_id } = req.params;
        const userId = req.body?.userId || req.query?.userId;
        const userRole = req.body?.userRole || req.query?.userRole;

        if (!userId || !userRole) {
            return res.status(401).json({ error: 'userId en userRole vereist' });
        }

        // Controleer of reservering bestaat en get project info
        db.get(`
            SELECT r.id, r.project_id, p.team_account_id
            FROM reservations r
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = ?
        `, [reservation_id], (err, reservation) => {
            if (err || !reservation) {
                return res.status(404).json({ error: 'Reservering niet gevonden' });
            }

            // Check if team user is the project's team account
            const isTeamOfProject = userRole === TEAM_ROLE && reservation.team_account_id === userId;

            // Haal alle notes op
            db.all(`
                SELECT rn.id, rn.author_id, rn.author_role, rn.content, 
                       rn.visible_to_teams, rn.created_at,
                       u.username
                FROM reservation_notes rn
                JOIN users u ON rn.author_id = u.id
                WHERE rn.reservation_id = ?
                ORDER BY rn.created_at ASC
            `, [reservation_id], (err, notes) => {
                if (err) {
                    console.error('Error fetching notes:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Filter notes based on permissions
                const visibleNotes = notes.filter(note => {
                    // Privileged users zien alles
                    if (PRIVILEGED_ROLES.includes(userRole)) {
                        return true;
                    }

                    // Team users zien notes van hun project:
                    // - Alle notes die visible_to_teams = 1
                    // - Eigen notes
                    if (isTeamOfProject) {
                        return note.visible_to_teams === 1 || note.author_id === userId;
                    }

                    return false;
                });

                res.json({
                    success: true,
                    reservation_id,
                    notes: visibleNotes
                });
            });
        });
    } catch (error) {
        console.error('Error in getReservationNotes:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * POST /api/reservations/:reservation_id/notes
 * Voeg een note toe aan een reservering
 * Body: { userId, userRole, content, visible_to_teams }
 */
async function addReservationNote(req, res) {
    try {
        const { reservation_id } = req.params;
        const { content, visible_to_teams, userId, userRole } = req.body;

        if (!userId || !userRole) {
            return res.status(401).json({ error: 'userId en userRole vereist' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content vereist' });
        }

        // Controleer reservering bestaat
        db.get('SELECT id FROM reservations WHERE id = ?', [reservation_id], (err, reservation) => {
            if (err || !reservation) {
                return res.status(404).json({ error: 'Reservering niet gevonden' });
            }

            // Bepaal default visibility
            // Team users: default hidden (0)
            // Privileged: default hidden maar kunnen toggle (0)
            const isVisible = visible_to_teams === true ? 1 : 0;

            db.run(`
                INSERT INTO reservation_notes (reservation_id, author_id, author_role, content, visible_to_teams)
                VALUES (?, ?, ?, ?, ?)
            `, [reservation_id, userId, userRole, content, isVisible], function(err) {
                if (err) {
                    console.error('Error adding note:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    success: true,
                    note_id: this.lastID,
                    message: 'Opmerking toegevoegd',
                    visibility: isVisible === 1 ? 'visible_to_teams' : 'hidden_from_teams'
                });
            });
        });
    } catch (error) {
        console.error('Error in addReservationNote:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * PUT /api/notes/:note_id/visibility
 * Update visibility van een note (alleen voor author of privileged users)
 * Body: { userId, userRole, visible_to_teams }
 */
async function updateNoteVisibility(req, res) {
    try {
        const { note_id } = req.params;
        const { visible_to_teams, userId, userRole } = req.body;

        if (!userId || !userRole) {
            return res.status(401).json({ error: 'userId en userRole vereist' });
        }

        // Haal note op
        db.get('SELECT * FROM reservation_notes WHERE id = ?', [note_id], (err, note) => {
            if (err || !note) {
                return res.status(404).json({ error: 'Opmerking niet gevonden' });
            }

            // Check permission: author of privileged user
            const canEdit = note.author_id === userId || PRIVILEGED_ROLES.includes(userRole);

            if (!canEdit) {
                return res.status(403).json({ error: 'Geen toestemming' });
            }

            const isVisible = visible_to_teams === true ? 1 : 0;

            db.run(`
                UPDATE reservation_notes
                SET visible_to_teams = ?
                WHERE id = ?
            `, [isVisible, note_id], function(err) {
                if (err) {
                    console.error('Error updating note visibility:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    success: true,
                    note_id,
                    visibility: isVisible === 1 ? 'visible_to_teams' : 'hidden_from_teams'
                });
            });
        });
    } catch (error) {
        console.error('Error in updateNoteVisibility:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * DELETE /api/notes/:note_id
 * Verwijder een note (alleen author of admin)
 * Body must include: { userId, userRole }
 */
async function deleteReservationNote(req, res) {
    try {
        const { note_id } = req.params;
        const userId = req.body?.userId;
        const userRole = req.body?.userRole;

        if (!userId || !userRole) {
            return res.status(401).json({ error: 'userId en userRole vereist' });
        }

        // Haal note op
        db.get('SELECT * FROM reservation_notes WHERE id = ?', [note_id], (err, note) => {
            if (err || !note) {
                return res.status(404).json({ error: 'Opmerking niet gevonden' });
            }

            // Check permission: author of admin
            const canDelete = note.author_id === userId || userRole === 'admin';

            if (!canDelete) {
                return res.status(403).json({ error: 'Geen toestemming' });
            }

            db.run('DELETE FROM reservation_notes WHERE id = ?', [note_id], function(err) {
                if (err) {
                    console.error('Error deleting note:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    success: true,
                    message: 'Opmerking verwijderd'
                });
            });
        });
    } catch (error) {
        console.error('Error in deleteReservationNote:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    getReservationNotes,
    addReservationNote,
    updateNoteVisibility,
    deleteReservationNote
};
