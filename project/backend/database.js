const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const dbPath = path.join(__dirname, 'database', 'opslag.db');
const testDbPath = path.join(__dirname, 'database', 'test_opslag.db');

const db = new sqlite3.Database(dbPath);
const testDb = new sqlite3.Database(testDbPath);

// Initialize both databases with same schema
const initializeDatabase = (database, callback) => {
    database.serialize(() => {
    database.run(`
        CREATE TABLE IF NOT EXISTS onderdelen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT,
            description TEXT,
            location TEXT,
            total_quantity INTEGER NOT NULL DEFAULT 0,
            links TEXT
        )
    `);

    database.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `);

    database.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            start_date TEXT,
            end_date TEXT
        )
    `);

    // Probeer kolom toe te voegen als die nog niet bestaat (fout negeren als kolom al bestaat)
    database.run(`ALTER TABLE projects ADD COLUMN category_id INTEGER`, () => {});

    database.run(`
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

    database.run(`
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

    // Users tabel voor authenticatie (voeg 'toa' rol toe)
    database.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'expert', 'admin', 'toa')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `, callback);

    // Tabel voor aankoopaanvragen door docenten
    database.run(`
        CREATE TABLE IF NOT EXISTS purchase_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            onderdeel_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            qty INTEGER NOT NULL CHECK (qty > 0),
            urgency TEXT NOT NULL DEFAULT 'normaal',
            needed_by TEXT,
            category_id INTEGER,
            status TEXT NOT NULL DEFAULT 'open',
            links TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `);

    // Migrate existing databases: add columns if they don't exist
    database.run(`ALTER TABLE onderdelen ADD COLUMN links TEXT`, () => {});
    database.run(`ALTER TABLE categories ADD COLUMN start_date TEXT`, () => {});
    database.run(`ALTER TABLE categories ADD COLUMN end_date TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN urgency TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN needed_by TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN category_id INTEGER`, () => {});
    });
};

// Initialize production database
initializeDatabase(db, () => {
    // Maak standaard admin gebruiker aan (alleen in production db)
    db.get('SELECT COUNT(*) as count FROM users', [], async (err, row) => {
        if (!err && row.count === 0) {
            // Hash passwords met bcrypt
            const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
            const docentHash = await bcrypt.hash('docent123', SALT_ROUNDS);
            const expertHash = await bcrypt.hash('expert123', SALT_ROUNDS);
            
            db.run(`INSERT INTO users (username, password, role) VALUES 
                ('admin', ?, 'admin'),
                ('docent', ?, 'teacher'),
                ('expert', ?, 'expert'),
                ('toa', ?, 'toa')
            `, [adminHash, docentHash, expertHash, await bcrypt.hash('toa123', SALT_ROUNDS)]);
        }
    });
});

// Initialize test database (no default users)
initializeDatabase(testDb, () => {
    console.log('Test database initialized');
});

module.exports = { db, testDb };