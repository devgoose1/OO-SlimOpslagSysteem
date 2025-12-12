const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/opslag.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS opslag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`
    );

    db.run(`
        
    `)
})