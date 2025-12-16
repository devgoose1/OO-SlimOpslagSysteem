const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { db } = require('./database');

// Initialiseer Express app
const app = express();
const port = 3000;

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


// DATABASE DINGEN

// Lijst met onderdelen en hun beschikbaarheid
app.get('/api/onderdelen', (req, res) => {
    const query = `
        SELECT 
            o.id,
            o.name,
            o.sku AS artikelnummer,
            o.description,
            o.location,
            o.total_quantity,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            o.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS available_quantity
        FROM onderdelen o
        LEFT JOIN reservations r ON r.onderdeel_id = o.id
        GROUP BY o.id
        ORDER BY o.name
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Nieuw onderdeel toevoegen
app.post('/api/onderdelen', (req, res) => {
    const { name, artikelnummer, description, location, total_quantity } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const qty = Number(total_quantity ?? 0);
    db.run(
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
    
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const newTotal = Number(total_quantity);

    // Eerst controleren of het nieuwe totaal niet lager is dan het aantal gereserveerd
    db.get(
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

            db.run(
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
    
    // Check eerst of er actieve reserveringen zijn
    db.get(
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
            db.run('DELETE FROM onderdelen WHERE id = ?', [id], function (err) {
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
    if (!onderdeel_id || !project_id || !reserveQty) {
        return res.status(400).json({ error: 'onderdeel_id, project_id en aantal verplicht' });
    }

    // Eerst checken of er genoeg beschikbaar is
    db.get(
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
            db.run(
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
    const query = `
        SELECT p.id, p.name, p.category_id, c.name AS category_name
        FROM projects p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Nieuw project aanmaken
app.post('/api/projects', (req, res) => {
    const { name, category_id } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const catId = category_id ? Number(category_id) : null;
    
    db.run(
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
    db.get(
        `SELECT COUNT(*) as count FROM reservations WHERE project_id = ? AND status = 'active'`,
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row.count > 0) {
                return res.status(400).json({ error: `Kan niet verwijderen: ${row.count} actieve reservering(en)` });
            }
            db.run('DELETE FROM projects WHERE id = ?', [id], function (err) {
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
    db.all(query, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Alle reserveringen ophalen (met onderdeel en project info)
app.get('/api/reserveringen', (req, res) => {
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
    
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Reservering releasen (maakt weer beschikbaar)
app.patch('/api/reserveringen/:id/release', (req, res) => {
    const { id } = req.params;
    
    db.run(
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
    db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Categorie aanmaken
app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    db.run('INSERT INTO categories (name) VALUES (?)', [name], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Categorie bestaat al' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, name });
    });
});

// Categorie verwijderen (alleen als geen projecten eraan hangen)
app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT COUNT(*) as count FROM projects WHERE category_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) {
            return res.status(400).json({ error: `Kan niet verwijderen: ${row.count} project(en) gebruikt deze categorie` });
        }
        db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Categorie niet gevonden' });
            res.json({ message: 'Categorie verwijderd', id: Number(id) });
        });
    });
});

// Start de server
app.listen(port, () => {
    console.log(`Server staat aan op http://localhost:${port}`);
});