const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'opslag.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS onderdelen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT,
            description TEXT,
            location TEXT,
            total_quantity INTEGER NOT NULL DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    `);

    // Probeer kolom toe te voegen als die nog niet bestaat (fout negeren als kolom al bestaat)
    db.run(`ALTER TABLE projects ADD COLUMN category_id INTEGER`, () => {});

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            onderdeel_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            qty INTEGER NOT NULL CHECK (qty >= 0),
            status TEXT NOT NULL CHECK (status IN ('active', 'released', 'consumed')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    `);

    db.run(`
        CREATE VIEW IF NOT EXISTS part_availability AS
        SELECT
            p.id,
            p.name,
            p.total_quantity,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            p.total_quantity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS available_quantity
        FROM onderdelen p
        LEFT JOIN reservations r ON r.onderdeel_id = p.id
        GROUP BY p.id
    `);

    // Users tabel voor authenticatie
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'expert', 'admin')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    // Maak standaard admin gebruiker aan (alleen als er nog geen users zijn)
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (!err && row.count === 0) {
            // Standaard wachtwoorden (in productie moet dit gehashed worden!)
            db.run(`INSERT INTO users (username, password, role) VALUES 
                ('admin', 'admin123', 'admin'),
                ('docent', 'docent123', 'teacher'),
                ('expert', 'expert123', 'expert')
            `);
        }
    });
});

module.exports = { db };