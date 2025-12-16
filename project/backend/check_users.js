const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/opslag.db');

db.all('SELECT id, username, role FROM users', (err, rows) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log('Users in database:');
        rows.forEach(row => console.log(`  - ${row.username} (${row.role})`));
        if (rows.length === 0) {
            console.log('  (no users found)');
        }
    }
    db.close();
});
