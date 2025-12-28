/**
 * Test easter eggs
 */

const chatbot = require('./index');

const tests = [
    '/disco',
    '/matrix', 
    '/rickroll',
    '/dev',
    '/secret',
    '/party',
    'panic mode',
    'helix',
    'sudo make me a sandwich'
];

(async () => {
    console.log('🥚 Testing Easter Eggs...\n');
    
    for (const test of tests) {
        const result = await chatbot.processMessage(test);
        console.log(`👤 "${test}"`);
        console.log(`🎉 ${result.response.substring(0, 80)}...`);
        if (result.easter_egg) {
            console.log(`   [Easter Egg Type: ${result.easter_egg}]`);
        }
        console.log('────────────────────────────────────────────────────────────\n');
    }
})();
