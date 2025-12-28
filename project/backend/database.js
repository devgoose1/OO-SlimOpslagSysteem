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
            links TEXT,
            image_url TEXT
        )
    `);

    database.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category_id INTEGER,
            locker_number TEXT,
            team_account_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (team_account_id) REFERENCES users(id)
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
            status TEXT NOT NULL CHECK (status IN ('pending','active','released','consumed','denied','unassigned','returned')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            decision_reason TEXT,
            decided_by INTEGER,
            decided_at TEXT,
            taken_home INTEGER NOT NULL DEFAULT 0,
            due_date TEXT,
            checkout_by INTEGER,
            checkout_at TEXT,
            returned_at TEXT,
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (decided_by) REFERENCES users(id),
            FOREIGN KEY (checkout_by) REFERENCES users(id)
        )
    `);

    // Users tabel voor authenticatie (voeg 'toa' rol toe en project_id voor team accounts)
    database.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'expert', 'admin', 'toa', 'team')),
            project_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    `, callback);

    // Migrate existing 'reservations' table to include 'pending'/'denied' statuses and decision columns
    database.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='reservations'`, (err, row) => {
        if (!err && row && row.sql) {
            const sql = row.sql;
            const hasPending = sql.includes("'pending'");
            const hasDenied = sql.includes("'denied'");
            const hasUnassigned = sql.includes("'unassigned'");
            const hasReturned = sql.includes("'returned'");
            const hasDecisionCols = sql.includes('decision_reason') || sql.includes('decided_by') || sql.includes('decided_at');
            const hasTakenHome = sql.includes('taken_home');
            const hasDueDate = sql.includes('due_date');
            const hasCheckoutBy = sql.includes('checkout_by');
            const hasCheckoutAt = sql.includes('checkout_at');
            const hasReturnedAt = sql.includes('returned_at');
            if (!hasPending || !hasDenied || !hasUnassigned || !hasReturned || !hasDecisionCols) {
                database.serialize(() => {
                    database.run('PRAGMA foreign_keys=OFF');
                    database.run('BEGIN TRANSACTION');
                    database.run(`
                        CREATE TABLE reservations_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            onderdeel_id INTEGER NOT NULL,
                            project_id INTEGER NOT NULL,
                            qty INTEGER NOT NULL CHECK (qty >= 0),
                            status TEXT NOT NULL CHECK (status IN ('pending','active','released','consumed','denied','unassigned','returned')),
                            created_at TEXT NOT NULL DEFAULT (datetime('now')),
                            decision_reason TEXT,
                            decided_by INTEGER,
                            decided_at TEXT,
                            taken_home INTEGER NOT NULL DEFAULT 0,
                            due_date TEXT,
                            checkout_by INTEGER,
                            checkout_at TEXT,
                            returned_at TEXT,
                            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
                            FOREIGN KEY (project_id) REFERENCES projects(id),
                            FOREIGN KEY (decided_by) REFERENCES users(id),
                            FOREIGN KEY (checkout_by) REFERENCES users(id)
                        )
                    `);
                    // Copy existing rows; unknown statuses remain as-is. New cols are NULL by default.
                    database.run(`
                        INSERT INTO reservations_new (id, onderdeel_id, project_id, qty, status, created_at, decision_reason, decided_by, decided_at, taken_home, due_date, checkout_by, checkout_at, returned_at)
                        SELECT id, onderdeel_id, project_id, qty, status, created_at, decision_reason, decided_by, decided_at, 0, NULL, NULL, NULL, NULL FROM reservations
                    `);
                    database.run('DROP TABLE reservations');
                    database.run('ALTER TABLE reservations_new RENAME TO reservations');
                    database.run('COMMIT');
                    database.run('PRAGMA foreign_keys=ON');
                });
            } else {
                // If table exists with basic columns, ensure new columns are present via ALTERs (no-op if already exists)
                if (!hasTakenHome) database.run(`ALTER TABLE reservations ADD COLUMN taken_home INTEGER NOT NULL DEFAULT 0`);
                if (!hasDueDate) database.run(`ALTER TABLE reservations ADD COLUMN due_date TEXT`);
                if (!hasCheckoutBy) database.run(`ALTER TABLE reservations ADD COLUMN checkout_by INTEGER`);
                if (!hasCheckoutAt) database.run(`ALTER TABLE reservations ADD COLUMN checkout_at TEXT`);
                if (!hasReturnedAt) database.run(`ALTER TABLE reservations ADD COLUMN returned_at TEXT`);
            }
        }
    });

    // Recreate part_availability view after reservation migrations so source table exists
    database.run('DROP VIEW IF EXISTS part_availability');
    database.run(`
        CREATE VIEW IF NOT EXISTS part_availability AS
        SELECT
            p.id,
            p.name,
            p.total_quantity,
            COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.qty END), 0) AS reserved_quantity,
            p.total_quantity - COALESCE(SUM(CASE WHEN r.status IN ('active','unassigned') THEN r.qty END), 0) AS available_quantity
        FROM onderdelen p
        LEFT JOIN reservations r ON r.onderdeel_id = p.id
        GROUP BY p.id
    `);

    // Migrate existing 'users' table if CHECK constraint misses 'team'
    database.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`, (err, row) => {
        if (!err && row && row.sql && !row.sql.includes("'team'")) {
            // Recreate users table with updated CHECK constraint including 'team'
            database.serialize(() => {
                database.run('PRAGMA foreign_keys=OFF');
                database.run('BEGIN TRANSACTION');
                database.run(`
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL UNIQUE,
                        password TEXT NOT NULL,
                        role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'expert', 'admin', 'toa', 'team')),
                        project_id INTEGER,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        FOREIGN KEY (project_id) REFERENCES projects(id)
                    )
                `);
                database.run(`
                    INSERT INTO users_new (id, username, password, role, project_id, created_at)
                    SELECT id, username, password, role, project_id, created_at FROM users
                `);
                database.run('DROP TABLE users');
                database.run('ALTER TABLE users_new RENAME TO users');
                database.run('COMMIT');
                database.run('PRAGMA foreign_keys=ON');
            });
        }
    });

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
            ordered_by INTEGER,
            ordered_at TEXT,
            received_by INTEGER,
            received_at TEXT,
            denied_by INTEGER,
            denied_at TEXT,
            deny_reason TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `);

    // Ensure columns exist for purchase_requests lifecycle (SQLite allows ADD COLUMN)
    database.run(`ALTER TABLE purchase_requests ADD COLUMN ordered_by INTEGER`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN ordered_at TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN received_by INTEGER`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN received_at TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN denied_by INTEGER`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN denied_at TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN deny_reason TEXT`, () => {});

    // Team adviezen / opmerkingen met optionele onderdeel-suggesties
    database.run(`
        CREATE TABLE IF NOT EXISTS team_advice (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            author_user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            onderdeel_id INTEGER,
            qty INTEGER DEFAULT 1 CHECK (qty > 0),
            status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','denied','adjusted')),
            decision_reason TEXT,
            decided_by INTEGER,
            decided_at TEXT,
            alt_onderdeel_id INTEGER,
            alt_qty INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (author_user_id) REFERENCES users(id),
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            FOREIGN KEY (decided_by) REFERENCES users(id),
            FOREIGN KEY (alt_onderdeel_id) REFERENCES onderdelen(id)
        )
    `);

    // Audit log for actions
    database.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            actor_user_id INTEGER,
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (actor_user_id) REFERENCES users(id)
        )
    `);

    // Migrate existing databases: add columns if they don't exist
    database.run(`ALTER TABLE onderdelen ADD COLUMN links TEXT`, () => {});
    database.run(`ALTER TABLE onderdelen ADD COLUMN image_url TEXT`, () => {});
    database.run(`ALTER TABLE categories ADD COLUMN start_date TEXT`, () => {});
    database.run(`ALTER TABLE categories ADD COLUMN end_date TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN urgency TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN needed_by TEXT`, () => {});
    database.run(`ALTER TABLE purchase_requests ADD COLUMN category_id INTEGER`, () => {});
    database.run(`ALTER TABLE projects ADD COLUMN locker_number TEXT`, () => {});
    database.run(`ALTER TABLE projects ADD COLUMN team_account_id INTEGER`, () => {});
    database.run(`ALTER TABLE users ADD COLUMN project_id INTEGER`, () => {});

    // Favorites table - per user, per onderdeel
    database.run(`
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            onderdeel_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id),
            UNIQUE (user_id, onderdeel_id)
        )
    `);

    // Reservation notes - SMS/chat style met permission control
    database.run(`
        CREATE TABLE IF NOT EXISTS reservation_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reservation_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            author_role TEXT NOT NULL CHECK (author_role IN ('student', 'teacher', 'expert', 'admin', 'toa', 'team')),
            content TEXT NOT NULL,
            visible_to_teams INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (reservation_id) REFERENCES reservations(id),
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    // Add return_date to reservations if not exists
    database.run(`ALTER TABLE reservations ADD COLUMN return_date TEXT`, () => {});
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