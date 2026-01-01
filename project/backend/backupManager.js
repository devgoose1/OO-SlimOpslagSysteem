/**
 * Backup Manager - Volledige versioning, metadata, en migration support
 * Beheert backups met versie tracking en schema compatibility
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const zlib = require('zlib');

// ======== CONSTANTS ========
const CURRENT_SCHEMA_VERSION = 2; // Increment when schema changes
const BACKUP_MANIFEST_VERSION = 1;

// Alle tabellen die geback-upt moeten worden (in dependency order)
const TABLES_TO_BACKUP = [
    'categories',
    'onderdelen',
    'users',
    'projects',
    'reservations',
    'reservation_notes',
    'favorites',
    'purchase_requests',
    'team_advice',
    'audit_log',
    'ordernummers',
    'ordernummer_counters',
    'ordernummer_actions'
];

// Kolom migraties voor versie-compatibiliteit
const COLUMN_MIGRATIONS = {
    onderdelen: [
        { version: 1, columns: ['id', 'name', 'sku', 'description', 'location', 'total_quantity'] },
        { version: 2, columns: ['id', 'name', 'sku', 'description', 'location', 'total_quantity', 'links', 'image_url'] }
    ],
    reservations: [
        { version: 1, columns: ['id', 'onderdeel_id', 'project_id', 'qty', 'status', 'created_at', 'decided_at', 'decided_by', 'decision_reason'] },
        { version: 2, columns: ['id', 'onderdeel_id', 'project_id', 'qty', 'status', 'created_at', 'decided_at', 'decided_by', 'decision_reason', 'taken_home', 'due_date', 'checkout_by', 'checkout_at', 'returned_at', 'counter_type', 'counter_qty', 'counter_onderdeel_id', 'counter_status', 'counter_note', 'counter_response_note', 'counter_by', 'counter_by_role', 'request_note', 'return_date'] }
    ]
};

// ======== MAIN CLASS ========
class BackupManager {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.backupDir = path.join(baseDir, 'database', 'backups');
        this.metadataDir = path.join(this.backupDir, '.metadata');
        
        // Ensure directories exist
        if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
        if (!fs.existsSync(this.metadataDir)) fs.mkdirSync(this.metadataDir, { recursive: true });
    }

    /**
     * Create a full backup with metadata
     */
    createBackup(dbPath, callback) {
        try {
            const ts = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            const timestamp = `${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
            const backupName = `opslag-${timestamp}`;
            const backupFile = path.join(this.backupDir, `${backupName}.db`);
            const metadataFile = path.join(this.metadataDir, `${backupName}.json`);

            // Create backup metadata
            const metadata = {
                version: BACKUP_MANIFEST_VERSION,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                timestamp: ts.toISOString(),
                backupName: backupName,
                tables: {}
            };

            // Open source database to read metadata
            const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) return callback(err);

                // Collect table record counts
                let tablesProcessed = 0;
                TABLES_TO_BACKUP.forEach(tableName => {
                    sourceDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, row) => {
                        if (!err && row) {
                            metadata.tables[tableName] = { recordCount: row.count };
                        } else {
                            metadata.tables[tableName] = { recordCount: 0, error: 'Table not found' };
                        }

                        tablesProcessed++;
                        if (tablesProcessed === TABLES_TO_BACKUP.length) {
                            sourceDb.close((closeErr) => {
                                if (closeErr) console.error('Error closing source db:', closeErr);
                                
                                // Copy database file
                                fs.copyFile(dbPath, backupFile, (copyErr) => {
                                    if (copyErr) return callback(copyErr);

                                    // Write metadata
                                    fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), (metaErr) => {
                                        if (metaErr) {
                                            console.error('Warning: Could not write metadata:', metaErr);
                                            // Don't fail backup if metadata write fails
                                        }
                                        callback(null, { file: backupFile, metadata });
                                    });
                                });
                            });
                        }
                    });
                });
            });
        } catch (e) {
            callback(e);
        }
    }

    /**
     * Get metadata for a backup
     */
    getBackupMetadata(backupName, callback) {
        try {
            const metadataFile = path.join(this.metadataDir, `${path.basename(backupName, '.db')}.json`);
            
            if (!fs.existsSync(metadataFile)) {
                // Try to infer from backup file if metadata doesn't exist
                return callback(null, { 
                    version: BACKUP_MANIFEST_VERSION,
                    schemaVersion: 1, // Assume old version
                    legacy: true,
                    backupName: path.basename(backupName, '.db')
                });
            }

            fs.readFile(metadataFile, 'utf8', (err, data) => {
                if (err) return callback(err);
                try {
                    const metadata = JSON.parse(data);
                    callback(null, metadata);
                } catch (parseErr) {
                    callback(parseErr);
                }
            });
        } catch (e) {
            callback(e);
        }
    }

    /**
     * Validate if a file is a valid SQLite database
     */
    validateDatabase(dbPath, callback) {
        // Check if file exists
        if (!fs.existsSync(dbPath)) {
            return callback(new Error('Bestand niet gevonden'));
        }

        // Check file size
        const stats = fs.statSync(dbPath);
        if (stats.size === 0) {
            return callback(new Error('Bestand is leeg'));
        }

        // Check SQLite file header (first 16 bytes should be "SQLite format 3\0")
        try {
            const fd = fs.openSync(dbPath, 'r');
            const buffer = Buffer.alloc(16);
            fs.readSync(fd, buffer, 0, 16, 0);
            fs.closeSync(fd);

            const header = buffer.toString('utf8', 0, 15);
            if (header !== 'SQLite format 3') {
                return callback(new Error('Bestand is geen geldige SQLite database'));
            }
        } catch (e) {
            return callback(new Error('Kan bestand niet lezen: ' + e.message));
        }

        // Try to open the database and perform a simple query
        const testDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                return callback(new Error('Database kan niet worden geopend: ' + err.message));
            }

            // Try to read from sqlite_master to verify it's a working database
            testDb.get('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1', [], (queryErr) => {
                testDb.close();
                
                if (queryErr) {
                    return callback(new Error('Database is beschadigd of ongeldig: ' + queryErr.message));
                }
                
                callback(null, true);
            });
        });
    }

    /**
     * Merge backup into active database with schema migration
     */
    mergeBackup(backupPath, activeDb, callback) {
        try {
            // First validate that the file is a valid SQLite database
            this.validateDatabase(backupPath, (validateErr) => {
                if (validateErr) {
                    return callback(new Error('Ongeldige backup database: ' + validateErr.message));
                }

                this.getBackupMetadata(backupPath, (metadataErr, metadata) => {
                    if (metadataErr) {
                        console.error('Warning: Could not read backup metadata:', metadataErr);
                        metadata = { schemaVersion: 1, legacy: true };
                    }

                    const backupDb = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
                        if (err) return callback(err);

                        console.log(`[Backup Merge] Starting merge (backup schema v${metadata.schemaVersion}, current v${CURRENT_SCHEMA_VERSION})`);

                        this._performMerge(backupDb, activeDb, metadata, (mergeErr) => {
                            backupDb.close((closeErr) => {
                                if (closeErr) console.error('Error closing backup db:', closeErr);
                                callback(mergeErr);
                            });
                        });
                    });
                });
            });
        } catch (e) {
            callback(e);
        }
    }

    /**
     * Perform the actual merge operation
     */
    _performMerge(backupDb, activeDb, metadata, callback) {
        const dbAllAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const dbGetAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const dbRunAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        const getTableColumns = async (db, tableName) => {
            try {
                const cols = await dbAllAsync(db, `PRAGMA table_info(${tableName})`);
                return cols.map(c => c.name);
            } catch (e) {
                return [];
            }
        };

        const getTableSchema = async (db, tableName) => {
            try {
                const result = await dbGetAsync(db, `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
                return result ? result.sql : null;
            } catch (e) {
                return null;
            }
        };

        (async () => {
            try {
                const idMaps = {
                    categoryIdMap: {},
                    onderdeelIdMap: {},
                    userIdMap: {},
                    projectIdMap: {}
                };

                // ========== MERGE CATEGORIES ==========
                console.log('[Backup Merge] Merging categories...');
                const categories = await dbAllAsync(backupDb, 'SELECT * FROM categories');
                for (const c of categories) {
                    const existing = await dbGetAsync(activeDb, 'SELECT id FROM categories WHERE name = ?', [c.name]);
                    if (existing) {
                        idMaps.categoryIdMap[c.id] = existing.id;
                    } else {
                        const result = await dbRunAsync(activeDb,
                            'INSERT INTO categories (name, start_date, end_date) VALUES (?, ?, ?)',
                            [c.name, c.start_date || null, c.end_date || null]
                        );
                        idMaps.categoryIdMap[c.id] = result.lastID;
                    }
                }
                console.log(`[Backup Merge] Categories merged: ${categories.length}`);

                // ========== MERGE ONDERDELEN ==========
                console.log('[Backup Merge] Merging onderdelen...');
                const onderdeelCols = await getTableColumns(backupDb, 'onderdelen');
                const onderdelen = await dbAllAsync(backupDb, 'SELECT * FROM onderdelen');
                for (const o of onderdelen) {
                    const sku = o.sku || o.artikelnummer || null;
                    const existing = await dbGetAsync(activeDb, 'SELECT id FROM onderdelen WHERE name = ? AND sku = ?', [o.name, sku]);
                    if (existing) {
                        idMaps.onderdeelIdMap[o.id] = existing.id;
                    } else {
                        const result = await dbRunAsync(activeDb,
                            'INSERT INTO onderdelen (name, sku, description, location, total_quantity, links, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [o.name, sku, o.description || null, o.location || null, o.total_quantity || 0, o.links || null, o.image_url || o.imageUrl || null]
                        );
                        idMaps.onderdeelIdMap[o.id] = result.lastID;
                    }
                }
                console.log(`[Backup Merge] Onderdelen merged: ${onderdelen.length}`);

                // ========== MERGE USERS ==========
                console.log('[Backup Merge] Merging users...');
                const users = await dbAllAsync(backupDb, 'SELECT * FROM users WHERE role != ?', ['admin']);
                for (const u of users) {
                    const existing = await dbGetAsync(activeDb, 'SELECT id FROM users WHERE username = ?', [u.username]);
                    if (existing) {
                        idMaps.userIdMap[u.id] = existing.id;
                    } else {
                        const result = await dbRunAsync(activeDb,
                            'INSERT INTO users (username, password, role, project_id, created_at) VALUES (?, ?, ?, ?, ?)',
                            [u.username, u.password, u.role, u.project_id || null, u.created_at || new Date().toISOString()]
                        );
                        idMaps.userIdMap[u.id] = result.lastID;
                    }
                }
                console.log(`[Backup Merge] Users merged: ${users.length}`);

                // ========== MERGE PROJECTS ==========
                console.log('[Backup Merge] Merging projects...');
                const projects = await dbAllAsync(backupDb, 'SELECT * FROM projects');
                for (const p of projects) {
                    const existing = await dbGetAsync(activeDb, 'SELECT id FROM projects WHERE name = ?', [p.name]);
                    if (existing) {
                        idMaps.projectIdMap[p.id] = existing.id;
                    } else {
                        const newCategoryId = idMaps.categoryIdMap[p.category_id] || null;
                        const teamAccountId = p.team_account_id ? (idMaps.userIdMap[p.team_account_id] || null) : null;
                        const result = await dbRunAsync(activeDb,
                            'INSERT INTO projects (name, category_id, locker_number, team_account_id) VALUES (?, ?, ?, ?)',
                            [p.name, newCategoryId, p.locker_number || null, teamAccountId]
                        );
                        idMaps.projectIdMap[p.id] = result.lastID;
                    }
                }

                // Update user project_id references
                for (const u of users) {
                    if (u.project_id && idMaps.projectIdMap[u.project_id] && idMaps.userIdMap[u.id]) {
                        await dbRunAsync(activeDb,
                            'UPDATE users SET project_id = ? WHERE id = ?',
                            [idMaps.projectIdMap[u.project_id], idMaps.userIdMap[u.id]]
                        );
                    }
                }
                console.log(`[Backup Merge] Projects merged: ${projects.length}`);

                // ========== MERGE RESERVATIONS ==========
                console.log('[Backup Merge] Merging reservations...');
                const reservations = await dbAllAsync(backupDb, 'SELECT * FROM reservations');
                for (const r of reservations) {
                    const newOnderdeelId = idMaps.onderdeelIdMap[r.onderdeel_id];
                    const newProjectId = idMaps.projectIdMap[r.project_id];
                    const decidedBy = r.decided_by ? (idMaps.userIdMap[r.decided_by] || null) : null;
                    const checkoutBy = r.checkout_by ? (idMaps.userIdMap[r.checkout_by] || null) : null;
                    const qty = r.qty || r.aantal || r.quantity || 1;

                    if (newOnderdeelId && newProjectId) {
                        const existingRes = await dbGetAsync(activeDb,
                            'SELECT id FROM reservations WHERE onderdeel_id = ? AND project_id = ? AND qty = ? AND created_at = ?',
                            [newOnderdeelId, newProjectId, qty, r.created_at]
                        );
                        if (!existingRes) {
                            const values = [
                                newOnderdeelId, newProjectId, qty, r.status || 'active',
                                r.decision_reason || null, decidedBy, r.decided_at || null, r.created_at,
                                r.taken_home || 0, r.due_date || null, checkoutBy, r.checkout_at || null,
                                r.returned_at || null,
                                r.counter_type || null, r.counter_qty || null, r.counter_onderdeel_id || null,
                                r.counter_status || null, r.counter_note || null, r.counter_response_note || null,
                                r.counter_by || null, r.counter_by_role || null,
                                r.request_note || null, r.return_date || null
                            ];
                            await dbRunAsync(activeDb,
                                `INSERT INTO reservations (
                                    onderdeel_id, project_id, qty, status, decision_reason, decided_by, decided_at, created_at,
                                    taken_home, due_date, checkout_by, checkout_at, returned_at,
                                    counter_type, counter_qty, counter_onderdeel_id, counter_status, counter_note, counter_response_note,
                                    counter_by, counter_by_role, request_note, return_date
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                values
                            );
                        }
                    }
                }
                console.log(`[Backup Merge] Reservations merged: ${reservations.length}`);

                // ========== MERGE RESERVATION_NOTES ==========
                console.log('[Backup Merge] Merging reservation_notes...');
                try {
                    const notes = await dbAllAsync(backupDb, 'SELECT * FROM reservation_notes');
                    // Note: We need reservation_id mapping - skip for now if reservations don't match exactly
                    // This should be improved with a more sophisticated approach
                    console.log(`[Backup Merge] Reservation notes found: ${notes.length} (partial merge)`);
                } catch (e) {
                    console.log('[Backup Merge] Reservation notes table not found, skipping');
                }

                // ========== MERGE FAVORITES ==========
                console.log('[Backup Merge] Merging favorites...');
                try {
                    const favorites = await dbAllAsync(backupDb, 'SELECT * FROM favorites');
                    for (const fav of favorites) {
                        const newUserId = idMaps.userIdMap[fav.user_id];
                        const newOnderdeelId = idMaps.onderdeelIdMap[fav.onderdeel_id];
                        if (newUserId && newOnderdeelId) {
                            const existing = await dbGetAsync(activeDb,
                                'SELECT id FROM favorites WHERE user_id = ? AND onderdeel_id = ?',
                                [newUserId, newOnderdeelId]
                            );
                            if (!existing) {
                                await dbRunAsync(activeDb,
                                    'INSERT INTO favorites (user_id, onderdeel_id, created_at) VALUES (?, ?, ?)',
                                    [newUserId, newOnderdeelId, fav.created_at || new Date().toISOString()]
                                );
                            }
                        }
                    }
                    console.log(`[Backup Merge] Favorites merged: ${favorites.length}`);
                } catch (e) {
                    console.log('[Backup Merge] Favorites table not found, skipping');
                }

                // ========== MERGE PURCHASE_REQUESTS ==========
                console.log('[Backup Merge] Merging purchase_requests...');
                try {
                    const purchaseRequests = await dbAllAsync(backupDb, 'SELECT * FROM purchase_requests');
                    for (const pr of purchaseRequests) {
                        const newOnderdeelId = idMaps.onderdeelIdMap[pr.onderdeel_id];
                        const requestedBy = idMaps.userIdMap[pr.user_id] || idMaps.userIdMap[pr.requested_by] || null;

                        if (newOnderdeelId) {
                            const existingPr = await dbGetAsync(activeDb,
                                'SELECT id FROM purchase_requests WHERE onderdeel_id = ? AND qty = ? AND created_at = ?',
                                [newOnderdeelId, pr.qty, pr.created_at]
                            );
                            if (!existingPr) {
                                const values = [
                                    newOnderdeelId, pr.qty, pr.urgency || 'normaal', pr.needed_by || null,
                                    idMaps.categoryIdMap[pr.category_id] || null, pr.status || 'open', pr.links || null,
                                    pr.ordered_by || null, pr.ordered_at || null, pr.received_by || null, pr.received_at || null,
                                    pr.denied_by || null, pr.denied_at || null, pr.deny_reason || null, requestedBy, pr.created_at
                                ];
                                await dbRunAsync(activeDb,
                                    `INSERT INTO purchase_requests (
                                        onderdeel_id, qty, urgency, needed_by, category_id, status, links,
                                        ordered_by, ordered_at, received_by, received_at, denied_by, denied_at, deny_reason,
                                        user_id, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    values
                                );
                            }
                        }
                    }
                    console.log(`[Backup Merge] Purchase requests merged: ${purchaseRequests.length}`);
                } catch (e) {
                    console.log('[Backup Merge] Purchase requests table not found, skipping');
                }

                // ========== MERGE TEAM_ADVICE ==========
                console.log('[Backup Merge] Merging team_advice...');
                try {
                    const advice = await dbAllAsync(backupDb, 'SELECT * FROM team_advice');
                    for (const adv of advice) {
                        const newProjectId = idMaps.projectIdMap[adv.project_id];
                        const authorId = idMaps.userIdMap[adv.author_user_id];
                        const decisionBy = adv.decided_by ? (idMaps.userIdMap[adv.decided_by] || null) : null;

                        if (newProjectId && authorId) {
                            const values = [
                                newProjectId, authorId, adv.content, idMaps.onderdeelIdMap[adv.onderdeel_id] || null,
                                adv.qty || 1, adv.status || 'open', adv.decision_reason || null, decisionBy, adv.decided_at || null,
                                idMaps.onderdeelIdMap[adv.alt_onderdeel_id] || null, adv.alt_qty || null, adv.created_at
                            ];
                            await dbRunAsync(activeDb,
                                `INSERT INTO team_advice (
                                    project_id, author_user_id, content, onderdeel_id, qty, status, decision_reason,
                                    decided_by, decided_at, alt_onderdeel_id, alt_qty, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                values
                            );
                        }
                    }
                    console.log(`[Backup Merge] Team advice merged: ${advice.length}`);
                } catch (e) {
                    console.log('[Backup Merge] Team advice table not found, skipping');
                }

                // ========== MERGE AUDIT_LOG ==========
                console.log('[Backup Merge] Merging audit_log...');
                try {
                    const auditLogs = await dbAllAsync(backupDb, 'SELECT * FROM audit_log');
                    for (const a of auditLogs) {
                        const actor = a.actor_user_id ? (idMaps.userIdMap[a.actor_user_id] || null) : null;
                        await dbRunAsync(activeDb,
                            'INSERT INTO audit_log (action, actor_user_id, details, created_at) VALUES (?, ?, ?, ?)',
                            [a.action, actor, a.details || null, a.created_at || null]
                        );
                    }
                    console.log(`[Backup Merge] Audit logs merged: ${auditLogs.length}`);
                } catch (e) {
                    console.log('[Backup Merge] Audit log table not found, skipping');
                }

                // ========== MERGE ORDERNUMMERS ==========
                console.log('[Backup Merge] Merging ordernummers...');
                try {
                    const ordernummers = await dbAllAsync(backupDb, 'SELECT * FROM ordernummers');
                    for (const ordn of ordernummers) {
                        const createdBy = idMaps.userIdMap[ordn.created_by] || null;
                        const projectId = ordn.project_id ? (idMaps.projectIdMap[ordn.project_id] || null) : null;
                        const onderdeelId = ordn.onderdeel_id ? (idMaps.onderdeelIdMap[ordn.onderdeel_id] || null) : null;

                        const existing = await dbGetAsync(activeDb,
                            'SELECT id FROM ordernummers WHERE ordernummer = ?',
                            [ordn.ordernummer]
                        );
                        if (!existing && createdBy) {
                            const values = [
                                ordn.ordernummer, ordn.type, ordn.type_number, ordn.status || 'actief',
                                createdBy, ordn.created_at, projectId, onderdeelId,
                                ordn.change_description || null, ordn.before_value || null, ordn.after_value || null,
                                ordn.notes || null
                            ];
                            await dbRunAsync(activeDb,
                                `INSERT INTO ordernummers (
                                    ordernummer, type, type_number, status, created_by, created_at, project_id, onderdeel_id,
                                    change_description, before_value, after_value, notes
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                values
                            );
                        }
                    }
                    console.log(`[Backup Merge] Ordernummers merged: ${ordernummers.length}`);

                    // Also merge ordernummer counters
                    try {
                        const counters = await dbAllAsync(backupDb, 'SELECT * FROM ordernummer_counters');
                        for (const cnt of counters) {
                            // Update or insert counter
                            const existing = await dbGetAsync(activeDb, 'SELECT next_number FROM ordernummer_counters WHERE type = ?', [cnt.type]);
                            if (existing) {
                                // Keep the higher number
                                if (cnt.next_number > existing.next_number) {
                                    await dbRunAsync(activeDb, 'UPDATE ordernummer_counters SET next_number = ? WHERE type = ?', [cnt.next_number, cnt.type]);
                                }
                            } else {
                                await dbRunAsync(activeDb, 'INSERT INTO ordernummer_counters (type, next_number) VALUES (?, ?)', [cnt.type, cnt.next_number]);
                            }
                        }
                        console.log('[Backup Merge] Ordernummer counters merged');
                    } catch (e) {
                        console.log('[Backup Merge] Ordernummer counters not found, skipping');
                    }

                } catch (e) {
                    console.log('[Backup Merge] Ordernummers table not found, skipping');
                }

                console.log('[Backup Merge] Merge completed successfully!');
                callback(null, { message: 'Merge completed', tablesProcessed: TABLES_TO_BACKUP.length });

            } catch (e) {
                console.error('[Backup Merge] Fatal error in merge:', e.message);
                console.error('[Backup Merge] Stack:', e.stack);
                callback(e);
            }
        })().catch(err => {
            console.error('[Backup Merge] Unhandled error in async merge:', err);
            callback(err);
        });
    }

    /**
     * List all backups with metadata
     */
    listBackups(callback) {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return callback(null, []);
            }

            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.endsWith('.db'))
                .map(f => {
                    const filePath = path.join(this.backupDir, f);
                    const stats = fs.statSync(filePath);
                    return {
                        name: f,
                        date: stats.mtime,
                        size: stats.size,
                        backupName: path.basename(f, '.db')
                    };
                })
                .sort((a, b) => b.date - a.date);

            // Enrich with metadata
            let processed = 0;
            const backups = [];

            if (files.length === 0) {
                return callback(null, []);
            }

            files.forEach((file, index) => {
                this.getBackupMetadata(file.name, (err, metadata) => {
                    backups[index] = {
                        ...file,
                        metadata: metadata || { legacy: true, schemaVersion: 1 }
                    };

                    processed++;
                    if (processed === files.length) {
                        callback(null, backups);
                    }
                });
            });
        } catch (e) {
            callback(e);
        }
    }
}

module.exports = BackupManager;
