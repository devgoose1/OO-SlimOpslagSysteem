/**
 * intents.js - Intent Detection Module
 * 
 * Dit bestand bevat de logica voor het detecteren van gebruikerintents
 * op basis van keywords in het chatbericht.
 * 
 * Ondersteunde intents:
 * - find_item: Gebruiker zoekt de locatie van een onderdeel
 * - stock_check: Gebruiker wil weten of iets op voorraad is
 * - missing: Gebruiker rapporteert een vermist onderdeel
 * - help: Gebruiker vraagt om uitleg of procedure
 */

const INTENT_KEYWORDS = {
    connection: {
        keywords: ['sluit', 'aansluiten', 'aansluitingen', 'verbinding', 'connecteer', 'wiring', 'bedrading', 'pins', 'draden'],
        patterns: ['hoe.*sluit.*aan', 'hoe.*connect.*', 'draden.*', 'aansluit.*', 'pins.*', 'bedrading.*', 'verbind.*']
    },
    recommend: {
        keywords: ['ik moet', 'ik wil', 'welk onderdeel', 'wat heb ik nodig', 'welke component', 'welk component', 'aanbevelen', 'raad aan', 'geschikt voor'],
        patterns: ['ik moet.*', 'ik wil.*', 'welk.*onderdeel.*', 'welke.*component.*', 'wat.*nodig.*voor.*', 'geschikt.*voor.*']
    },
    help: {
        keywords: ['help', 'uitleg', 'procedure', 'stap', 'instructie', 'hoe werkt', 'waarvoor', 'functie', 'doel', 'betekent', 'wat doet', 'wat betekent'],
        patterns: ['hoe werkt.*', 'hoe gebruik.*', 'help.*', 'wat is een.*', 'wat betekent.*', 'wat doet.*', 'waarvoor.*', 'functie van.*']
    },
    find_item: {
        keywords: ['waar', 'locatie', 'ligt', 'vind', 'zoek', 'hoe kom ik', 'welk vak'],
        patterns: ['waar.*ligt', 'vind.*', 'zoek.*', 'locatie van']
    },
    stock_check: {
        keywords: ['voorraad', 'beschikbaar', 'hebben we', 'is er', 'hoeveel', 'aantal', 'in stock'],
        patterns: ['hebben we.*', 'is er.*', 'hoeveel.*']
    },
    missing: {
        keywords: ['kwijt', 'ontbreekt', 'vermist', 'niet meer', 'weg', 'mist'],
        patterns: ['.*is weg', '.*ontbreekt', '.*kwijt']
    }
};

/**
 * Detecteert ALLE intents in een gebruikersbericht
 * @param {string} message - Het chatbericht van de gebruiker
 * @returns {array} Array van {intent, confidence} objecten
 */
function detectAllIntents(message) {
    const lowerMessage = message.toLowerCase();
    const foundIntents = [];

    for (const [intentName, intentData] of Object.entries(INTENT_KEYWORDS)) {
        let confidence = 0;

        // Check keywords
        for (const keyword of intentData.keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                confidence += 0.4;
            }
        }

        // Check patterns
        for (const pattern of intentData.patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(lowerMessage)) {
                confidence += 0.45;
            }
        }

        if (confidence > 0) {
            foundIntents.push({
                intent: intentName,
                confidence: Math.min(confidence, 1.0)
            });
        }
    }

    // Sorteer op confidence (hoogste eerst)
    return foundIntents.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detecteert de intent van een gebruikersbericht
 * @param {string} message - Het chatbericht van de gebruiker
 * @returns {object} Object met {intent, confidence, message}
 */
function detectIntent(message) {
    if (!message || typeof message !== 'string') {
        return {
            intent: 'unknown',
            confidence: 0,
            message: 'Leeg bericht ontvangen'
        };
    }

    const lowerMessage = message.toLowerCase().trim();

    // Check elk intent type
    for (const [intentName, intentData] of Object.entries(INTENT_KEYWORDS)) {
        // Check keywords
        for (const keyword of intentData.keywords) {
            if (lowerMessage.includes(keyword)) {
                return {
                    intent: intentName,
                    confidence: 0.8,
                    message: lowerMessage
                };
            }
        }

        // Check patterns (simpele regex)
        for (const pattern of intentData.patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(lowerMessage)) {
                return {
                    intent: intentName,
                    confidence: 0.85,
                    message: lowerMessage
                };
            }
        }
    }

    // Geen intent herkend
    return {
        intent: 'unknown',
        confidence: 0,
        message: lowerMessage
    };
}

/**
 * Extraheer mogelijke itemnamen uit het bericht
 * @param {string} message - Het chatbericht
 * @returns {string[]} Array met mogelijke itemnamen
 */
function extractPotentialItems(message) {
    const lowerMessage = message.toLowerCase();
    
    // Verwijder veelvoorkomende stopwoorden
    const stopwords = ['het', 'de', 'een', 'is', 'zijn', 'waar', 'vind', 'zoek', 
                       'hebben', 'we', 'kan', 'kan ik', 'voorraad', 'kwijt', 'ontbreekt',
                       'help', 'hoe', 'wat', 'uitleg'];
    
    // Split in woorden en filter
    const words = lowerMessage
        .split(/[\s,?!.]+/)
        .filter(word => word.length > 2 && !stopwords.includes(word));

    return words;
}

module.exports = {
    detectIntent,
    detectAllIntents,
    extractPotentialItems,
    INTENT_KEYWORDS
};
