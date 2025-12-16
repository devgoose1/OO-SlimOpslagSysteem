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
            name TEXT NOT NULL UNIQUE
        )
    `);

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
});

// Random seed data
function seed() {
    db.run(`INSERT OR IGNORE INTO projects (name) VALUES ('Prototype A'), ('Lab B')`);
}

module.exports = { db, seed };