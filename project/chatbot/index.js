/**
 * index.js - Chatbot Service Main Module
 * 
 * Dit is het hoofdbestand van de chatbot service.
 * Het coördineert de intent detection, item matching, 
 * database queries en response generatie.
 */

const intents = require('./intents');
const items = require('./items');
const responder = require('./responder');
const axios = require('axios');

// Conversatiegeheugen per gebruiker (sessionId -> lastItem)
const conversationMemory = new Map();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Verwerk meerdere intents in één bericht
 * @param {array} intents - Array van intent objecten
 * @param {string} userMessage - Het originele bericht
 * @param {string} sessionId - De sessie ID
 * @returns {Promise<object>} Response object
 */
async function processMultipleIntents(intentsList, userMessage, sessionId) {
    console.log('[MULTI] Verwerk meerdere intents:', intentsList.map(i => i.intent).join(' + '));
    
    const responses = [];
    let foundItem = null;
    
    // Haal item op (eenmalig)
    const potentialWords = intents.extractPotentialItems(userMessage);
    const hasReference = /\b(ie|deze|dat|dit|hem|haar|'m|m|ze|die|daarvan|z'n|d'r)\b/i.test(userMessage);
    
    if (potentialWords.length > 0) {
        const foundItems = items.findItemsInWords(potentialWords);
        if (foundItems.length > 0) {
            foundItem = foundItems[0];
        }
    }
    
    if (!foundItem && hasReference && conversationMemory.has(sessionId)) {
        const lastItemName = conversationMemory.get(sessionId);
        foundItem = items.findItemByName(lastItemName);
        console.log(`[MEMORY] Gebruik laatst genoemde item:`, foundItem?.name);
    }
    
    // Verwerk elk intent
    for (const intentData of intentsList) {
        let databaseResult = null;
        
        // Query database indien nodig
        if (foundItem && (intentData.intent === 'find_item' || intentData.intent === 'stock_check')) {
            databaseResult = await queryBackendDatabase(foundItem.name);
        }
        
        // Genereer response voor dit intent
        const response = responder.generateResponse(intentData.intent, foundItem, databaseResult, userMessage);
        responses.push(response);
    }
    
    // Onthoud item
    if (foundItem) {
        conversationMemory.set(sessionId, foundItem.name);
        console.log(`[MEMORY] Onthouden:`, foundItem.name);
    }
    
    // Combineer responses met dubbele newline
    const combinedResponse = responses.join('\n\n---\n\n');
    
    return {
        success: true,
        intents: intentsList.map(i => i.intent),
        response: combinedResponse,
        item: foundItem?.name
    };
}

/**
 * Query de backend database voor informatie over een item
 * @param {string} itemName - Naam van het item
 * @returns {Promise<object|null>} Database record of null
 */
async function queryBackendDatabase(itemName) {
    try {
        // Dit zal via de backend API gaan (nog niet geïmplementeerd in deze stap)
        // Voor nu returnen we een simpel response
        const response = await axios.get(`${BACKEND_URL}/api/onderdelen/search`, {
            params: { name: itemName }
        });

        if (response.data && response.data.length > 0) {
            return response.data[0];
        }

        return null;
    } catch (error) {
        console.error(`Fout bij database query voor ${itemName}:`, error.message);
        return null;
    }
}

/**
 * Verwerk een chatbericht van de gebruiker
 * Dit is de hoofdfunctie die door de backend API wordt aangeroepen
 * @param {string} userMessage - Het bericht van de gebruiker
 * @param {object} options - Optionele parameters
 * @returns {Promise<object>} Object met {success, response, debug}
 */
async function processMessage(userMessage, options = {}) {
    const sessionId = options.sessionId || 'default';
    
    try {
        // Validatie
        if (!userMessage || typeof userMessage !== 'string') {
            return {
                success: false,
                response: 'Leeg bericht ontvangen.',
                debug: { error: 'Empty message' }
            };
        }

        // Controleer op easter eggs EERST
        const easterEgg = intents.detectEasterEgg(userMessage);
        if (easterEgg) {
            console.log(`[EASTER EGG] ${easterEgg} detected!`);
            const easterEggResponse = responder.respondEasterEgg(easterEgg);
            return {
                success: true,
                response: easterEggResponse.message,
                easter_egg: easterEggResponse.type,
                debug: { easterEgg }
            };
        }

        // Stap 1: Detecteer alle intents in het bericht
        const allIntents = intents.detectAllIntents(userMessage);
        console.log(`[INTENTS] Gevonden:`, allIntents.map(i => `${i.intent}(${i.confidence.toFixed(2)})`).join(', '));
        
        // Als meerdere intents gevonden met hoge confidence, verwerk ze allebei
        const multipleIntents = allIntents.filter(i => i.confidence >= 0.7);
        
        if (multipleIntents.length > 1) {
            console.log(`[MULTI] Verwerk ${multipleIntents.length} intents`);
            return await processMultipleIntents(multipleIntents, userMessage, sessionId);
        }

        // Single intent verwerking (oude flow)
        const intentData = allIntents[0] || { intent: 'unknown', confidence: 0 };
        console.log(`[INTENT] ${intentData.intent} (confidence: ${intentData.confidence})`);

        // Voor recommend intent: zoek op functionaliteit
        if (intentData.intent === 'recommend') {
            console.log('[RECOMMEND] Zoeken op functionaliteit...');
            const matchedItems = items.searchByFunction(userMessage);
            console.log('[RECOMMEND] Gevonden items:', matchedItems.map(i => i.name));
            
            const response = responder.generateResponse(intentData.intent, null, matchedItems, userMessage);
            
            // Onthoud het eerste aanbevolen item
            if (matchedItems.length > 0) {
                conversationMemory.set(sessionId, matchedItems[0].name);
                console.log(`[MEMORY] Onthouden:`, matchedItems[0].name);
            }
            
            return {
                success: true,
                intent: intentData.intent,
                response: response,
                items: matchedItems.map(i => i.name),
                debug: { intentData, matchedItems }
            };
        }

        // Stap 2: Extraheer mogelijke itemnamen
        const potentialWords = intents.extractPotentialItems(userMessage);
        console.log(`[ITEMS] Mogelijke items:`, potentialWords);

        // Check voor verwijswoorden (ie, deze, dat, hem, haar, m, z'n, d'r)
        const hasReference = /\b(ie|deze|dat|dit|hem|haar|'m|m|ze|die|daarvan|z'n|d'r)\b/i.test(userMessage);
        
        // Stap 3: Zoek items
        let foundItem = null;
        if (potentialWords.length > 0) {
            const foundItems = items.findItemsInWords(potentialWords);
            if (foundItems.length > 0) {
                foundItem = foundItems[0]; // Neem het eerste gevonden item
                console.log(`[MATCH] Gevonden item:`, foundItem.name);
            }
        }
        
        // Als geen item gevonden maar wel een verwijswoord, gebruik laatste item uit geheugen
        if (!foundItem && hasReference && conversationMemory.has(sessionId)) {
            const lastItemName = conversationMemory.get(sessionId);
            foundItem = items.findItemByName(lastItemName);
            if (foundItem) {
                console.log(`[MEMORY] Gebruik laatst genoemde item:`, foundItem.name);
            }
        }

        // Stap 4: Query database (als nodig)
        let databaseResult = null;
        if (foundItem && (intentData.intent === 'find_item' || intentData.intent === 'stock_check')) {
            console.log(`[DB] Querying database voor ${foundItem.name}...`);
            databaseResult = await queryBackendDatabase(foundItem.name);
        }

        // Stap 5: Genereer response
        const response = responder.generateResponse(
            intentData.intent,
            foundItem,
            databaseResult,
            userMessage
        );

        // Onthoud het item voor volgende berichten in deze sessie
        if (foundItem) {
            conversationMemory.set(sessionId, foundItem.name);
            console.log(`[MEMORY] Onthouden:`, foundItem.name);
        }

        // Return resultaat
        return {
            success: true,
            response: response,
            debug: {
                intent: intentData.intent,
                foundItem: foundItem ? foundItem.name : null,
                hasDatabase: !!databaseResult
            }
        };

    } catch (error) {
        console.error('[ERROR] Chatbot error:', error);
        return {
            success: false,
            response: 'Sorry, er is een fout opgetreden. Probeer het later opnieuw.',
            debug: { error: error.message }
        };
    }
}

/**
 * Health check - controleer of chatbot service draait
 * @returns {object} Status object
 */
function getStatus() {
    return {
        status: 'ok',
        service: 'chatbot',
        version: '1.0.0',
        intentsSupported: Object.keys(intents.INTENT_KEYWORDS),
        itemsKnown: Object.keys(items.getAllItems()).length
    };
}

module.exports = {
    processMessage,
    getStatus,
    queryBackendDatabase
};

// Optioneel: Eenvoudige CLI interface voor testen
if (require.main === module) {
    console.log('🤖 Chatbot Service gestart. Dit is een standalone module.');
    console.log('Status:', getStatus());
    
    // Voorbeelden
    (async () => {
        console.log('\n--- Voorbeeldberichten ---\n');
        
        const testMessages = [
            'Waar ligt de Raspberry Pi?',
            'Hebben we LED lampen op voorraad?',
            'Een Arduino is vermist',
            'Hoe werkt een servo?',
            'Welke kleur is het weer?'
        ];

        for (const msg of testMessages) {
            console.log(`\n👤 User: "${msg}"`);
            const result = await processMessage(msg);
            console.log(`🤖 Bot: "${result.response}"`);
            if (process.env.DEBUG === 'true') {
                console.log('Debug:', result.debug);
            }
        }
    })();
}
