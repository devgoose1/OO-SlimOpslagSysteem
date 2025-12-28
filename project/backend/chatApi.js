/**
 * chatApi.js - Chat REST API
 * 
 * Dit bestand bevat alle chat-gerelateerde API endpoints.
 * Het communiceert met de chatbot service in project/chatbot
 * 
 * Endpoints:
 * - POST /api/chat - Stuur een chatbericht en krijg response
 * - GET /api/chat/status - Controleer chatbot status
 */

const path = require('path');

// Importeer chatbot service
// Let op: dit zal in production via een apart process draaien
// Voor ontwikkeling importeren we het rechtstreeks
let chatbot;
try {
    chatbot = require(path.join(__dirname, '../chatbot/index.js'));
} catch (error) {
    console.warn('⚠️ Chatbot module kon niet worden geladen:', error.message);
    console.warn('De chatbot service zal niet beschikbaar zijn.');
    chatbot = null;
}

/**
 * POST /api/chat
 * 
 * Ontvang een chatbericht van de frontend en verwerk het via de chatbot
 * 
 * Request body:
 * {
 *   "message": "Waar ligt de Raspberry Pi?",
 *   "userId": 123 (optioneel),
 *   "testMode": false (optioneel)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "response": "De Raspberry Pi ligt op: ...",
 *   "timestamp": "2025-12-24T12:00:00Z"
 * }
 */
async function handleChatMessage(req, res) {
    try {
        const { message, userId, testMode } = req.body;

        // Gebruik userId als sessionId (of een unieke sessie identifier)
        const sessionId = userId ? `user-${userId}` : req.sessionID || 'anonymous';

        // Validatie
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Chatbericht is verplicht en mag niet leeg zijn.'
            });
        }

        // Check of chatbot module beschikbaar is
        if (!chatbot) {
            return res.status(503).json({
                success: false,
                error: 'Chatbot service is momenteel niet beschikbaar. Probeer het later opnieuw.'
            });
        }

        // Verwerk het bericht via chatbot
        const chatbotResult = await chatbot.processMessage(message.trim(), {
            userId,
            sessionId,
            testMode
        });

        // Log de interactie (optioneel)
        logChatInteraction(message, chatbotResult, userId);

        // Return response
        return res.json({
            success: chatbotResult.success,
            response: chatbotResult.response,
            easter_egg: chatbotResult.easter_egg,
            timestamp: new Date().toISOString(),
            debug: process.env.NODE_ENV === 'development' ? chatbotResult.debug : undefined
        });

    } catch (error) {
        console.error('[CHAT API] Fout bij chatbericht verwerking:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Er is een serverfout opgetreden. Probeer het later opnieuw.',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * GET /api/chat/status
 * 
 * Controleer de status van de chatbot service
 * 
 * Response:
 * {
 *   "available": true,
 *   "service": "chatbot",
 *   "version": "1.0.0",
 *   ...
 * }
 */
function handleChatStatus(req, res) {
    try {
        if (!chatbot) {
            return res.json({
                available: false,
                service: 'chatbot',
                error: 'Chatbot service niet geladen'
            });
        }

        const status = chatbot.getStatus();
        
        return res.json({
            available: true,
            ...status
        });

    } catch (error) {
        console.error('[CHAT API] Fout bij status check:', error);
        
        return res.json({
            available: false,
            error: 'Kon status niet ophalen'
        });
    }
}

/**
 * Log chatbot interacties voor debugging en analytics
 * @param {string} userMessage - Bericht van de gebruiker
 * @param {object} botResult - Resultaat van chatbot
 * @param {number} userId - ID van de gebruiker (optioneel)
 */
function logChatInteraction(userMessage, botResult, userId = null) {
    const timestamp = new Date().toISOString();
    
    console.log(`[CHAT LOG] ${timestamp}`);
    console.log(`  User: "${userMessage}"`);
    console.log(`  Intent: ${botResult.debug?.intent || 'unknown'}`);
    console.log(`  Success: ${botResult.success}`);
    if (userId) {
        console.log(`  UserId: ${userId}`);
    }
}

/**
 * Registreer alle chat-gerelateerde routes
 * @param {object} app - Express app instance
 */
function registerChatRoutes(app) {
    // POST endpoint voor chat berichten
    app.post('/api/chat', handleChatMessage);
    
    // GET endpoint voor chatbot status
    app.get('/api/chat/status', handleChatStatus);

    console.log('✓ Chat API routes geregistreerd');
}

module.exports = {
    registerChatRoutes,
    handleChatMessage,
    handleChatStatus,
    logChatInteraction
};
