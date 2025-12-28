/**
 * Test recommend intent - zoek component op basis van functionaliteit
 */

const chatbot = require('./index');

const tests = [
    'ik moet object detectie doen. welk onderdeel gebruik ik daarvoor?',
    'Welk onderdeel heb ik nodig voor temperatuur meten?',
    'Wat heb ik nodig voor beweging detecteren?',
    'Welke component is geschikt voor afstand meten?',
    'Ik moet luchtkwaliteit meten'
];

(async () => {
    console.log('🧪 Testing recommend intent...\n');
    
    for (const msg of tests) {
        const result = await chatbot.processMessage(msg);
        console.log(`👤 "${msg}"`);
        console.log(`[INTENT] ${result.intent}`);
        console.log(`🤖 ${result.response}`);
        console.log('────────────────────────────────────────────────────────────\n');
    }
})();
