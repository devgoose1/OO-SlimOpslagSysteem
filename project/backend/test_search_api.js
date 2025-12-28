/**
 * test_search_api.js - Test de /api/onderdelen/search endpoint
 * 
 * Run: node test_search_api.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testSearchAPI() {
    console.log('🧪 Testing /api/onderdelen/search endpoint...\n');
    
    const tests = [
        { name: 'LED', expectedToFind: true },
        { name: 'arduino', expectedToFind: true },
        { name: 'raspberry', expectedToFind: true },
        { name: 'xyz123nonexistent', expectedToFind: false }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const response = await axios.get(`${API_URL}/api/onderdelen/search`, {
                params: { name: test.name }
            });

            const found = response.data && response.data.length > 0;
            
            if (found === test.expectedToFind) {
                console.log(`✓ Search for "${test.name}": ${found ? 'Found' : 'Not found'} (as expected)`);
                if (found) {
                    console.log(`  → ${response.data.length} result(s): ${response.data.map(r => r.name).join(', ')}`);
                }
                passed++;
            } else {
                console.log(`✗ Search for "${test.name}": Expected ${test.expectedToFind ? 'to find' : 'not to find'}, but got ${found ? 'results' : 'nothing'}`);
                failed++;
            }
        } catch (error) {
            console.log(`✗ Search for "${test.name}": ERROR - ${error.message}`);
            failed++;
        }
        console.log();
    }

    console.log('='.repeat(50));
    console.log(`✓ Passed: ${passed}`);
    console.log(`✗ Failed: ${failed}`);
    console.log('='.repeat(50));
    
    if (failed === 0) {
        console.log('\n🎉 All search API tests passed!');
    } else {
        console.log(`\n⚠️  ${failed} test(s) failed.`);
    }

    process.exit(failed === 0 ? 0 : 1);
}

// Check if backend is running
async function checkBackend() {
    try {
        await axios.get(`${API_URL}/status`);
        console.log('✓ Backend is running\n');
        return true;
    } catch (error) {
        console.error('✗ Backend is NOT running!');
        console.error('  Please start the backend first:');
        console.error('  cd project/backend && node server.js\n');
        return false;
    }
}

(async () => {
    if (await checkBackend()) {
        await testSearchAPI();
    } else {
        process.exit(1);
    }
})();
