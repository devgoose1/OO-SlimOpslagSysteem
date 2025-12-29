const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const https = require('https');
const cron = require('node-cron');
const multer = require('multer');

const { db, testDb, CURRENT_SCHEMA_VERSION } = require('./database');
const BackupManager = require('./backupManager');
const { registerChatRoutes } = require('./chatApi');
const { getFavorites, addFavorite, removeFavorite } = require('./favoritesApi');
const { getReservationNotes, addReservationNote, updateNoteVisibility, deleteReservationNote } = require('./notesApi');
const { requireAnalyticsAccess, getAnalyticsOverview, getReservationsTrend, getTopItems, getCategoriesBreakdown, getLowStockItems, getUnassignedStats } = require('./analyticsApi');
const ordernummerRouter = require('./ordernummerApi');
const { createOrdernummer } = require('./ordernummerApi');

// Initialiseer Express app
const app = express();
const port = process.env.PORT || 3000;
const httpsKeyPath = path.resolve(__dirname, '..', 'frontend', 'localhost+2-key.pem');
const httpsCertPath = path.resolve(__dirname, '..', 'frontend', 'localhost+2.pem');
const hasHttpsCert = fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath);

// Ensure audit table exists in both databases (also for older DB files)
[db, testDb].forEach((database) => {
    database.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor_user_id INTEGER,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
    )`);
});

// Helper function: get database based on request query parameter
const getActiveDb = (req) => {
    return req.query.testMode === 'true' || req.body?.testMode === true ? testDb : db;
};

// Middleware
// CORS configuratie voor lokaal netwerk testing
app.use(cors({
    origin: [
        'http://devgoose1.github.io',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://192.168.68.122:5173'
    ],
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
    res.send('Hallo wereld!');
});

// Route om de status van de server te controleren
app.get('/status', (req, res) => {
    res.json({ status: 'Server draait goed!' });
});

// AUTHENTICATIE

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord verplicht' });
    }

    db.get(
        'SELECT id, username, password, role FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) {
                return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord' });
            }
            
            // Verify password met bcrypt
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord' });
            }
            
            res.json({ 
                id: user.id, 
                username: user.username, 
                role: user.role 
            });
        }
    );
});

// USER MANAGEMENT (alleen voor admins)

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(users);
    });
});

// Create new user
app.post('/api/users', async (req, res) => {
    const { username, password, role, userRole } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Alle velden verplicht' });
    }
    
    if (!['student', 'teacher', 'expert', 'admin', 'toa', 'team'].includes(role)) {
        return res.status(400).json({ error: 'Ongeldige rol' });
    }
    
    // Teachers cannot create admin accounts
    if (userRole === 'teacher' && role === 'admin') {
        return res.status(403).json({ error: 'Docenten kunnen geen admin accounts aanmaken' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Gebruikersnaam bestaat al' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                logAction(req, 'user:created', null, { id: this.lastID, username, role });
                res.json({ 
                    id: this.lastID, 
                    username, 
                    role,
                    message: 'Gebruiker aangemaakt' 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        logAction(req, 'user:deleted', req.body.user_id || null, { id: Number(id) });
        res.json({ message: 'Gebruiker verwijderd' });
    });
});

// Update user role
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role || !['student', 'teacher', 'expert', 'admin', 'toa', 'team'].includes(role)) {
        return res.status(400).json({ error: 'Ongeldige rol' });
    }
    
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        logAction(req, 'user:role_changed', req.body.user_id || null, { id: Number(id), new_role: role });
        res.json({ message: 'Gebruiker bijgewerkt' });
    });
});

// System stats for dashboard
app.get('/api/stats', (req, res) => {
    const stats = {};
    const activeDb = getActiveDb(req);
    
    activeDb.get('SELECT COUNT(*) as count FROM onderdelen', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalParts = row.count;
        
        activeDb.get('SELECT COUNT(*) as count FROM reservations WHERE status = "active"', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.totalReservations = row.count;
            
            activeDb.get('SELECT COUNT(*) as count FROM projects', [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.totalProjects = row.count;
                
                activeDb.get(`
                    SELECT COUNT(*) as count FROM (
                        SELECT o.id
                        FROM onderdelen o
                        LEFT JOIN reservations r ON r.onderdeel_id = o.id AND r.status = 'active'
                        GROUP BY o.id
                        HAVING (o.total_quantity - COALESCE(SUM(r.qty), 0)) < 5
                    )
                `, [], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.lowStockCount = row.count;
                    
                    activeDb.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.totalUsers = row.count;
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// Check sessie (optioneel, voor later als je sessions wilt)
app.get('/api/me', (req, res) => {
    // Voor nu simpel: client bewaart user info
    res.json({ message: 'Sessie check' });
});


// DATABASE DINGEN

// Lijst met onderdelen en hun beschikbaarheid
app.get('/api/onderdelen', (req, res) => {
    const activeDb = getActiveDb(req);
    const query = `
        SELECT 
            o.id,
            o.name,
            o.sku AS artikelnummer,
            o.description,
            o.location,
            o.total_quantity,
            o.links,
            o.image_url,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            o.total_quantity - COALESCE(SUM(CASE WHEN r.status IN ('active','unassigned') THEN r.qty END), 0) AS available_quantity,
            (SELECT COALESCE(SUM(qty),0) FROM purchase_requests pr WHERE pr.onderdeel_id = o.id AND pr.status = 'open') AS requested_quantity,
            (SELECT COALESCE(SUM(qty),0) FROM purchase_requests pr2 WHERE pr2.onderdeel_id = o.id AND pr2.status = 'ordered') AS ordered_quantity,
            CASE 
                WHEN o.total_quantity - COALESCE(SUM(CASE WHEN r.status IN ('active','unassigned') THEN r.qty END), 0) < 5 THEN 1
                ELSE 0
            END AS low_stock_warning
        FROM onderdelen o
        LEFT JOIN reservations r ON r.onderdeel_id = o.id
        GROUP BY o.id
        ORDER BY o.name
    `;

    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsed = rows.map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [], image_url: r.image_url || null }));
        res.json(parsed);
    });
});

// Search endpoint voor chatbot - zoek onderdelen op naam
app.get('/api/onderdelen/search', (req, res) => {
    const { name, q } = req.query;
    const searchTerm = name || q;
    
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
        return res.status(400).json({ error: 'Search parameter "name" of "q" is verplicht' });
    }

    const activeDb = getActiveDb(req);
    
    // Zoek op exacte match of partial match (LIKE)
    const searchQuery = `
        SELECT 
            o.id,
            o.name,
            o.sku AS artikelnummer,
            o.description,
            o.location,
            o.total_quantity,
            o.links,
            o.image_url,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            o.total_quantity - COALESCE(SUM(CASE WHEN r.status IN ('active','unassigned') THEN r.qty END), 0) AS available_quantity
        FROM onderdelen o
        LEFT JOIN reservations r ON r.onderdeel_id = o.id
        WHERE LOWER(o.name) LIKE LOWER(?) 
           OR LOWER(o.description) LIKE LOWER(?)
           OR LOWER(o.sku) LIKE LOWER(?)
        GROUP BY o.id
        ORDER BY 
            CASE 
                WHEN LOWER(o.name) = LOWER(?) THEN 1
                WHEN LOWER(o.name) LIKE LOWER(?) THEN 2
                ELSE 3
            END,
            o.name
        LIMIT 10
    `;

    const searchPattern = `%${searchTerm.trim()}%`;
    const exactMatch = searchTerm.trim();

    activeDb.all(
        searchQuery,
        [searchPattern, searchPattern, searchPattern, exactMatch, exactMatch],
        (err, rows) => {
            if (err) {
                console.error('[SEARCH ERROR]', err.message);
                return res.status(500).json({ error: err.message });
            }

            if (!rows || rows.length === 0) {
                return res.json([]); // Empty array, not 404
            }

            const parsed = rows.map(r => ({
                ...r,
                links: r.links ? JSON.parse(r.links) : [],
                image_url: r.image_url || null
            }));

            res.json(parsed);
        }
    );
});

// Nieuw onderdeel toevoegen
app.post('/api/onderdelen', (req, res) => {
    const { name, artikelnummer, description, location, total_quantity, links, image_url, userRole } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    if (!['teacher','admin','toa'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const qty = Number(total_quantity ?? 0);
    const linksJson = Array.isArray(links) ? JSON.stringify(links) : null;
    const activeDb = getActiveDb(req);
    activeDb.run(
        `INSERT INTO onderdelen (name, sku, description, location, total_quantity, links, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, artikelnummer || null, description || null, location || null, qty, linksJson, image_url || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAction(req, 'part:created', req.body.user_id || null, { id: this.lastID, name, artikelnummer, total_quantity: qty });
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Onderdeel updaten
app.put('/api/onderdelen/:id', (req, res) => {
    const { id } = req.params;
    const { name, artikelnummer, description, location, total_quantity, image_url, userRole, user_id } = req.body;
    if (!['teacher','admin','toa'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const newTotal = Number(total_quantity);

    // Eerst controleren of het nieuwe totaal niet lager is dan het aantal gereserveerd
    activeDb.get(
        `SELECT 
            o.id,
            o.total_quantity,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity
         FROM onderdelen o
         LEFT JOIN reservations r ON r.onderdeel_id = o.id
         WHERE o.id = ?
         GROUP BY o.id`,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Onderdeel niet gevonden' });
            if (newTotal < row.reserved_quantity) {
                return res.status(400).json({ error: `Totaal kan niet lager dan gereserveerd (${row.reserved_quantity})` });
            }

            const oldTotal = row.total_quantity;
            
            activeDb.run(
                `UPDATE onderdelen 
                 SET name = ?, sku = ?, description = ?, location = ?, total_quantity = ?, image_url = ?
                 WHERE id = ?`,
                [name, artikelnummer || null, description || null, location || null, newTotal, image_url || null, id],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'Onderdeel niet gevonden' });
                    }
                    
                    // Maak ordernummer aan als hoeveelheid veranderd is (wto - wijziging totaal)
                    if (oldTotal !== newTotal && user_id) {
                        const ordernummerData = {
                            type: 'wto',
                            created_by: user_id,
                            onderdeel_id: parseInt(id),
                            change_description: `Hoeveelheid veranderd van ${oldTotal} naar ${newTotal}`,
                            before_value: JSON.stringify({ total_quantity: oldTotal }),
                            after_value: JSON.stringify({ total_quantity: newTotal }),
                            notes: null
                        };
                        createOrdernummer(ordernummerData, (err, ordernummer) => {
                            if (err) {
                                console.error('Kon ordernummer niet aanmaken:', err);
                                // Geef toch succes terug, ordernummer is niet kritiek
                            }
                        });
                    }
                    
                    logAction(req, 'part:updated', req.body.user_id || null, { id: Number(id), name, artikelnummer, total_quantity: newTotal });
                    res.json({ message: 'Onderdeel geüpdatet', id: Number(id) });
                }
            );
        }
    );
});

