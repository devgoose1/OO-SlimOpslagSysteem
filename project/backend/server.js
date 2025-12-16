const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { db, seed } = require('./database');

// Initialiseer Express app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

seed();

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
    db.all('SELECT * FROM part_availability ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Nieuw onderdeel toevoegen
app.post('/api/onderdelen', (req, res) => {
    const { name, sku, description, location, total_quantity } = req.body;
    if (!name) return res.status(400).json({ error: 'naam is verplicht' });
    const qty = Number(total_quantity ?? 0);
    db.run(
        `INSERT INTO onderdelen (name, sku, description, location, total_quantity)
        VALUES (?, ?, ?, ?, ?)`,
        [name, sku || null, description || null, location || null, qty],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Reservering plaatsen (haalt 1 onderdeel van de beschikbaarheid af)
app.post('/api/reserveringen', (req, res) => {
    const { onderdeel_id, project_id, qty } = req.body;
    const reserveQty = Number(qty);
    if (!onderdeel_id || !project_id || !reserveQty) {
        return res.status(400).json({ error: 'onderdeel_id, project_id en qty verplicht' });
    }
    db.run(
        `INSERT INTO reservations (onderdeel_id, project_id, qty, status)
        VALUES (?, ?, ?, 'active')`,
        [onderdeel_id, project_id, reserveQty],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Start de server
app.listen(port, () => {
    console.log(`Server staat aan op http://localhost:${port}`);
});