#!/usr/bin/env node

/**
 * Admin Account Setup Helper
 * This script helps you:
 * 1. Generate secure bcrypt hashes for emergency admin passwords
 * 2. Create admin accounts in the database
 */

const bcrypt = require('bcrypt');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function main() {
    console.log('\n🔐 Admin Account Setup Helper');
    console.log('================================\n');

    const choice = await question('What do you want to do?\n1) Generate bcrypt hash for fallback admin\n2) Create admin in database\n3) Exit\n\nChoice (1-3): ');

    if (choice === '1') {
        await generateBcryptHash();
    } else if (choice === '2') {
        await createAdminInDatabase();
    } else {
        console.log('\nGoodbye!');
        rl.close();
        return;
    }

    // Ask if they want to do something else
    const again = await question('\nDo another operation? (y/n): ');
    if (again.toLowerCase() === 'y') {
        rl.close();
        const { spawn } = require('child_process');
        spawn('node', [__filename], { stdio: 'inherit' });
    } else {
        console.log('\nGoodbye!');
        rl.close();
    }
}

async function generateBcryptHash() {
    console.log('\n📝 Generate bcrypt hash for fallback admin\n');
    console.log('This creates a secure password hash for emergency access.\n');

    const password = await question('Enter password to hash: ');
    if (!password) {
        console.log('❌ Password cannot be empty');
        return;
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        console.log('\n✅ Bcrypt hash generated:\n');
        console.log('Add this to your .env file:\n');
        console.log('ADMIN_USERNAME=admin');
        console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
        console.log('Then restart the server.\n');
    } catch (err) {
        console.error('❌ Error generating hash:', err.message);
    }
}

async function createAdminInDatabase() {
    console.log('\n👤 Create admin account in database\n');

    // Try to load database
    try {
        const { db } = require('../database');

        const username = await question('Admin username: ');
        if (!username) {
            console.log('❌ Username cannot be empty');
            return;
        }

        const password = await question('Admin password: ');
        if (!password) {
            console.log('❌ Password cannot be empty');
            return;
        }

        const passwordConfirm = await question('Confirm password: ');
        if (password !== passwordConfirm) {
            console.log('❌ Passwords do not match');
            return;
        }

        // Check if user exists
        return new Promise((resolve) => {
            db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
                if (err) {
                    console.error('❌ Database error:', err.message);
                    resolve();
                    return;
                }

                if (user) {
                    console.log('❌ Username already exists');
                    resolve();
                    return;
                }

                // Hash password with bcrypt
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    db.run(
                        'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
                        [username, hashedPassword, 'admin', new Date().toISOString()],
                        function(err) {
                            if (err) {
                                console.error('❌ Database error:', err.message);
                            } else {
                                console.log(`\n✅ Admin account created successfully!`);
                                console.log(`Username: ${username}`);
                                console.log(`Role: admin`);
                                console.log('\nYou can now log in with these credentials.\n');
                            }
                            resolve();
                        }
                    );
                } catch (err) {
                    console.error('❌ Error hashing password:', err.message);
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error('❌ Could not load database:', err.message);
        console.log('Make sure you run this script from the backend directory.');
    }
}

main().catch(console.error);