// Onderdeel verwijderen (alleen als geen actieve reserveringen)
app.delete('/api/onderdelen/:id', (req, res) => {
    const { id } = req.params;
    const role = req.query.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    
    // Check eerst of er actieve reserveringen zijn
    activeDb.get(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE onderdeel_id = ? AND status = 'active'`,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (row.count > 0) {
                return res.status(400).json({ 
                    error: `Kan niet verwijderen: ${row.count} actieve reservering(en)` 
                });
            }
            
            // Geen actieve reserveringen: mag verwijderd worden
            activeDb.run('DELETE FROM onderdelen WHERE id = ?', [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Onderdeel niet gevonden' });
                }
                logAction(req, 'part:deleted', null, { id: Number(id) });
                res.json({ message: 'Onderdeel verwijderd', id: Number(id) });
            });
        }
    );
});

// Reservering plaatsen (haalt 1 onderdeel van de beschikbaarheid af)
app.post('/api/reserveringen', (req, res) => {
    const { onderdeel_id, project_id, aantal, userRole, user_id } = req.body;
    if (!['teacher','admin','toa','expert'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const reserveQty = Number(aantal);
    const activeDb = getActiveDb(req);
    if (!onderdeel_id || !project_id || !reserveQty) {
        return res.status(400).json({ error: 'onderdeel_id, project_id en aantal verplicht' });
    }

    // Eerst checken of er genoeg beschikbaar is
    activeDb.get(
        'SELECT available_quantity FROM part_availability WHERE id = ?',
        [onderdeel_id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Onderdeel niet gevonden' });
            if (row.available_quantity < reserveQty) {
                return res.status(400).json({
                    error: `Niet genoeg beschikbaar. Alleen ${row.available_quantity} stuks beschikbaar.`
                });
            }

            // Alleen als er genoeg is: maak reservering
            activeDb.run(
                `INSERT INTO reservations (onderdeel_id, project_id, qty, status)
                VALUES (?, ?, ?, 'active')`,
                [onderdeel_id, project_id, reserveQty],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Maak ordernummer aan (aanvraag)
                    if (user_id) {
                        const ordernummerData = {
                            type: 'anv',
                            created_by: user_id,
                            project_id: project_id,
                            onderdeel_id: onderdeel_id,
                            change_description: `Aanvraag van ${reserveQty} stuks`,
                            after_value: JSON.stringify({ qty: reserveQty, status: 'active' }),
                            notes: null
                        };
                        createOrdernummer(ordernummerData, (err, ordernummer) => {
                            if (err) {
                                console.error('Kon ordernummer niet aanmaken:', err);
                                // Geef toch reservering terug, ordernummer is niet kritiek
                            }
                        });
                    }
                    
                    res.status(201).json({ id: this.lastID });
                }
            );
        }
    ); 
});

// Projecten ophalen (met categorie naam indien beschikbaar)
app.get('/api/projects', (req, res) => {
    const activeDb = getActiveDb(req);
    const query = `
        SELECT p.id, p.name, p.category_id, c.name AS category_name
        FROM projects p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
    `;
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Nieuw project aanmaken
app.post('/api/projects', (req, res) => {
    const { name, category_id, userRole } = req.body;
    if (!['teacher','admin','toa'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const catId = category_id ? Number(category_id) : null;
    const activeDb = getActiveDb(req);
    
    activeDb.run(
        'INSERT INTO projects (name, category_id) VALUES (?, ?)',
        [name, catId],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Project met deze naam bestaat al' });
                }
                return res.status(500).json({ error: err.message });
            }
            logAction(req, 'project:created', req.body.user_id || null, { id: this.lastID, name, category_id: catId });
            res.status(201).json({ id: this.lastID, name, category_id: catId });
        }
    );
});

// Project verwijderen (alleen als geen actieve reserveringen)
app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const role = req.query.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    activeDb.get(
        `SELECT COUNT(*) as count FROM reservations WHERE project_id = ? AND status = 'active'`,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row.count > 0) {
                return res.status(400).json({ error: `Kan niet verwijderen: ${row.count} actieve reservering(en)` });
            }
            activeDb.run('DELETE FROM projects WHERE id = ?', [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Project niet gevonden' });
                logAction(req, 'project:deleted', null, { id: Number(id) });
                res.json({ message: 'Project verwijderd', id: Number(id) });
            });
        }
    );
});

// Onderdelen per project (gebaseerd op actieve reserveringen)
app.get('/api/projects/:id/onderdelen', (req, res) => {
    const { id } = req.params;
    const activeDb = getActiveDb(req);
    const query = `
        SELECT 
            o.id,
            o.name,
            o.sku AS artikelnummer,
            o.location,
            SUM(r.qty) AS gereserveerd
        FROM reservations r
        JOIN onderdelen o ON r.onderdeel_id = o.id
        WHERE r.project_id = ? AND r.status = 'active'
        GROUP BY o.id
        ORDER BY o.name
    `;
    activeDb.all(query, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Alle reserveringen ophalen (met onderdeel en project info)
app.get('/api/reserveringen', (req, res) => {
    const activeDb = getActiveDb(req);
    const query = `
        SELECT 
            r.id,
            r.onderdeel_id,
            r.project_id,
            r.qty AS aantal,
            r.status,
            r.created_at,
            r.taken_home,
            r.due_date,
            r.checkout_by,
            r.checkout_at,
            r.returned_at,
            o.name as onderdeel_name,
            o.sku as onderdeel_artikelnummer,
            p.name as project_name
        FROM reservations r
        JOIN onderdelen o ON r.onderdeel_id = o.id
        JOIN projects p ON r.project_id = p.id
        WHERE r.status = 'active'
        ORDER BY r.created_at DESC
    `;
    
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Markeer reservering als 'mee naar huis' of teruggebracht, met einddatum
app.patch('/api/reserveringen/:id/home', (req, res) => {
    const { id } = req.params;
    const { userRole, user_id, taken_home, due_date } = req.body;
    if (!['teacher','admin','toa','expert'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const th = taken_home ? 1 : 0;
    const due = due_date || null;
    const nowExpr = `datetime('now')`;
    // Only allow updates on active reservations
    activeDb.get(`SELECT id, status, onderdeel_id, project_id, qty FROM reservations WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Reservering niet gevonden' });
        if (row.status !== 'active') return res.status(400).json({ error: 'Alleen actieve reserveringen kunnen worden bijgewerkt' });

        const sql = th
            ? `UPDATE reservations SET taken_home = 1, due_date = ?, checkout_by = ?, checkout_at = ${nowExpr} WHERE id = ?`
            : `UPDATE reservations SET taken_home = 0, returned_at = ${nowExpr} WHERE id = ?`;
        const params = th ? [due, user_id || null, id] : [id];
        activeDb.run(sql, params, function (uErr) {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (this.changes === 0) return res.status(409).json({ error: 'Geen wijzigingen toegepast' });
            
            // Maak ordernummer aan voor retour (ret) als teruggebracht
            if (!th && user_id && row.onderdeel_id && row.project_id) {
                const ordernummerData = {
                    type: 'ret',
                    created_by: user_id,
                    project_id: row.project_id,
                    onderdeel_id: row.onderdeel_id,
                    change_description: `Spullen teruggebracht: ${row.qty} stuks`,
                    before_value: JSON.stringify({ status: 'active', taken_home: 1, qty: row.qty }),
                    after_value: JSON.stringify({ status: 'active', taken_home: 0, qty: row.qty, returned_at: 'now' }),
                    notes: null
                };
                createOrdernummer(ordernummerData, (err, ordernummer) => {
                    if (err) {
                        console.error('Kon ordernummer niet aanmaken:', err);
                    }
                });
            }
            
            logAction(req, th ? 'reservation:home_checked_out' : 'reservation:home_returned', user_id || null, { id: Number(id), due_date: due });
            res.json({ message: th ? 'Gemarkeerd als mee naar huis' : 'Gemarkeerd als teruggebracht', id: Number(id), taken_home: th, due_date: due });
        });
    });
});

