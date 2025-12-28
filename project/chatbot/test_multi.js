/**
 * Test meerdere intents in 1 bericht
 */

const chatbot = require('./index');

(async () => {
    console.log('🧪 Testing multiple intents in one message...\n');
    
    const sessionId = 'test-multi-123';
    
    // Eerste vraag: aanbeveling
    console.log('👤 "ik wil temperatuur meten"');
    let result = await chatbot.processMessage('ik wil temperatuur meten', { sessionId });
    console.log(`🤖 ${result.response.substring(0, 150)}...`);
    console.log('────────────────────────────────────────────────────────────\n');
    
    // Tweede vraag: MEERDERE INTENTS - waar ligt ie EN hoe sluit ik hem aan
    console.log('👤 "waar ligt ie en hoe sluit ik hem aan"');
    result = await chatbot.processMessage('waar ligt ie en hoe sluit ik hem aan', { sessionId });
    console.log(`🤖 ${result.response}`);
    console.log(`\n[Intents verwerkt: ${result.intents ? result.intents.join(', ') : 'single'}]`);
    console.log('────────────────────────────────────────────────────────────\n');
})();
