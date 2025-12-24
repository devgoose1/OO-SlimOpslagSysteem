/**
 * Test connection intent
 */

const chatbot = require('./index.js');

(async () => {
    console.log('🧪 Testing connection/wiring responses...\n');
    
    const tests = [
        'Hoe sluit ik een LED aan?',
        'Hoe connect ik een servo?',
        'Aansluitingen voor Arduino?',
        'Hoe bedrading HC-SR04?',
        'How do I wire an ESP32?'
    ];

    for (const msg of tests) {
        console.log(`\n👤 User: "${msg}"`);
        const result = await chatbot.processMessage(msg);
        console.log(`🤖 Bot:\n${result.response}`);
        console.log(`\n[Intent: ${result.debug?.intent}, Item: ${result.debug?.foundItem || 'none'}]`);
        console.log('─'.repeat(60));
    }
})();