// Overzicht van te-laat teruggebrachte items (alleen staff/experts)
app.get('/api/reserveringen/overdue', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const query = `
        SELECT r.id, r.onderdeel_id, r.project_id, r.qty AS aantal, r.due_date, r.checkout_at,
               o.name AS onderdeel_name, o.sku AS onderdeel_artikelnummer,
               p.name AS project_name
        FROM reservations r
        JOIN onderdelen o ON o.id = r.onderdeel_id
        JOIN projects p ON p.id = r.project_id
        WHERE r.status = 'active' AND r.taken_home = 1 AND r.due_date IS NOT NULL AND r.due_date < date('now')
        ORDER BY r.due_date ASC
    `;
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Reservering vrijgeven als "onverdeeld" (terug naar opslag, nog in wachtlijst)
app.patch('/api/reserveringen/:id/release', (req, res) => {
    const { id } = req.params;
    const role = req.body.userRole;
    const decidedBy = req.body.decided_by || null;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    
    activeDb.run(
        `UPDATE reservations SET status = 'unassigned', decided_by = ?, decided_at = datetime('now') WHERE id = ? AND status = 'active'`,
        [decidedBy, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Reservering niet gevonden of niet actief' });
            }
            logAction(req, 'reservation:release_to_unassigned', decidedBy, { id: Number(id) });
            res.json({ message: 'Reservering verplaatst naar onverdeeld', id: Number(id) });
        }
    );
});

// Aantal van een actieve reservering aanpassen (teams beheer)
app.patch('/api/reserveringen/:id/qty', (req, res) => {
    const { id } = req.params;
    const role = req.body.userRole;
    const newQtyRaw = req.body.new_qty;
    const decidedBy = req.body.decided_by || null;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const newQty = Number(newQtyRaw);
    if (!Number.isInteger(newQty) || newQty < 1) {
        return res.status(400).json({ error: 'new_qty moet een geheel getal ≥ 1 zijn' });
    }
    const activeDb = getActiveDb(req);

    // Haal huidige reservering op
    activeDb.get(`SELECT id, onderdeel_id, project_id, qty, status FROM reservations WHERE id = ?`, [id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Reservering niet gevonden' });
        if (r.status !== 'active') return res.status(400).json({ error: 'Alleen actieve reserveringen kunnen worden aangepast' });
        if (newQty === r.qty) return res.json({ message: 'Geen wijziging nodig', id: Number(id), qty: r.qty });

        const delta = newQty - r.qty;
        if (delta > 0) {
            // Controleer voorraad voor verhoging
            activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [r.onderdeel_id], (aErr, row) => {
                if (aErr) return res.status(500).json({ error: aErr.message });
                const available = row ? row.available_quantity : 0;
                if (available < delta) {
                    return res.status(400).json({ error: `Niet genoeg voorraad om te verhogen (beschikbaar: ${available})` });
                }
                activeDb.run(`UPDATE reservations SET qty = ? WHERE id = ?`, [newQty, id], function (uErr) {
                    if (uErr) return res.status(500).json({ error: uErr.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Wijziging niet toegepast' });
                    logAction(req, 'reservation:qty_increase', decidedBy, { id: Number(id), from: r.qty, to: newQty });
                    res.json({ message: 'Aantal verhoogd', id: Number(id), qty: newQty });
                });
            });
        } else {
            // Verlaging: verplaats delta naar 'unassigned' als losse rij
            const removedQty = Math.abs(delta);
            activeDb.serialize(() => {
                activeDb.run('BEGIN TRANSACTION');
                activeDb.run(`UPDATE reservations SET qty = ? WHERE id = ?`, [newQty, id], function (uErr) {
                    if (uErr) {
                        activeDb.run('ROLLBACK');
                        return res.status(500).json({ error: uErr.message });
                    }
                    if (this.changes === 0) {
                        activeDb.run('ROLLBACK');
                        return res.status(409).json({ error: 'Wijziging niet toegepast' });
                    }
                    activeDb.run(
                        `INSERT INTO reservations (onderdeel_id, project_id, qty, status, created_at, decided_by, decided_at)
                         VALUES (?, ?, ?, 'unassigned', datetime('now'), ?, datetime('now'))`,
                        [r.onderdeel_id, r.project_id, removedQty, decidedBy],
                        function (insErr) {
                            if (insErr) {
                                activeDb.run('ROLLBACK');
                                return res.status(500).json({ error: insErr.message });
                            }
                            activeDb.run('COMMIT');
                            logAction(req, 'reservation:qty_decrease', decidedBy, { id: Number(id), from: r.qty, to: newQty, moved_to_unassigned: removedQty });
                            res.json({ message: 'Aantal verlaagd en rest naar onverdeeld', id: Number(id), qty: newQty, unassigned_id: this.lastID, removed_qty: removedQty });
                        }
                    );
                });
            });
        }
    });
});

// Onverdeelde onderdelen ophalen (inzage voor expert/teacher/toa/admin)
app.get('/api/reservations/unassigned', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const query = `
        SELECT r.id, r.onderdeel_id, r.project_id, r.qty, r.created_at, r.decided_at,
               o.name AS onderdeel_name, o.sku AS onderdeel_sku,
               p.name AS project_name
        FROM reservations r
        JOIN onderdelen o ON o.id = r.onderdeel_id
        LEFT JOIN projects p ON p.id = r.project_id
        WHERE r.status = 'unassigned'
        ORDER BY r.decided_at DESC, r.created_at DESC
    `;
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Markeer onverdeeld onderdeel als teruggelegd
app.patch('/api/reservations/:id/return', (req, res) => {
    const { id } = req.params;
    const role = req.body.userRole;
    const decidedBy = req.body.decided_by || null;
    // Docent/TOA/admin mogen terugleggen; experts mogen dit ook uitvoeren voor logistiek aftekenen
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);

    activeDb.run(
        `UPDATE reservations SET status = 'returned', decided_by = ?, decided_at = datetime('now') WHERE id = ? AND status = 'unassigned'`,
        [decidedBy, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Item niet gevonden of al teruggelegd' });
            }
            logAction(req, 'reservation:returned', decidedBy, { id: Number(id) });
            res.json({ message: 'Item gemarkeerd als teruggelegd', id: Number(id) });
        }
    );
});

// ==== AUDIT: list logs (teacher/toa/experts) ====
app.get('/api/audit', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const activeDb = getActiveDb(req);
    const sql = `
        SELECT a.id, a.action, a.details, a.created_at, u.username AS actor_name
        FROM audit_log a
        LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ? OFFSET ?`;
    activeDb.all(sql, [limit, offset], (err, rows) => {
        if (err) {
            console.error('[AUDIT GET ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('[AUDIT GET]', { rows: rows.length, total_queried: rows.length });
        res.json(rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null })));
    });
});

// Categorieën ophalen
app.get('/api/categories', (req, res) => {
    const activeDb = getActiveDb(req);
    activeDb.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Categorie aanmaken
app.post('/api/categories', (req, res) => {
    const { name, start_date, end_date, userRole } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    if (!['teacher','admin','toa'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    activeDb.run('INSERT INTO categories (name, start_date, end_date) VALUES (?, ?, ?)', [name, start_date || null, end_date || null], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Categorie bestaat al' });
            }
            return res.status(500).json({ error: err.message });
        }
        logAction(req, 'category:created', req.body.user_id || null, { id: this.lastID, name });
        res.status(201).json({ id: this.lastID, name, start_date, end_date });
    });
});

// Categorie verwijderen (alleen als geen projecten eraan hangen)
app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const role = req.query.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    activeDb.get('SELECT COUNT(*) as count FROM projects WHERE category_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) {
            return res.status(400).json({ error: `Kan niet verwijderen: ${row.count} project(en) gebruikt deze categorie` });
        }
        activeDb.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Categorie niet gevonden' });
            logAction(req, 'category:deleted', null, { id: Number(id) });
            res.json({ message: 'Categorie verwijderd', id: Number(id) });
        });
    });
});

// ===== TEST ENVIRONMENT (ADMIN ONLY) =====

