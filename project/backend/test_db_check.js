const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/test_opslag.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (e, r) => {
    if (e) {
        console.log('Error: ' + e);
    } else {
        console.log('Tables:', r.map(t => t.name).join(', '));
    }
    db.close();
});
