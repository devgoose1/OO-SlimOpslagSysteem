const express = require('express');
const router = express.Router();
const { db } = require('./database');

// ============================================================
// ORDERNUMMER GENERATIE HELPER
// ============================================================

/**
 * Genereert een nieuw ordernummer van vorm: ordn-TYPE-NUMMER
 * @param {string} type - Type ordernummer (anv, wto, wao, ret, rvh)
 * @param {function} callback - callback(err, ordernummer)
 */
function generateOrdernummer(type, callback) {
    db.run(
        `UPDATE ordernummer_counters SET next_number = next_number + 1 WHERE type = ?`,
        [type],
        function(err) {
            if (err) return callback(err);
            
            db.get(
                `SELECT next_number FROM ordernummer_counters WHERE type = ?`,
                [type],
                (err, row) => {
                    if (err) return callback(err);
                    const nummer = String(row.next_number - 1).padStart(3, '0');
                    const ordernummer = `ordn-${type}-${nummer}`;
                    callback(null, ordernummer);
                }
            );
        }
    );
}

// ============================================================
// ORDERNUMMER CREATIE (INTERN - HELPER FUNCTION)
// ============================================================

/**
 * Maakt een ordernummer aan
 * @param {Object} data - {type, created_by, project_id, onderdeel_id, change_description, before_value, after_value, notes}
 * @param {function} callback - callback(err, result)
 */
function createOrdernummer(data, callback) {
    generateOrdernummer(data.type, (err, ordernummer) => {
        if (err) return callback(err);
        
        const typeNumber = parseInt(ordernummer.split('-')[2]);
        
        db.run(
            `INSERT INTO ordernummers 
            (ordernummer, type, type_number, created_by, project_id, onderdeel_id, change_description, before_value, after_value, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ordernummer,
                data.type,
                typeNumber,
                data.created_by,
                data.project_id || null,
                data.onderdeel_id || null,
                data.change_description || null,
                data.before_value || null,
                data.after_value || null,
                data.notes || null
            ],
            function(err) {
                if (err) return callback(err);
                
                db.get(
                    `SELECT * FROM ordernummers WHERE id = ?`,
                    [this.lastID],
                    callback
                );
            }
        );
    });
}

// Export voor intern gebruik in andere API's
module.exports.createOrdernummer = createOrdernummer;

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /api/ordernummers
 * Haal alle ordernummers op (met filters)
 */
router.get('/', (req, res) => {
    const { type, status, project_id, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT * FROM ordernummers WHERE 1=1`;
    const params = [];
    
    if (type) {
        query += ` AND type = ?`;
        params.push(type);
    }
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    if (project_id) {
        query += ` AND project_id = ?`;
        params.push(project_id);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * GET /api/ordernummers/:id
 * Haal een specifiek ordernummer op met details
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(
        `SELECT o.*, u.username as created_by_username, u.role as created_by_role,
                p.name as project_name, d.name as onderdeel_name
         FROM ordernummers o
         LEFT JOIN users u ON o.created_by = u.id
         LEFT JOIN projects p ON o.project_id = p.id
         LEFT JOIN onderdelen d ON o.onderdeel_id = d.id
         WHERE o.id = ?`,
        [id],
        (err, ordernummer) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!ordernummer) return res.status(404).json({ error: 'Ordernummer niet gevonden' });
            
            // Haal ook acties op
            db.all(
                `SELECT a.*, u.username as performed_by_username
                 FROM ordernummer_actions a
                 LEFT JOIN users u ON a.performed_by = u.id
                 WHERE a.ordernummer_id = ?
                 ORDER BY a.performed_at DESC`,
                [id],
                (err, actions) => {
                    if (err) return res.status(500).json({ error: err.message });
                    ordernummer.actions = actions || [];
                    res.json(ordernummer);
                }
            );
        }
    );
});

/**
 * GET /api/ordernummers/zoeken/:ordernummer
 * Zoek op ordernummer (bv. ordn-anv-001)
 */
router.get('/zoeken/:ordernummer', (req, res) => {
    const { ordernummer } = req.params;
    
    db.get(
        `SELECT o.*, u.username as created_by_username, u.role as created_by_role,
                p.name as project_name, d.name as onderdeel_name
         FROM ordernummers o
         LEFT JOIN users u ON o.created_by = u.id
         LEFT JOIN projects p ON o.project_id = p.id
         LEFT JOIN onderdelen d ON o.onderdeel_id = d.id
         WHERE o.ordernummer = ?`,
        [ordernummer],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!result) return res.status(404).json({ error: 'Ordernummer niet gevonden' });
            
            db.all(
                `SELECT a.*, u.username as performed_by_username
                 FROM ordernummer_actions a
                 LEFT JOIN users u ON a.performed_by = u.id
                 WHERE a.ordernummer_id = ?
                 ORDER BY a.performed_at DESC`,
                [result.id],
                (err, actions) => {
                    if (err) return res.status(500).json({ error: err.message });
                    result.actions = actions || [];
                    res.json(result);
                }
            );
        }
    );
});

/**
 * POST /api/ordernummers/:id/actie
 * Voer een actie uit op een ordernummer
 * Body: {action_type, performed_by, action_data (optioneel)}
 */
router.post('/:id/actie', (req, res) => {
    const { id } = req.params;
    const { action_type, performed_by, action_data } = req.body;
    
    if (!action_type || !performed_by) {
        return res.status(400).json({ error: 'action_type en performed_by zijn verplicht' });
    }
    
    // Controleer of ordernummer bestaat
    db.get(`SELECT id FROM ordernummers WHERE id = ?`, [id], (err, ordernummer) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!ordernummer) return res.status(404).json({ error: 'Ordernummer niet gevonden' });
        
        db.run(
            `INSERT INTO ordernummer_actions (ordernummer_id, action_type, performed_by, action_data)
             VALUES (?, ?, ?, ?)`,
            [id, action_type, performed_by, action_data ? JSON.stringify(action_data) : null],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                db.get(
                    `SELECT * FROM ordernummer_actions WHERE id = ?`,
                    [this.lastID],
                    (err, action) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json(action);
                    }
                );
            }
        );
    });
});

/**
 * PATCH /api/ordernummers/:id
 * Update ordernummer status of notes
 * Body: {status (optioneel), notes (optioneel)}
 */
router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    let query = `UPDATE ordernummers SET `;
    const params = [];
    
    if (status !== undefined) {
        query += `status = ?`;
        params.push(status);
    }
    
    if (notes !== undefined) {
        if (params.length > 0) query += `, `;
        query += `notes = ?`;
        params.push(notes);
    }
    
    if (params.length === 0) {
        return res.status(400).json({ error: 'Minstens één veld moet worden bijgewerkt' });
    }
    
    query += ` WHERE id = ?`;
    params.push(id);
    
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ordernummer niet gevonden' });
        
        db.get(`SELECT * FROM ordernummers WHERE id = ?`, [id], (err, ordernummer) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(ordernummer);
        });
    });
});

/**
 * POST /api/ordernummers/intern/aanmaken
 * INTERN: Voor gebruik door andere API endpoints
 * (Dit wordt niet direct door frontend aangeroepen)
 */
router.post('/intern/aanmaken', (req, res) => {
    const { type, created_by, project_id, onderdeel_id, change_description, before_value, after_value, notes } = req.body;
    
    if (!type || !created_by) {
        return res.status(400).json({ error: 'type en created_by zijn verplicht' });
    }
    
    createOrdernummer(
        { type, created_by, project_id, onderdeel_id, change_description, before_value, after_value, notes },
        (err, ordernummer) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(ordernummer);
        }
    );
});

module.exports = router;
