/**
 * Test conversatiegeheugen - verwijswoorden zoals "ie", "deze", "hem"
 */

const chatbot = require('./index');

(async () => {
    console.log('🧪 Testing conversational memory...\n');
    
    const sessionId = 'test-session-123';
    
    // Eerste vraag: aanbeveling
    console.log('👤 "ik wil temperatuur meten"');
    let result = await chatbot.processMessage('ik wil temperatuur meten', { sessionId });
    console.log(`🤖 ${result.response.substring(0, 150)}...`);
    console.log('────────────────────────────────────────────────────────────\n');
    
    // Tweede vraag: verwijzing met "ie"
    console.log('👤 "waar ligt ie"');
    result = await chatbot.processMessage('waar ligt ie', { sessionId });
    console.log(`🤖 ${result.response}`);
    console.log('────────────────────────────────────────────────────────────\n');
    
    // Derde vraag: verwijzing met "hem"
    console.log('👤 "hoe sluit ik hem aan"');
    result = await chatbot.processMessage('hoe sluit ik hem aan', { sessionId });
    console.log(`🤖 ${result.response.substring(0, 200)}...`);
    console.log('────────────────────────────────────────────────────────────\n');
    
    // Vierde vraag: nieuwe vraag
    console.log('👤 "wat doet een servo"');
    result = await chatbot.processMessage('wat doet een servo', { sessionId });
    console.log(`🤖 ${result.response.substring(0, 100)}...`);
    console.log('────────────────────────────────────────────────────────────\n');
    
    // Vijfde vraag: verwijzing naar nieuwe item
    console.log('👤 "waar ligt deze"');
    result = await chatbot.processMessage('waar ligt deze', { sessionId });
    console.log(`🤖 ${result.response}`);
    console.log('────────────────────────────────────────────────────────────\n');
})();