// Generate random test data (expanded)
app.post('/api/test/generate', (req, res) => {
    const { count } = req.body;
    const itemCount = count || 20;
    
    const names = ['Weerstand', 'Condensator', 'LED', 'Transistor', 'Diode', 'IC Chip', 'Schakelaar', 'Sensor', 'Motor', 'Relais', 'Transistor NPN', 'Potentiometer', 'Servomotor', 'Buzzer', 'Fan', 'DC Motor'];
    const locations = ['Kast A1', 'Kast A2', 'Kast B1', 'Kast B2', 'Lade 1', 'Lade 2', 'Magazijn', 'Testbank'];
    const descriptions = ['Elektronisch onderdeel', 'Mechanisch component', 'Test materiaal', 'Prototype onderdeel', 'Herbruikbaar component'];
    const categoryNames = ['Elektronische Onderdelen', 'Mechanische Onderdelen', 'Sensoren', 'Actuatoren', 'Verbindingen'];
    const projectNames = ['Smart Home System', 'Robotarm Project', 'IoT Sensor Network', 'Domotica Setup', 'Arduino Weather Station', 'Robot Voetbal', 'Weersstation'];
    
    let successCount = 0;
    let insertedParts = [];
    
    const insertPromises = [];
    
    // First insert categories
    const categoryPromises = categoryNames.map(catName => {
        return new Promise((resolve) => {
            testDb.run(
                'INSERT OR IGNORE INTO categories (name) VALUES (?)',
                [catName],
                function(err) {
                    if (!err) resolve(this.lastID);
                    else resolve(null);
                }
            );
        });
    });
    
    Promise.all(categoryPromises).then((categoryIds) => {
        // Then insert parts
        for (let i = 0; i < itemCount; i++) {
            const name = `${names[Math.floor(Math.random() * names.length)]} ${Math.random().toString(36).substring(7)}`;
            const sku = `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const description = descriptions[Math.floor(Math.random() * descriptions.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const quantity = Math.floor(Math.random() * 200) + 10;
            
            insertPromises.push(new Promise((resolve) => {
                testDb.run(
                    'INSERT INTO onderdelen (name, sku, description, location, total_quantity) VALUES (?, ?, ?, ?, ?)',
                    [name, sku, description, location, quantity],
                    function(err) {
                        if (err) {
                            console.error('Insert part error:', err);
                            resolve(null);
                        } else {
                            successCount++;
                            insertedParts.push(this.lastID);
                            resolve(this.lastID);
                        }
                    }
                );
            }));
        }
        
        Promise.all(insertPromises).then((partIds) => {
            // Then insert projects
            const projectPromises = projectNames.map((projName, idx) => {
                return new Promise((resolve) => {
                    const catId = categoryIds[(idx % categoryIds.length)] || 1;
                    testDb.run(
                        'INSERT OR IGNORE INTO projects (name, category_id) VALUES (?, ?)',
                        [projName, catId],
                        function(err) {
                            if (!err) resolve(this.lastID);
                            else resolve(null);
                        }
                    );
                });
            });
            
            Promise.all(projectPromises).then((projIds) => {
                // Then insert some reservations
                const reservationPromises = [];
                const validPartIds = partIds.filter(id => id !== null);
                const validProjIds = projIds.filter(id => id !== null);
                
                for (let i = 0; i < Math.min(10, validPartIds.length); i++) {
                    const partId = validPartIds[Math.floor(Math.random() * validPartIds.length)];
                    const projId = validProjIds[Math.floor(Math.random() * validProjIds.length)];
                    const qty = Math.floor(Math.random() * 10) + 1;
                    
                    reservationPromises.push(new Promise((resolve) => {
                        testDb.run(
                            'INSERT INTO reservations (onderdeel_id, project_id, qty, status) VALUES (?, ?, ?, ?)',
                            [partId, projId, qty, 'active'],
                            function(err) {
                                if (!err) resolve(true);
                                else resolve(false);
                            }
                        );
                    }));
                }
                
                Promise.all(reservationPromises).then(() => {
                    res.json({ 
                        message: `✅ Test data gegenereerd!`,
                        summary: {
                            onderdelen: successCount,
                            categorieën: categoryIds.filter(id => id).length,
                            projecten: validProjIds.length,
                            reserveringen: Math.min(10, validPartIds.length)
                        }
                    });
                });
            });
        });
    }).catch(err => {
        res.status(500).json({ error: 'Fout bij genereren test data: ' + err.message });
    });
});

// Clear test database
app.delete('/api/test/clear', (req, res) => {
    testDb.serialize(() => {
        testDb.run('DELETE FROM reservations');
        testDb.run('DELETE FROM onderdelen');
        testDb.run('DELETE FROM projects');
        testDb.run('DELETE FROM categories');
        testDb.run('DELETE FROM sqlite_sequence');
        
        res.json({ message: 'Test database gewist' });
    });
});

// Get test environment stats
app.get('/api/test/stats', (req, res) => {
    const stats = {};
    
    testDb.get('SELECT COUNT(*) as count FROM onderdelen', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.parts = row.count;
        
        testDb.get('SELECT COUNT(*) as count FROM projects', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.projects = row.count;
            
            testDb.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.categories = row.count;
                
                testDb.get('SELECT COUNT(*) as count FROM reservations', [], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.reservations = row.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// Get test onderdelen (read-only for preview)
app.get('/api/test/onderdelen', (req, res) => {
    const query = `
        SELECT 
            o.id,
            o.name,
            o.sku AS artikelnummer,
            o.description,
            o.location,
            o.total_quantity,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            o.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS available_quantity,
            CASE WHEN o.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) < 5 THEN 1 ELSE 0 END AS low_stock_warning
        FROM onderdelen o
        LEFT JOIN reservations r ON r.onderdeel_id = o.id
        GROUP BY o.id
        ORDER BY o.name
    `;
    
    testDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ===== DEBUG TEST ENDPOINTS =====
// Direct test: insert audit log entry
app.post('/api/test/audit', (req, res) => {
    const { action, user_id, details } = req.body;
    console.log('[TEST AUDIT INSERT]', { action, user_id, details });
    const activeDb = getActiveDb(req);
    activeDb.run(
        `INSERT INTO audit_log (action, actor_user_id, details) VALUES (?, ?, ?)`,
        [action || 'test:action', user_id || null, details ? JSON.stringify(details) : null],
        function (err) {
            if (err) {
                console.error('[TEST AUDIT ERROR]', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('[TEST AUDIT SUCCESS]', { id: this?.lastID });
            res.json({ success: true, id: this?.lastID });
        }
    );
});

// Check audit table count
app.get('/api/test/audit-count', (req, res) => {
    const activeDb = getActiveDb(req);
    activeDb.get('SELECT COUNT(*) as count FROM audit_log', [], (err, row) => {
        if (err) {
            console.error('[TEST AUDIT COUNT ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('[AUDIT TABLE COUNT]', row.count);
        res.json({ count: row.count });
    });
});

// Registreer Chat API routes
registerChatRoutes(app);

// ===== ORDERNUMMER API =====
app.use('/api/ordernummers', ordernummerRouter);

// ===== FAVORITES API =====
app.get('/api/favorites', getFavorites);
app.post('/api/favorites', addFavorite);
app.delete('/api/favorites/:onderdeel_id', removeFavorite);

// ===== RESERVATION NOTES API =====
app.get('/api/reservations/:reservation_id/notes', getReservationNotes);
app.post('/api/reservations/:reservation_id/notes', addReservationNote);
app.put('/api/notes/:note_id/visibility', updateNoteVisibility);
app.delete('/api/notes/:note_id', deleteReservationNote);

// ===== ANALYTICS API =====
app.get('/api/analytics/overview', requireAnalyticsAccess, getAnalyticsOverview);
app.get('/api/analytics/reservations', requireAnalyticsAccess, getReservationsTrend);
app.get('/api/analytics/top-items', requireAnalyticsAccess, getTopItems);
app.get('/api/analytics/categories', requireAnalyticsAccess, getCategoriesBreakdown);
app.get('/api/analytics/low-stock', requireAnalyticsAccess, getLowStockItems);
app.get('/api/analytics/unassigned', requireAnalyticsAccess, getUnassignedStats);

// ===== AUTOMATIC BACKUP SCHEDULING =====
// Scheduled daily backup at 2 AM
cron.schedule('0 2 * * *', () => {
    console.log('[Backup Scheduler] Running daily backup at 2 AM...');
    const dbPath = path.join(__dirname, 'database', 'opslag.db');
    backupManager.createBackup(dbPath, (err, result) => {
        if (err) {
            console.error('[Backup Scheduler] Backup failed:', err);
        } else {
            console.log('[Backup Scheduler] Daily backup created:', result.file);
        }
    });
});

// Start de server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server staat aan op port ${port}`);
    console.log(`Database schema version: ${CURRENT_SCHEMA_VERSION}`);
    console.log(`Backup manager active with versioning support`);
});

// PURCHASE REQUESTS (aanvraag: 'bestellen voor aankoop')
// Docenten kunnen aanvragen aanmaken; TOA kan alle aanvragen inzien.
app.post('/api/purchase_requests', (req, res) => {
    const { onderdeel_id, user_id, qty, urgency, needed_by, category_id, userRole } = req.body;
    const activeDb = getActiveDb(req);
    if (!onderdeel_id || !user_id || !qty) {
        return res.status(400).json({ error: 'onderdeel_id, user_id en qty verplicht' });
    }
    if (!['teacher','toa'].includes(userRole)) {
        return res.status(403).json({ error: 'Alleen docenten of TOA mogen aankoopaanvragen plaatsen' });
    }

    // Haal onderdeel info op om zoekterm te genereren
    activeDb.get('SELECT id, name, sku FROM onderdelen WHERE id = ?', [onderdeel_id], (err, part) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!part) return res.status(404).json({ error: 'Onderdeel niet gevonden' });

        const query = part.sku || part.name;
        const q = encodeURIComponent(query);
        const links = [
            { name: 'Bol.com', url: `https://www.bol.com/nl/s/?searchtext=${q}` },
            { name: 'Amazon NL', url: `https://www.amazon.nl/s?k=${q}` },
            { name: 'Conrad', url: `https://www.conrad.nl/search?query=${q}` }
        ];

        // If needed_by not provided but category_id is provided, try to use category start_date
        const insert = (finalNeededBy) => {
            activeDb.run(
                `INSERT INTO purchase_requests (onderdeel_id, user_id, qty, urgency, needed_by, category_id, links) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [onderdeel_id, user_id, qty, (urgency || 'normaal'), finalNeededBy || null, category_id || null, JSON.stringify(links)],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    logAction(req, 'purchase_request:create', user_id, { id: this.lastID, onderdeel_id, qty, urgency: urgency || 'normaal', needed_by: finalNeededBy || null });
                    res.status(201).json({ id: this.lastID, links });
                }
            );
        };

        if (!needed_by && category_id) {
            activeDb.get('SELECT start_date FROM categories WHERE id = ?', [category_id], (err, cat) => {
                if (err) return res.status(500).json({ error: err.message });
                const finalNeeded = cat?.start_date || null;
                insert(finalNeeded);
            });
        } else {
            insert(needed_by);
        }
    });
});

// Haal alle open purchase requests op (TOA view)
app.get('/api/purchase_requests', (req, res) => {
    const role = req.query.userRole;
    if (!['toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const query = `
     SELECT pr.id, pr.onderdeel_id, pr.user_id, pr.qty, pr.urgency, pr.needed_by, pr.category_id, pr.status, pr.links, pr.created_at,
         o.name AS onderdeel_name, o.sku AS onderdeel_sku,
         u.username AS requested_by,
         c.name AS category_name, c.start_date AS category_start_date, c.end_date AS category_end_date
        FROM purchase_requests pr
        JOIN onderdelen o ON pr.onderdeel_id = o.id
        JOIN users u ON pr.user_id = u.id
     LEFT JOIN categories c ON pr.category_id = c.id
        WHERE pr.status IN ('open','ordered')
        ORDER BY pr.created_at DESC
    `;

    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse links JSON
        const parsed = rows.map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
        res.json(parsed);
    });
});

// TOA marks purchase as ordered (in transit)
app.patch('/api/purchase_requests/:id/ordered', (req, res) => {
    const role = req.body.userRole;
    const actor = req.body.decided_by;
    const { id } = req.params;
    if (role !== 'toa') return res.status(403).json({ error: 'Ongeautoriseerd' });
    const activeDb = getActiveDb(req);
    activeDb.run(`UPDATE purchase_requests SET status='ordered', ordered_by=?, ordered_at=datetime('now') WHERE id=? AND status='open'`, [actor || null, id], function(err){
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag niet open of niet gevonden' });
        logAction(req, 'purchase_request:ordered', actor, { id: Number(id) });
        res.json({ message: 'Gemarkeerd als besteld' });
    });
});

// TOA marks purchase as received: increase stock and close
app.patch('/api/purchase_requests/:id/received', (req, res) => {
    const role = req.body.userRole;
    const actor = req.body.decided_by;
    const { id } = req.params;
    if (role !== 'toa') return res.status(403).json({ error: 'Ongeautoriseerd' });
    const activeDb = getActiveDb(req);
    activeDb.get(`SELECT onderdeel_id, qty, status FROM purchase_requests WHERE id = ?`, [id], (err, pr) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pr) return res.status(404).json({ error: 'Aanvraag niet gevonden' });
        if (!['open','ordered'].includes(pr.status)) return res.status(409).json({ error: 'Aanvraag is al verwerkt' });
        activeDb.serialize(() => {
            activeDb.run('BEGIN TRANSACTION');
            activeDb.run(`UPDATE onderdelen SET total_quantity = total_quantity + ? WHERE id = ?`, [pr.qty, pr.onderdeel_id], function(uErr){
                if (uErr) { activeDb.run('ROLLBACK'); return res.status(500).json({ error: uErr.message }); }
                activeDb.run(`UPDATE purchase_requests SET status='received', received_by=?, received_at=datetime('now') WHERE id=?`, [actor || null, id], function(pErr){
                    if (pErr) { activeDb.run('ROLLBACK'); return res.status(500).json({ error: pErr.message }); }
                    activeDb.run('COMMIT');
                    logAction(req, 'purchase_request:received', actor, { id: Number(id), onderdeel_id: pr.onderdeel_id, qty: pr.qty });
                    res.json({ message: 'Ontvangen en voorraad bijgewerkt' });
                });
            });
        });
    });
});

// TOA denies purchase request
app.patch('/api/purchase_requests/:id/deny', (req, res) => {
    const role = req.body.userRole;
    const actor = req.body.decided_by;
    const reason = (req.body.reason || '').trim();
    const { id } = req.params;
    if (role !== 'toa') return res.status(403).json({ error: 'Ongeautoriseerd' });
    if (!reason) return res.status(400).json({ error: 'Reden is verplicht' });
    const activeDb = getActiveDb(req);
    activeDb.run(`UPDATE purchase_requests SET status='denied', denied_by=?, denied_at=datetime('now'), deny_reason=? WHERE id=? AND status IN ('open','ordered')`, [actor || null, reason, id], function(err){
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag niet open of niet gevonden' });
        logAction(req, 'purchase_request:denied', actor, { id: Number(id), reason });
        res.json({ message: 'Aanvraag afgewezen' });
    });
});

// ===== Backups =====
const upload = multer({ dest: path.join(__dirname, 'database', 'uploads') });
const backupManager = new BackupManager(__dirname);

// ==== AUDIT LOG HELPER ====
function logAction(req, action, actorUserId, detailsObj, cb) {
    try {
        const activeDb = getActiveDb(req);
        const details = detailsObj ? JSON.stringify(detailsObj) : null;
        console.log('[AUDIT LOG]', { action, actorUserId, details });
        activeDb.run(
            `INSERT INTO audit_log (action, actor_user_id, details) VALUES (?, ?, ?)`,
            [action, actorUserId || null, details],
            function (err) { 
                if (err) {
                    console.error('[AUDIT LOG ERROR]', err);
                } else {
                    console.log('[AUDIT LOG INSERTED]', { id: this?.lastID, action });
                }
                if (cb) cb(err, this?.lastID); 
            }
        );
    } catch (e) { 
        console.error('[AUDIT LOG EXCEPTION]', e);
        if (cb) cb(e); 
    }
}

// On-demand backup endpoint - creates backup with metadata AND sends it as download
app.post('/api/backup', (req, res) => {
    const dbPath = req.query.test ? path.join(__dirname, 'database', 'test_opslag.db') : path.join(__dirname, 'database', 'opslag.db');
    
    backupManager.createBackup(dbPath, (err, result) => {
        if (err) return res.status(500).json({ error: 'Backup mislukt', details: err.message });
        
        // Send the backup file as a download
        const filename = path.basename(result.file);
        res.json({ 
            message: 'Backup created successfully',
            filename: filename,
            metadata: result.metadata,
            downloadUrl: `/api/backup/download/${filename}`
        });
    });
});

// Upload and merge backup from older version - NOW WITH FULL TABLE SUPPORT
app.post('/api/backup/merge', upload.single('backupFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Geen backup bestand geselecteerd' });
    }

    console.log('[Backup Merge] Starting merge process...');
    try {
        const uploadedDbPath = req.file.path;
        console.log('[Backup Merge] Uploaded file:', uploadedDbPath);
        const activeDb = getActiveDb(req);
        
        // Use the new backupManager to do the merge
        backupManager.mergeBackup(uploadedDbPath, activeDb, (mergeErr) => {
            // Clean up temp file
            const fs = require('fs');
            setTimeout(() => {
                fs.unlink(uploadedDbPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('[Backup Merge] Warning: Could not delete temp file:', unlinkErr.message);
                    } else {
                        console.log('[Backup Merge] Temp file deleted');
                    }
                });
            }, 100);

            if (mergeErr) {
                console.error('[Backup Merge] Fatal error:', mergeErr);
                return res.status(500).json({ error: 'Merge mislukt', details: mergeErr.message });
            }

            console.log('[Backup Merge] Merge completed successfully');
            res.json({ 
                message: 'Backup merge completed successfully',
                details: 'Alle tabellen gemigreerd met schema-compatibiliteit'
            });
        });

    } catch (e) {
        console.error('[Backup Merge] Fatal error:', e);
        res.status(500).json({ error: 'Merge mislukt', details: e.message, stack: e.stack });
    }
});

// List available backup files with metadata
app.get('/api/backup/list', (req, res) => {
    backupManager.listBackups((err, backups) => {
        if (err) {
            return res.status(500).json({ error: 'Kon backups niet ophalen', details: err.message });
        }
        res.json({ 
            files: backups,
            currentSchemaVersion: CURRENT_SCHEMA_VERSION 
        });
    });
});

// Get backup metadata
app.get('/api/backup/metadata/:filename', (req, res) => {
    const { filename } = req.params;
    backupManager.getBackupMetadata(filename, (err, metadata) => {
        if (err) {
            return res.status(500).json({ error: 'Kon metadata niet ophalen', details: err.message });
        }
        res.json({
            filename: filename,
            metadata: metadata,
            currentSchemaVersion: CURRENT_SCHEMA_VERSION,
            compatible: !metadata.legacy || metadata.schemaVersion >= 1
        });
    });
});

// Download backup file
app.get('/api/backup/download/:filename', (req, res) => {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, 'database', 'backups');
    const filePath = path.join(backupDir, filename);
    
    if (!filePath.startsWith(backupDir)) {
        return res.status(403).json({ error: 'Ongeautoriseerde access' });
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup bestand niet gevonden' });
    }
    
    res.download(filePath, filename);
});

// Get system backup status/info
app.get('/api/backup/status', (req, res) => {
    res.json({
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        backupManagerActive: true,
        features: {
            versioning: true,
            metadata: true,
            autoMigration: true,
            fullTableSupport: true
        }
    });
});


// ===== TEAM ACCOUNT MANAGEMENT =====

// List all team projects for staff/experts
app.get('/api/team/list', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const query = `
        SELECT p.id, p.name, p.category_id, p.locker_number, p.team_account_id,
               c.name AS category_name, c.start_date AS category_start_date, c.end_date AS category_end_date,
               u.username AS team_username,
               (
                   SELECT COUNT(*) FROM team_advice a
                   WHERE a.project_id = p.id AND a.status = 'open'
               ) AS open_advice_count,
               (
                   SELECT COUNT(*) FROM reservations r
                   WHERE r.project_id = p.id AND r.status = 'pending'
               ) AS pending_request_count
        FROM projects p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.team_account_id = u.id
        ORDER BY p.name
    `;
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get team project info by project id (staff/experts)
app.get('/api/team/manage/:projectId', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const projectId = Number(req.params.projectId);
    if (!projectId) return res.status(400).json({ error: 'projectId is verplicht' });

    const activeDb = getActiveDb(req);

    activeDb.get(`
        SELECT p.*, c.name AS category_name, c.start_date AS category_start_date, c.end_date AS category_end_date,
               u.username AS team_username
        FROM projects p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.team_account_id = u.id
        WHERE p.id = ?
    `, [projectId], (err, project) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!project) return res.status(404).json({ error: 'Project niet gevonden' });

        // Active/consumed reservations
        activeDb.all(`
            SELECT r.*, o.name AS onderdeel_name, o.sku AS onderdeel_sku, o.total_quantity
            FROM reservations r
            JOIN onderdelen o ON r.onderdeel_id = o.id
            WHERE r.project_id = ? AND r.status IN ('active','consumed')
            ORDER BY r.created_at DESC
        `, [projectId], (errRes, reservations) => {
            if (errRes) return res.status(500).json({ error: errRes.message });

            // Pending reservations
            activeDb.all(`
                SELECT r.*, o.name AS onderdeel_name, o.sku AS onderdeel_sku, o.total_quantity
                FROM reservations r
                JOIN onderdelen o ON r.onderdeel_id = o.id
                WHERE r.project_id = ? AND r.status = 'pending'
                ORDER BY r.created_at DESC
            `, [projectId], (errPend, pending) => {
                if (errPend) return res.status(500).json({ error: errPend.message });

                // Advice list
                activeDb.all(`
                    SELECT a.*, 
                           u.username AS author_name,
                           o.name AS onderdeel_name,
                           alt.name AS alt_onderdeel_name,
                           decider.username AS decided_by_name
                    FROM team_advice a
                    LEFT JOIN users u ON a.author_user_id = u.id
                    LEFT JOIN onderdelen o ON a.onderdeel_id = o.id
                    LEFT JOIN onderdelen alt ON a.alt_onderdeel_id = alt.id
                    LEFT JOIN users decider ON a.decided_by = decider.id
                    WHERE a.project_id = ?
                    ORDER BY a.created_at DESC
                `, [projectId], (errAdvice, adviceRows) => {
                    if (errAdvice) return res.status(500).json({ error: errAdvice.message });

                    const response = {
                        project,
                        reservations: reservations || [],
                        pending: pending || [],
                        advice: adviceRows || [],
                        stats: {
                            totalReserved: (reservations || []).reduce((sum, r) => sum + r.qty, 0),
                            totalActive: (reservations || []).filter(r => r.status === 'active').reduce((sum, r) => sum + r.qty, 0)
                        }
                    };
                    res.json(response);
                });
            });
        });
    });
});

// Get team project info (for team users)
app.get('/api/team/project', (req, res) => {
    // Accept team user via query param to match existing stateless API pattern
    const teamUserId = Number(req.query.user_id);
    if (!teamUserId) {
        return res.status(400).json({ error: 'user_id is verplicht' });
    }

    const activeDb = getActiveDb(req);
    
    activeDb.get(
        `SELECT id, name, category_id, locker_number FROM projects WHERE team_account_id = ?`,
        [teamUserId],
        (err, project) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!project) return res.status(404).json({ error: 'Project niet gevonden' });
            
            // Get category info
            activeDb.get('SELECT * FROM categories WHERE id = ?', [project.category_id], (err, category) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Get reservations for this project
                activeDb.all(
                    `SELECT r.*, o.name, o.sku, o.total_quantity FROM reservations r
                     JOIN onderdelen o ON r.onderdeel_id = o.id
                     WHERE r.project_id = ? AND r.status IN ('active', 'consumed')`,
                    [project.id],
                    (err, reservations) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Get pending requests for this project (include counter details and denied)
                        activeDb.all(
                            `SELECT r.*, o.name, o.sku, o.total_quantity,
                                    alt.name AS counter_onderdeel_name, alt.sku AS counter_onderdeel_sku,
                                    r.status, r.decision_reason, r.decided_by, r.decided_at, r.request_note
                             FROM reservations r
                             JOIN onderdelen o ON r.onderdeel_id = o.id
                             LEFT JOIN onderdelen alt ON alt.id = r.counter_onderdeel_id
                             WHERE r.project_id = ? AND r.status IN ('pending', 'denied')
                             ORDER BY r.created_at DESC`,
                            [project.id],
                            (err2, pending) => {
                                if (err2) return res.status(500).json({ error: err2.message });

                                const response = {
                                    project,
                                    category,
                                    reservations: reservations || [],
                                    pending: pending || [],
                                    stats: {
                                        totalReserved: (reservations || []).reduce((sum, r) => sum + r.qty, 0),
                                        totalActive: (reservations || []).filter(r => r.status === 'active').reduce((sum, r) => sum + r.qty, 0)
                                    }
                                };
                                res.json(response);
                            }
                        );
                    }
                );
            });
        }
    );
});

// Team request parts for their project
app.post('/api/team/request-parts', (req, res) => {
    // Accept team user via body param to match existing stateless API pattern
    const { user_id, onderdeel_id, qty, note } = req.body;
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is verplicht' });
    }
    if (!onderdeel_id || !qty || qty < 1) {
        return res.status(400).json({ error: 'Onderdeel ID en aantal zijn verplicht' });
    }

    const activeDb = getActiveDb(req);
    
    // Get team's project
    activeDb.get('SELECT id FROM projects WHERE team_account_id = ?', [user_id], (err, project) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!project) return res.status(404).json({ error: 'Project niet gevonden' });
        
        // Create as pending request (requires approval)
        activeDb.run(
            `INSERT INTO reservations (onderdeel_id, project_id, qty, status, created_at, request_note)
             VALUES (?, ?, ?, 'pending', datetime('now'), ?)`,
            [onderdeel_id, project.id, qty, note || null],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: this.lastID, message: 'Aanvraag ingediend, wacht op reactie' });
            }
        );
    });
});

// List pending team requests (teacher/toa/admin/expert)
app.get('/api/team/pending-requests', (req, res) => {
    const role = req.query.userRole;
    if (!['teacher','toa','admin','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    const query = `
        SELECT r.id, r.onderdeel_id, r.project_id, r.qty, r.created_at,
               r.counter_type, r.counter_qty, r.counter_onderdeel_id, r.counter_status,
               r.counter_note, r.counter_response_note, r.counter_by, r.counter_by_role,
               r.status, r.decision_reason, r.decided_by, r.decided_at, r.request_note,
               o.name AS onderdeel_name, o.sku AS onderdeel_sku,
               alt.name AS counter_onderdeel_name,
               p.name AS project_name
        FROM reservations r
        JOIN onderdelen o ON o.id = r.onderdeel_id
        LEFT JOIN onderdelen alt ON alt.id = r.counter_onderdeel_id
        JOIN projects p ON p.id = r.project_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
    `;
    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Team edit their own pending request
app.put('/api/team/request/:id', (req, res) => {
    const { id } = req.params;
    const { user_id, qty, onderdeel_id, note } = req.body;
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is verplicht' });
    }
    const activeDb = getActiveDb(req);
    
    // Verify request belongs to team and is still pending
    activeDb.get(
        `SELECT r.id FROM reservations r
         JOIN projects p ON r.project_id = p.id
         WHERE r.id = ? AND r.status = 'pending' AND p.team_account_id = ?`,
        [id, user_id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(403).json({ error: 'Aanvraag niet gevonden of niet meer in aanvraag' });
            
            // Build update query dynamically based on what was provided
            let updateFields = [];
            let values = [];
            
            if (qty) {
                updateFields.push('qty = ?');
                values.push(qty);
            }
            if (onderdeel_id) {
                updateFields.push('onderdeel_id = ?');
                values.push(onderdeel_id);
            }
            if (note !== undefined) {
                updateFields.push('request_note = ?');
                values.push(note || null);
            }
            
            if (updateFields.length === 0) {
                return res.status(400).json({ error: 'Geen velden om bij te werken' });
            }
            
            values.push(id);
            const updateQuery = `UPDATE reservations SET ${updateFields.join(', ')} WHERE id = ?`;
            
            activeDb.run(updateQuery, values, function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Aanvraag bijgewerkt' });
            });
        }
    );
});

// Team delete their own pending request
app.delete('/api/team/request/:id', (req, res) => {
    const { id } = req.params;
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'user_id is verplicht' });
    }
    const activeDb = getActiveDb(req);
    
    // Verify request belongs to team and is still pending
    activeDb.get(
        `SELECT r.id FROM reservations r
         JOIN projects p ON r.project_id = p.id
         WHERE r.id = ? AND r.status = 'pending' AND p.team_account_id = ?`,
        [id, userId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(403).json({ error: 'Aanvraag niet gevonden of niet meer in aanvraag' });
            
            activeDb.run(
                `DELETE FROM reservations WHERE id = ?`,
                [id],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Aanvraag verwijderd' });
                }
            );
        }
    );
});

// Approve a pending team request
app.post('/api/team/requests/:id/approve', (req, res) => {
    const role = req.body.userRole;
    const decidedBy = req.body.decided_by;
    const { id } = req.params;
    if (!['teacher','toa','admin','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    if (!decidedBy) {
        return res.status(400).json({ error: 'decided_by is verplicht' });
    }
    const activeDb = getActiveDb(req);

    activeDb.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Aanvraag niet gevonden' });
        if (r.status !== 'pending') return res.status(400).json({ error: 'Aanvraag is niet meer in behandeling' });

        activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [r.onderdeel_id], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const available = row ? row.available_quantity : 0;
            if (available < r.qty) {
                return res.status(400).json({ error: `Niet genoeg voorraad om goed te keuren (beschikbaar: ${available})` });
            }
            activeDb.run(
                `UPDATE reservations SET status = 'active', decided_by = ?, decided_at = datetime('now'), decision_reason = NULL WHERE id = ? AND status = 'pending'`,
                [decidedBy, id],
                function (updErr) {
                    if (updErr) return res.status(500).json({ error: updErr.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
                    
                    // Maak ordernummer aan voor team-wijziging (wao)
                    if (decidedBy && r.project_id && r.onderdeel_id) {
                        const ordernummerData = {
                            type: 'wao',
                            created_by: decidedBy,
                            project_id: r.project_id,
                            onderdeel_id: r.onderdeel_id,
                            change_description: `Team onderdelen goedgekeurd: ${r.qty} stuks`,
                            before_value: JSON.stringify({ status: 'pending', qty: r.qty }),
                            after_value: JSON.stringify({ status: 'active', qty: r.qty }),
                            notes: null
                        };
                        createOrdernummer(ordernummerData, (err, ordernummer) => {
                            if (err) {
                                console.error('Kon ordernummer niet aanmaken:', err);
                            }
                        });
                    }
                    
                    res.json({ message: 'Aanvraag goedgekeurd' });
                }
            );
        });
    });
});

// Deny a pending team request
app.post('/api/team/requests/:id/deny', (req, res) => {
    const role = req.body.userRole;
    const decidedBy = req.body.decided_by;
    const reason = (req.body.reason || '').trim();
    const { id } = req.params;
    if (!['teacher','toa','admin','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    if (!decidedBy) {
        return res.status(400).json({ error: 'decided_by is verplicht' });
    }
    if (!reason) {
        return res.status(400).json({ error: 'Reden is verplicht bij afwijzen' });
    }
    const activeDb = getActiveDb(req);
    activeDb.run(
        `UPDATE reservations SET status = 'denied', decided_by = ?, decided_at = datetime('now'), decision_reason = ? WHERE id = ? AND status = 'pending'`,
        [decidedBy, reason, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
            res.json({ message: 'Aanvraag afgewezen' });
        }
    );
});

// Create a counter-offer (proposal or forced change)
app.post('/api/team/requests/:id/counter', (req, res) => {
    const role = req.body.userRole;
    const decidedBy = req.body.decided_by;
    const { counter_type, new_qty, new_onderdeel_id, note } = req.body;
    const { id } = req.params;
    const isForced = counter_type === 'forced';
    if (!['teacher','toa','admin','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    if (!decidedBy) {
        return res.status(400).json({ error: 'decided_by is verplicht' });
    }
    if (!counter_type || !['proposal','forced'].includes(counter_type)) {
        return res.status(400).json({ error: 'counter_type moet proposal of forced zijn' });
    }
    const activeDb = getActiveDb(req);

    activeDb.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Aanvraag niet gevonden' });
        if (r.status !== 'pending') return res.status(400).json({ error: 'Aanvraag is niet meer in behandeling' });

        const targetQty = new_qty ? Number(new_qty) : r.qty;
        const targetOnderdeelId = new_onderdeel_id ? Number(new_onderdeel_id) : r.onderdeel_id;
        if (!targetQty || targetQty < 1) return res.status(400).json({ error: 'Aantal moet minimaal 1 zijn' });

        const applyForced = () => {
            activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [targetOnderdeelId], (errAvail, row) => {
                if (errAvail) return res.status(500).json({ error: errAvail.message });
                const available = row ? row.available_quantity : 0;
                if (available < targetQty) {
                    return res.status(400).json({ error: `Niet genoeg voorraad voor verplichte wijziging (beschikbaar: ${available})` });
                }
                activeDb.run(
                    `UPDATE reservations
                     SET onderdeel_id = ?, qty = ?, status = 'active', decided_by = ?, decided_at = datetime('now'), decision_reason = ?,
                         counter_type = 'forced', counter_qty = ?, counter_onderdeel_id = ?, counter_status = 'applied',
                         counter_note = ?, counter_response_note = NULL, counter_by = ?, counter_by_role = ?
                     WHERE id = ? AND status = 'pending'`,
                    [targetOnderdeelId, targetQty, decidedBy, note || 'Verplichte wijziging', targetQty, targetOnderdeelId, note || null, decidedBy, role, id],
                    function (updErr) {
                        if (updErr) return res.status(500).json({ error: updErr.message });
                        if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
                        return res.json({ message: 'Verplichte wijziging toegepast' });
                    }
                );
            });
        };

        if (isForced) {
            return applyForced();
        }

        // Proposal: store counter fields, keep pending
        activeDb.run(
            `UPDATE reservations
             SET counter_type = 'proposal', counter_qty = ?, counter_onderdeel_id = ?, counter_status = 'proposed',
                 counter_note = ?, counter_response_note = NULL, counter_by = ?, counter_by_role = ?
             WHERE id = ? AND status = 'pending'`,
            [targetQty, targetOnderdeelId, note || null, decidedBy, role, id],
            function (updErr) {
                if (updErr) return res.status(500).json({ error: updErr.message });
                if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
                res.json({ message: 'Tegenadvies voorgesteld' });
            }
        );
    });
});

// Team responds to a counter proposal
app.post('/api/team/requests/:id/respond', (req, res) => {
    const { id } = req.params;
    const { user_id, response, comment } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is verplicht' });
    if (!response || !['accept','decline'].includes(response)) {
        return res.status(400).json({ error: 'response moet accept of decline zijn' });
    }
    if (response === 'decline' && !(comment || '').trim()) {
        return res.status(400).json({ error: 'Opmerking is verplicht bij weigeren' });
    }

    const activeDb = getActiveDb(req);
    activeDb.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Aanvraag niet gevonden' });
        if (r.status !== 'pending') return res.status(400).json({ error: 'Aanvraag is niet meer in behandeling' });
        if (r.counter_status !== 'proposed') {
            return res.status(400).json({ error: 'Er is geen voorstel om op te reageren' });
        }

        const targetQty = r.counter_qty || r.qty;
        const targetOnderdeelId = r.counter_onderdeel_id || r.onderdeel_id;

        if (response === 'decline') {
            return activeDb.run(
                `UPDATE reservations
                 SET counter_status = 'declined', counter_response_note = ?, decision_reason = NULL
                 WHERE id = ? AND status = 'pending'`,
                [comment || null, id],
                function (updErr) {
                    if (updErr) return res.status(500).json({ error: updErr.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
                    return res.json({ message: 'Voorstel afgewezen' });
                }
            );
        }

        // Accept flow: check availability for proposed item
        activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [targetOnderdeelId], (errAvail, row) => {
            if (errAvail) return res.status(500).json({ error: errAvail.message });
            const available = row ? row.available_quantity : 0;
            if (available < targetQty) {
                return res.status(400).json({ error: `Niet genoeg voorraad voor voorstel (beschikbaar: ${available})` });
            }
            activeDb.run(
                `UPDATE reservations
                 SET onderdeel_id = ?, qty = ?, status = 'active', decided_by = counter_by, decided_at = datetime('now'),
                     decision_reason = counter_note, counter_status = 'accepted', counter_response_note = ?,
                     counter_type = 'proposal'
                 WHERE id = ? AND status = 'pending'`,
                [targetOnderdeelId, targetQty, comment || null, id],
                function (updErr2) {
                    if (updErr2) return res.status(500).json({ error: updErr2.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Aanvraag al verwerkt' });
                    return res.json({ message: 'Voorstel geaccepteerd en verwerkt' });
                }
            );
        });
    });
});

// Update team locker number
app.put('/api/team/locker', (req, res) => {
    // Accept team user via body param to match existing stateless API pattern
    const { user_id, locker_number } = req.body;
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is verplicht' });
    }
    if (!locker_number) {
        return res.status(400).json({ error: 'Kluisjesnummer is verplicht' });
    }

    const activeDb = getActiveDb(req);
    
    activeDb.run(
        `UPDATE projects SET locker_number = ? WHERE team_account_id = ?`,
        [locker_number, user_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Kluisjesnummer bijgewerkt' });
        }
    );
});

// Teacher: create and assign team account to project
app.post('/api/team/create-and-assign', (req, res) => {
    // Accept calling role via body to match existing stateless API pattern
    const userRole = req.body.userRole;
    if (!['teacher', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Alleen docenten en admins kunnen team accounts maken' });
    }

    const { team_username, team_password, project_id } = req.body;
    if (!team_username || !team_password || !project_id) {
        return res.status(400).json({ error: 'Team username, wachtwoord en project zijn verplicht' });
    }

    const activeDb = getActiveDb(req);
    const bcrypt = require('bcrypt');

    bcrypt.hash(team_password, 10, (hashErr, hashedPassword) => {
        if (hashErr) return res.status(500).json({ error: hashErr.message });
        
        // Create team user
        activeDb.run(
            `INSERT INTO users (username, password, role, project_id) VALUES (?, ?, 'team', ?)`,
            [team_username, hashedPassword, project_id],
            function(userErr) {
                if (userErr) {
                    if (userErr.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Team username bestaat al' });
                    }
                    return res.status(500).json({ error: userErr.message });
                }
                
                const teamUserId = this.lastID;
                
                // Link team account to project
                activeDb.run(
                    `UPDATE projects SET team_account_id = ? WHERE id = ?`,
                    [teamUserId, project_id],
                    function(updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.status(201).json({ 
                            id: teamUserId,
                            username: team_username,
                            message: 'Team account aangemaakt en gekoppeld aan project'
                        });
                    }
                );
            }
        );
    });
});

// Create advice/comment for a team project (staff + experts)
app.post('/api/team/:projectId/advice', (req, res) => {
    const role = req.body.userRole;
    if (!['teacher','admin','toa','expert'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const projectId = Number(req.params.projectId);
    const { author_user_id, content, onderdeel_id, qty } = req.body;
    if (!projectId || !author_user_id || !content) {
        return res.status(400).json({ error: 'projectId, author_user_id en content zijn verplicht' });
    }
    const activeDb = getActiveDb(req);
    // Als er geen onderdeel is aangevraagd, markeer direct als approved (geen moderatie nodig)
    if (!onderdeel_id) {
        activeDb.run(
            `INSERT INTO team_advice (project_id, author_user_id, content, status, decided_at)
             VALUES (?, ?, ?, 'approved', datetime('now'))`,
            [projectId, author_user_id, content],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: this.lastID, status: 'approved' });
            }
        );
    } else {
        activeDb.run(
            `INSERT INTO team_advice (project_id, author_user_id, content, onderdeel_id, qty, status)
             VALUES (?, ?, ?, ?, ?, 'open')`,
            [projectId, author_user_id, content, onderdeel_id || null, qty || 1],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: this.lastID, status: 'open' });
            }
        );
    }
});

// Approve advice (staff only) - mark approved
app.post('/api/team/advice/:id/approve', (req, res) => {
    const role = req.body.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const { id } = req.params;
    const decidedBy = req.body.decided_by;
    if (!decidedBy) return res.status(400).json({ error: 'decided_by is verplicht' });
    const activeDb = getActiveDb(req);

    // Fetch advice to determine part/qty and project
    activeDb.get(`SELECT * FROM team_advice WHERE id = ? AND status = 'open'`, [id], (err, advice) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!advice) return res.status(409).json({ error: 'Advies is al verwerkt of niet gevonden' });

        const targetPartId = advice.alt_onderdeel_id || advice.onderdeel_id;
        const targetQty = advice.alt_qty || advice.qty || 1;

        // If no onderdeel linked, just mark approved
        if (!targetPartId) {
            return activeDb.run(
                `UPDATE team_advice SET status = 'approved', decided_by = ?, decided_at = datetime('now'), decision_reason = NULL WHERE id = ? AND status = 'open'`,
                [decidedBy, id],
                function(updErr) {
                    if (updErr) return res.status(500).json({ error: updErr.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Advies is al verwerkt' });
                    res.json({ message: 'Advies goedgekeurd (zonder onderdeel)' });
                }
            );
        }

        // Check availability before creating reservation
        activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [targetPartId], (aErr, row) => {
            if (aErr) return res.status(500).json({ error: aErr.message });
            const available = row ? row.available_quantity : 0;
            if (available < targetQty) {
                return res.status(400).json({ error: `Niet genoeg voorraad om advies te verwerken (beschikbaar: ${available})` });
            }

            // Transaction: approve advice + insert reservation
            activeDb.serialize(() => {
                activeDb.run('BEGIN TRANSACTION');
                activeDb.run(
                    `UPDATE team_advice SET status = 'approved', decided_by = ?, decided_at = datetime('now'), decision_reason = NULL WHERE id = ? AND status = 'open'`,
                    [decidedBy, id],
                    function(updErr) {
                        if (updErr) {
                            activeDb.run('ROLLBACK');
                            return res.status(500).json({ error: updErr.message });
                        }
                        if (this.changes === 0) {
                            activeDb.run('ROLLBACK');
                            return res.status(409).json({ error: 'Advies is al verwerkt' });
                        }
                        activeDb.run(
                            `INSERT INTO reservations (onderdeel_id, project_id, qty, status, created_at) VALUES (?, ?, ?, 'active', datetime('now'))`,
                            [targetPartId, advice.project_id, targetQty],
                            function(insErr) {
                                if (insErr) {
                                    activeDb.run('ROLLBACK');
                                    return res.status(500).json({ error: insErr.message });
                                }
                                activeDb.run('COMMIT');
                                return res.json({ message: 'Advies goedgekeurd en onderdeel toegevoegd', reservation_id: this.lastID });
                            }
                        );
                    }
                );
            });
        });
    });
});

// Deny advice (staff only) - requires reason
app.post('/api/team/advice/:id/deny', (req, res) => {
    const role = req.body.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const { id } = req.params;
    const decidedBy = req.body.decided_by;
    const reason = (req.body.reason || '').trim();
    if (!decidedBy) return res.status(400).json({ error: 'decided_by is verplicht' });
    if (!reason) return res.status(400).json({ error: 'Reden is verplicht bij afwijzen' });
    const activeDb = getActiveDb(req);
    activeDb.run(
        `UPDATE team_advice SET status = 'denied', decision_reason = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ? AND status = 'open'`,
        [reason, decidedBy, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(409).json({ error: 'Advies is al verwerkt of niet gevonden' });
            res.json({ message: 'Advies afgewezen' });
        }
    );
});

// Adjust advice with alternative part/quantity (staff only)
app.post('/api/team/advice/:id/adjust', (req, res) => {
    const role = req.body.userRole;
    if (!['teacher','admin','toa'].includes(role)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const { id } = req.params;
    const decidedBy = req.body.decided_by;
    const altOnderdeelId = req.body.alt_onderdeel_id || null;
    const altQty = req.body.alt_qty || null;
    const reason = (req.body.reason || '').trim();
    if (!decidedBy) return res.status(400).json({ error: 'decided_by is verplicht' });
    if (!altOnderdeelId && !altQty) {
        return res.status(400).json({ error: 'Geef een alternatief onderdeel of aangepast aantal op' });
    }
    const activeDb = getActiveDb(req);

    // Fetch advice to determine defaults
    activeDb.get(`SELECT * FROM team_advice WHERE id = ? AND status = 'open'`, [id], (err, advice) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!advice) return res.status(409).json({ error: 'Advies is al verwerkt of niet gevonden' });

        const targetPartId = altOnderdeelId || advice.onderdeel_id;
        const targetQty = altQty || advice.qty || 1;

        if (!targetPartId) {
            // No part to reserve, just mark adjusted
            return activeDb.run(
                `UPDATE team_advice SET status = 'adjusted', decided_by = ?, decided_at = datetime('now'), alt_onderdeel_id = ?, alt_qty = ?, decision_reason = ? WHERE id = ? AND status = 'open'`,
                [decidedBy, altOnderdeelId, altQty, reason || null, id],
                function(updErr) {
                    if (updErr) return res.status(500).json({ error: updErr.message });
                    if (this.changes === 0) return res.status(409).json({ error: 'Advies is al verwerkt' });
                    res.json({ message: 'Advies aangepast (geen onderdeel geselecteerd)' });
                }
            );
        }

        // Check availability
        activeDb.get(`SELECT available_quantity FROM part_availability WHERE id = ?`, [targetPartId], (aErr, row) => {
            if (aErr) return res.status(500).json({ error: aErr.message });
            const available = row ? row.available_quantity : 0;
            if (available < targetQty) {
                return res.status(400).json({ error: `Niet genoeg voorraad voor alternatief (beschikbaar: ${available})` });
            }

            // Transaction: update advice + insert reservation
            activeDb.serialize(() => {
                activeDb.run('BEGIN TRANSACTION');
                activeDb.run(
                    `UPDATE team_advice SET status = 'adjusted', decided_by = ?, decided_at = datetime('now'), alt_onderdeel_id = ?, alt_qty = ?, decision_reason = ? WHERE id = ? AND status = 'open'`,
                    [decidedBy, targetPartId === advice.onderdeel_id ? null : altOnderdeelId, altQty, reason || null, id],
                    function(updErr) {
                        if (updErr) {
                            activeDb.run('ROLLBACK');
                            return res.status(500).json({ error: updErr.message });
                        }
                        if (this.changes === 0) {
                            activeDb.run('ROLLBACK');
                            return res.status(409).json({ error: 'Advies is al verwerkt' });
                        }
                        activeDb.run(
                            `INSERT INTO reservations (onderdeel_id, project_id, qty, status, created_at) VALUES (?, ?, ?, 'active', datetime('now'))`,
                            [targetPartId, advice.project_id, targetQty],
                            function(insErr) {
                                if (insErr) {
                                    activeDb.run('ROLLBACK');
                                    return res.status(500).json({ error: insErr.message });
                                }
                                activeDb.run('COMMIT');
                                return res.json({ message: 'Alternatief toegepast en onderdeel toegevoegd', reservation_id: this.lastID });
                            }
                        );
                    }
                );
            });
        });
    });
});
// Weekly schedule: every Monday at 09:00
cron.schedule('0 9 * * 1', () => {
    console.log('[Backup] Weekly scheduled backup started');
    backupDatabase((err, file) => {
        if (err) console.error('[Backup] Failed:', err);
        else console.log('[Backup] Created:', file);
    });
});

// Self-service password change for teacher/expert/toa
app.post('/api/change_password', async (req, res) => {
    const { userId, oldPassword, newPassword, userRole } = req.body;
    if (!userId || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'userId, oud wachtwoord en nieuw wachtwoord zijn verplicht' });
    }
    if (!['teacher','toa','expert'].includes(userRole)) {
        return res.status(403).json({ error: 'Ongeautoriseerd' });
    }
    const activeDb = getActiveDb(req);
    activeDb.get('SELECT id, password FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden' });

        const match = await bcrypt.compare(oldPassword, user.password || '');
        if (!match) return res.status(401).json({ error: 'Oude wachtwoord is onjuist' });

        const hashed = await bcrypt.hash(newPassword, 10);
        activeDb.run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            logAction(req, 'user:change_password', userId, { id: userId });
            res.json({ message: 'Wachtwoord bijgewerkt' });
        });
    });
});
