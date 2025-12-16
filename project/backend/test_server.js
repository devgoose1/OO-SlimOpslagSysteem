const express = require('express');
const { db, testDb } = require('./database');

const app = express();
app.use(express.json());

// Simple test
app.get('/status', (req, res) => {
    res.json({ status: 'OK' });
});

// Test login
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(user || { error: 'Not found' });
    });
});

app.listen(3000, () => {
    console.log('Test server on port 3000');
});
