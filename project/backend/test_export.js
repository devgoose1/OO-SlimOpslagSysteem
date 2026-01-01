// Test Excel Export
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database', 'opslag.db');
const testDbPath = path.join(__dirname, 'database', 'test.db');

// Check which DB exists
console.log('📋 Checking databases...');
console.log('Main DB exists:', fs.existsSync(dbPath));
console.log('Test DB exists:', fs.existsSync(testDbPath));

// Try to generate export
const { generateExcelExport } = require('./exportApi');
const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(fs.existsSync(dbPath) ? dbPath : testDbPath, (err) => {
    if (err) {
        console.error('❌ DB Error:', err);
        process.exit(1);
    }

    console.log('\n📊 Testing Excel Export...');
    generateExcelExport(db)
        .then(result => {
            console.log('\n✅ Export Successful!');
            console.log('Filename:', result.filename);
            console.log('Filepath:', result.filepath);
            console.log('File Exists:', fs.existsSync(result.filepath));
            console.log('File Size:', result.filesize, 'bytes');
            console.log('Records:', result.records);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Export Failed:');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
        });
});
