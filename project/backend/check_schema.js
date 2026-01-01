// Check database structure
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, 'database', 'opslag.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('DB Error:', err);
        process.exit(1);
    }

    console.log('📋 Database Schema:\n');

    // Get all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }

        tables.forEach(table => {
            console.log(`\n🔹 Table: ${table.name}`);
            db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    columns.forEach(col => {
                        console.log(`   - ${col.name} (${col.type})`);
                    });
                }
            });
        });

        setTimeout(() => {
            db.close();
            process.exit(0);
        }, 1000);
    });
});
