const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('database/opslag.db');

// Test login
const testUser = 'admin';
const testPassword = 'admin123';

db.get(
    'SELECT id, username, password, role FROM users WHERE username = ?',
    [testUser],
    async (err, user) => {
        if (err) {
            console.error('DB Error:', err.message);
            db.close();
            return;
        }
        
        if (!user) {
            console.log('❌ User not found:', testUser);
            db.close();
            return;
        }
        
        console.log('✅ User found:', user.username, '(' + user.role + ')');
        console.log('Stored hash (first 50 chars):', user.password.substring(0, 50));
        
        const match = await bcrypt.compare(testPassword, user.password);
        console.log('Password match:', match ? '✅ YES' : '❌ NO');
        
        db.close();
    }
);
