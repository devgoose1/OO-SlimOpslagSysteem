/**
 * Quick test voor de nieuwe help response
 */

const chatbot = require('./index.js');

(async () => {
    console.log('🧪 Testing help responses...\n');
    
    const tests = [
        'Hoe werkt een sps30?',
        'Hoe werkt een esp32?',
        'Hoe werkt een ultrasonic sensor?',
        'Hoe werkt een xyz123?',  // Onbekend item
        'Help'                      // Algemene help
    ];

    for (const msg of tests) {
        console.log(`\n👤 User: "${msg}"`);
        const result = await chatbot.processMessage(msg);
        console.log(`🤖 Bot: ${result.response}`);
        console.log(`   [Intent: ${result.debug?.intent}, Item: ${result.debug?.foundItem || 'none'}]`);
    }
})();
