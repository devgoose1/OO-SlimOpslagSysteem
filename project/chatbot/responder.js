/**
 * responder.js - Response Generation Module
 * 
 * Dit bestand genereert vriendelijke Nederlandse responses
 * op basis van intent, items en database informatie.
 */

/**
 * Genereer een response voor het find_item intent
 * @param {object} item - Het gevonden item object
 * @param {object} databaseResult - Resultaat van database query
 * @returns {string} Response
 */
function respondFindItem(item, databaseResult) {
    if (!databaseResult || !databaseResult.location) {
        return `De ${item.name} bevindt zich niet in ons systeem. Vraag een medewerker om hulp.`;
    }

    return `De ${item.name} ligt op: **${databaseResult.location}**. Aantal beschikbaar: ${databaseResult.total_quantity || 'onbekend'}.`;
}

/**
 * Genereer een response voor het stock_check intent
 * @param {object} item - Het gevonden item object
 * @param {object} databaseResult - Resultaat van database query
 * @returns {string} Response
 */
function respondStockCheck(item, databaseResult) {
    if (!databaseResult) {
        return `Sorry, ik kan geen informatie vinden over de ${item.name}. Vraag een medewerker.`;
    }

    const quantity = databaseResult.total_quantity || 0;

    if (quantity === 0) {
        return `🚫 De ${item.name} is op dit moment NIET op voorraad. Vraag een medewerker wanneer deze weer beschikbaar is.`;
    }

    if (quantity < 5) {
        return `⚠️ We hebben nog maar ${quantity} stuks ${item.name} op voorraad. Beter snel zijn!`;
    }

    return `✓ Ja, we hebben ${quantity} stuks ${item.name} op voorraad! Locatie: ${databaseResult.location || 'onbekend'}.`;
}

/**
 * Genereer een response voor het missing intent
 * @param {object} item - Het gevonden item object
 * @param {string} userName - Naam van de gebruiker (optioneel)
 * @returns {string} Response
 */
function respondMissing(item, userName = 'gebruiker') {
    return `Bedankt dat je het meldt! De ${item.name} is geregistreerd als vermist. Een medewerker zal dit onderzoeken. Bij vragen kun je altijd teruggaan naar je supervisor.`;
}

/**
 * Genereer een response voor het help intent
 * @param {object} item - Het gevonden item object (optioneel)
 * @param {string} originalMessage - Het originele bericht (voor betere fallback)
 * @returns {string} Response
 */
function respondHelp(item = null, originalMessage = '') {
    if (item && item.description) {
        return `**${item.name.toUpperCase()}**\n\n${item.description}\n\nKategorie: ${item.category}\n\nKan ik nog wat anders voor je doen?`;
    }

    // Als er een specifiek item gevraagd werd maar niet herkend, geef dat aan
    if (originalMessage && originalMessage.length > 10) {
        return `Ik herken dit specifieke onderdeel niet uit mijn lijst. 🤔\n\nMaar ik kan je wel helpen met:\n\n• **Locatie zoeken**: "Waar ligt [onderdeel]?"\n• **Voorraad checken**: "Hebben we [onderdeel] op voorraad?"\n• **Item melden**: "[Onderdeel] is kwijt"\n\nOf vraag een medewerker voor specifieke technische uitleg over dit onderdeel!`;
    }

    return `Ik kan je helpen met vragen over Arduino en Raspberry Pi onderdelen. Probeer me te vragen:\n\n- Waar ligt [onderdeel]?\n- Hebben we [onderdeel] op voorraad?\n- [Onderdeel] is kwijt\n- Help, hoe werkt [onderdeel]?`;
}

/**
 * Genereer een fallback response voor onbekende intents
 * @param {string} message - Het originele bericht van de gebruiker
 * @returns {string} Response
 */
function respondUnknown(message) {
    const responses = [
        "Sorry, ik snap dit niet helemaal. Kun je dat anders formuleren?",
        "Hmm, ik herkende je vraag niet. Probeer me te vragen naar een onderdeel of locatie.",
        "Ik ben niet helemaal zeker wat je bedoelt. Vraag me waar iets ligt, of of het op voorraad is.",
        "Sorry! Ik ben een eenvoudige chatbot. Ik kan beter vragen beantwoorden over Arduino en Raspberry Pi onderdelen."
    ];

    // Kies willekeurig een response
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Genereer een response op basis van intent, item en database data
 * @param {string} intent - De gedetecteerde intent
 * @param {object} item - Het gevonden item (optioneel)
 * @param {object} databaseResult - Gegevens uit de database (optioneel)
 * @param {string} originalMessage - Het originele bericht (voor fallback)
 * @returns {string} De gegenereerde response
 */
function generateResponse(intent, item = null, databaseResult = null, originalMessage = '') {
    switch (intent) {
        case 'find_item':
            if (!item) {
                return `Welk onderdeel zoek je? Kun je de naam duidelijker maken?`;
            }
            return respondFindItem(item, databaseResult);

        case 'stock_check':
            if (!item) {
                return `Welk onderdeel wil je checken? Zeg de naam ervan.`;
            }
            return respondStockCheck(item, databaseResult);

        case 'missing':
            if (!item) {
                return `Welk onderdeel is vermist? Zeg de naam ervan zodat ik het kan registreren.`;
            }
            return respondMissing(item);

        case 'help':
            return respondHelp(item, originalMessage);

        case 'unknown':
        default:
            return respondUnknown(originalMessage);
    }
}

module.exports = {
    generateResponse,
    respondFindItem,
    respondStockCheck,
    respondMissing,
    respondHelp,
    respondUnknown
};
