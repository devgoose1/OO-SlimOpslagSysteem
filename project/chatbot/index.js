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

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

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
    try {
        // Validatie
        if (!userMessage || typeof userMessage !== 'string') {
            return {
                success: false,
                response: 'Leeg bericht ontvangen.',
                debug: { error: 'Empty message' }
            };
        }

        // Stap 1: Detecteer intent
        const intentData = intents.detectIntent(userMessage);
        console.log(`[INTENT] ${intentData.intent} (confidence: ${intentData.confidence})`);

        // Stap 2: Extraheer mogelijke itemnamen
        const potentialWords = intents.extractPotentialItems(userMessage);
        console.log(`[ITEMS] Mogelijke items:`, potentialWords);

        // Stap 3: Zoek items
        let foundItem = null;
        if (potentialWords.length > 0) {
            const foundItems = items.findItemsInWords(potentialWords);
            if (foundItems.length > 0) {
                foundItem = foundItems[0]; // Neem het eerste gevonden item
                console.log(`[MATCH] Gevonden item:`, foundItem.name);
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
