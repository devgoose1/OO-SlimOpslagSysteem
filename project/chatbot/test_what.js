/**
 * Test "wat" en "waarvoor" vragen
 */

const chatbot = require('./index');

const tests = [
    'Wat is een HC-SR04?',
    'Waarvoor gebruik ik een ultrasonic sensor?',
    'Wat doet een SPS30?',
    'Wat betekent LED?',
    'Wat is de functie van een servo?'
];

(async () => {
    console.log('🧪 Testing "wat" and "waarvoor" questions...\n');
    
    for (const msg of tests) {
        const result = await chatbot.processMessage(msg);
        console.log(`👤 "${msg}"`);
        console.log(`[INTENT] ${result.intent}`);
        console.log(`🤖 ${result.response.substring(0, 150)}...`);
        console.log('────────────────────────────────────────────────────────────\n');
    }
})();
