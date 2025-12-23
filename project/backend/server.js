const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');

const { db, testDb } = require('./database');

// Initialiseer Express app
const app = express();
const port = 3000;

// Helper function: get database based on request query parameter
const getActiveDb = (req) => {
    return req.query.testMode === 'true' || req.body?.testMode === true ? testDb : db;
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
    
    if (!['student', 'teacher', 'expert', 'admin', 'toa'].includes(role)) {
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
        res.json({ message: 'Gebruiker verwijderd' });
    });
});

// Update user role
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role || !['student', 'teacher', 'expert', 'admin', 'toa'].includes(role)) {
        return res.status(400).json({ error: 'Ongeldige rol' });
    }
    
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
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
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            o.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS available_quantity,
            CASE 
                WHEN o.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) < 5 THEN 1
                ELSE 0
            END AS low_stock_warning
        FROM onderdelen o
        LEFT JOIN reservations r ON r.onderdeel_id = o.id
        GROUP BY o.id
        ORDER BY o.name
    `;

    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Nieuw onderdeel toevoegen
app.post('/api/onderdelen', (req, res) => {
    const { name, artikelnummer, description, location, total_quantity } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const qty = Number(total_quantity ?? 0);
    const activeDb = getActiveDb(req);
    activeDb.run(
        `INSERT INTO onderdelen (name, sku, description, location, total_quantity)
        VALUES (?, ?, ?, ?, ?)`,
        [name, artikelnummer || null, description || null, location || null, qty],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Onderdeel updaten
app.put('/api/onderdelen/:id', (req, res) => {
    const { id } = req.params;
    const { name, artikelnummer, description, location, total_quantity } = req.body;
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

            activeDb.run(
                `UPDATE onderdelen 
                 SET name = ?, sku = ?, description = ?, location = ?, total_quantity = ?
                 WHERE id = ?`,
                [name, artikelnummer || null, description || null, location || null, newTotal, id],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'Onderdeel niet gevonden' });
                    }
                    res.json({ message: 'Onderdeel geüpdatet', id: Number(id) });
                }
            );
        }
    );
});

// Onderdeel verwijderen (alleen als geen actieve reserveringen)
app.delete('/api/onderdelen/:id', (req, res) => {
    const { id } = req.params;
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
                res.json({ message: 'Onderdeel verwijderd', id: Number(id) });
            });
        }
    );
});

// Reservering plaatsen (haalt 1 onderdeel van de beschikbaarheid af)
app.post('/api/reserveringen', (req, res) => {
    const { onderdeel_id, project_id, aantal } = req.body;
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
    const { name, category_id } = req.body;
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
            res.status(201).json({ id: this.lastID, name, category_id: catId });
        }
    );
});

// Project verwijderen (alleen als geen actieve reserveringen)
app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
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

// Reservering releasen (maakt weer beschikbaar)
app.patch('/api/reserveringen/:id/release', (req, res) => {
    const { id } = req.params;
    const activeDb = getActiveDb(req);
    
    activeDb.run(
        `UPDATE reservations SET status = 'released' WHERE id = ? AND status = 'active'`,
        [id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Reservering niet gevonden of al released' });
            }
            res.json({ message: 'Reservering released', id: Number(id) });
        }
    );
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
    const { name, start_date, end_date } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const activeDb = getActiveDb(req);
    activeDb.run('INSERT INTO categories (name, start_date, end_date) VALUES (?, ?, ?)', [name, start_date || null, end_date || null], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Categorie bestaat al' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, name, start_date, end_date });
    });
});

// Categorie verwijderen (alleen als geen projecten eraan hangen)
app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const activeDb = getActiveDb(req);
    activeDb.get('SELECT COUNT(*) as count FROM projects WHERE category_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) {
            return res.status(400).json({ error: `Kan niet verwijderen: ${row.count} project(en) gebruikt deze categorie` });
        }
        activeDb.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Categorie niet gevonden' });
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
});// Start de server
app.listen(port, () => {
    console.log(`Server staat aan op http://localhost:${port}`);
});

// PURCHASE REQUESTS (aanvraag: 'bestellen voor aankoop')
// Docenten kunnen aanvragen aanmaken; TOA kan alle aanvragen inzien.
app.post('/api/purchase_requests', (req, res) => {
    const { onderdeel_id, user_id, qty, urgency, needed_by, category_id } = req.body;
    const activeDb = getActiveDb(req);
    if (!onderdeel_id || !user_id || !qty) {
        return res.status(400).json({ error: 'onderdeel_id, user_id en qty verplicht' });
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
        WHERE pr.status = 'open'
        ORDER BY pr.created_at DESC
    `;

    activeDb.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse links JSON
        const parsed = rows.map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
        res.json(parsed);
    });
});

// ===== Backups =====
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const backupDatabase = (callback) => {
    try {
        const dbDir = path.join(__dirname, 'database');
        const src = path.join(dbDir, 'opslag.db');
        const backupDir = path.join(dbDir, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const ts = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const stamp = `${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
        const dst = path.join(backupDir, `opslag-${stamp}.db`);
        fs.copyFile(src, dst, (err) => {
            if (callback) callback(err, dst);
        });
    } catch (e) {
        if (callback) callback(e);
    }
};

// On-demand backup endpoint
app.post('/api/backup', (req, res) => {
    backupDatabase((err, file) => {
        if (err) return res.status(500).json({ error: 'Backup mislukt', details: err.message });
        res.json({ message: 'Backup gelukt', file });
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