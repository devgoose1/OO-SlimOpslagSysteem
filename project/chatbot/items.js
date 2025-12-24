/**
 * items.js - Item Recognition Module
 * 
 * Dit bestand bevat een database van bekende itemnamen en synoniemen.
 * Dit helpt bij het herkennen van items uit gebruikersberichten.
 */

// Bekende items met synoniemen (dit kan later uit de database komen)
const KNOWN_ITEMS = {
    'raspberry pi': {
        variants: ['raspberry pi', 'raspi', 'rpi', 'pi 4', 'pi4', 'pi 4b'],
        category: 'SBC',
        description: 'Raspberry Pi Single Board Computer'
    },
    'arduino': {
        variants: ['arduino', 'arduino uno', 'uno'],
        category: 'Microcontroller',
        description: 'Arduino Microcontroller'
    },
    'led': {
        variants: ['led', 'ledlamp', 'lamp'],
        category: 'Component',
        description: 'Light Emitting Diode'
    },
    'resistor': {
        variants: ['resistor', 'weerstand', 'ohm'],
        category: 'Component',
        description: 'Elektronische weerstand'
    },
    'capacitor': {
        variants: ['capacitor', 'kondensator', 'condensator'],
        category: 'Component',
        description: 'Elektronische condensator'
    },
    'breadboard': {
        variants: ['breadboard', 'breadboards', 'experimenteerbord', 'bord'],
        category: 'Equipment',
        description: 'Experimenteerbord voor prototyping'
    },
    'jumper wire': {
        variants: ['jumper wire', 'jumper', 'jumperkabel', 'draad'],
        category: 'Component',
        description: 'Jumper verbindingskabel'
    },
    'servo': {
        variants: ['servo', 'servo motor', 'servomotor'],
        category: 'Motor',
        description: 'Servo motor voor hoekpositie controle'
    },
    'sensor': {
        variants: ['sensor', 'sensoren'],
        category: 'Component',
        description: 'Elektronische sensor'
    },
    'power supply': {
        variants: ['power supply', 'voeding', 'stroomvoorziening'],
        category: 'Equipment',
        description: 'Stroomvoorziening'
    },
    'sps30': {
        variants: ['sps30', 'sensirion sps30', 'particulate matter sensor'],
        category: 'Sensor',
        description: 'Sensirion SPS30 particulate matter (PM) sensor voor luchtkwaliteitsmetingen'
    },
    'ultrasonic sensor': {
        variants: ['ultrasonic', 'hc-sr04', 'hcsr04', 'ultrasone sensor', 'afstandssensor'],
        category: 'Sensor',
        description: 'HC-SR04 ultrasone afstandssensor voor object detectie'
    },
    'temperature sensor': {
        variants: ['temperature', 'dht11', 'dht22', 'temperatuur sensor', 'temp sensor'],
        category: 'Sensor',
        description: 'DHT11/DHT22 temperatuur en luchtvochtigheid sensor'
    },
    'lcd display': {
        variants: ['lcd', 'display', 'lcd1602', 'lcd 16x2', 'scherm'],
        category: 'Display',
        description: 'LCD display voor tekstweergave (bijv. 16x2 karakters)'
    },
    'motor driver': {
        variants: ['motor driver', 'l298n', 'h-bridge', 'motor controller'],
        category: 'Motor',
        description: 'L298N motor driver voor DC motoren en stappenmotor aansturing'
    },
    'pir sensor': {
        variants: ['pir', 'motion sensor', 'bewegingssensor', 'bewegingsmelder'],
        category: 'Sensor',
        description: 'PIR (Passive Infrared) bewegingssensor voor bewegingsdetectie'
    },
    'relay': {
        variants: ['relay', 'relais', 'schakelaar'],
        category: 'Component',
        description: 'Relais module voor het schakelen van hogere spanningen'
    },
    'potentiometer': {
        variants: ['potentiometer', 'pot', 'potmeter', 'draaiknop'],
        category: 'Component',
        description: 'Variabele weerstand voor analoge waarde controle'
    },
    'button': {
        variants: ['button', 'push button', 'knop', 'drukknop'],
        category: 'Component',
        description: 'Drukknop voor gebruikersinvoer'
    },
    'buzzer': {
        variants: ['buzzer', 'piezo', 'zoemer', 'speaker'],
        category: 'Component',
        description: 'Piezo buzzer voor geluidsignalen'
    },
    'transistor': {
        variants: ['transistor', 'npn', 'pnp', '2n2222'],
        category: 'Component',
        description: 'Transistor voor schakel- en versterkingstoepassingen'
    },
    'diode': {
        variants: ['diode', '1n4007', 'rectifier'],
        category: 'Component',
        description: 'Diode voor stroomrichting en spanningsbescherming'
    },
    'esp32': {
        variants: ['esp32', 'esp-32', 'esp32-wroom'],
        category: 'Microcontroller',
        description: 'ESP32 microcontroller met WiFi en Bluetooth'
    },
    'esp8266': {
        variants: ['esp8266', 'esp-8266', 'nodemcu', 'wemos'],
        category: 'Microcontroller',
        description: 'ESP8266 WiFi microcontroller voor IoT projecten'
    }
};

/**
 * Zoek een item in de bekende items op basis van een zoekterm
 * @param {string} searchTerm - De zoekterm (bijv. 'raspi' of 'raspberry pi')
 * @returns {object|null} Het gevonden item of null
 */
function findItemByName(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') {
        return null;
    }

    const lowerSearch = searchTerm.toLowerCase().trim();

    for (const [itemName, itemData] of Object.entries(KNOWN_ITEMS)) {
        // Check directe match
        if (lowerSearch === itemName) {
            return { name: itemName, ...itemData };
        }

        // Check variants
        if (itemData.variants.some(v => v === lowerSearch)) {
            return { name: itemName, ...itemData };
        }

        // Check gedeeltelijke match (minimumlengde 3 karakters)
        if (lowerSearch.length > 2 && itemName.includes(lowerSearch)) {
            return { name: itemName, ...itemData };
        }
    }

    return null;
}

/**
 * Zoek alle mogelijke items in een lijst van woorden
 * @param {string[]} words - Array van woorden om te zoeken
 * @returns {object[]} Array van gevonden items
 */
function findItemsInWords(words) {
    if (!Array.isArray(words)) {
        return [];
    }

    const foundItems = [];
    const seenItems = new Set(); // Voorkomen dat we hetzelfde item meerdere keren toevoegen

    for (const word of words) {
        const foundItem = findItemByName(word);
        if (foundItem && !seenItems.has(foundItem.name)) {
            foundItems.push(foundItem);
            seenItems.add(foundItem.name);
        }
    }

    return foundItems;
}

/**
 * Check of een woord overeenkomt met een bepaald item
 * @param {string} word - Het woord om te checken
 * @param {string} itemName - De naam van het item
 * @returns {boolean} True als het woord overeenkomt met het item
 */
function matchesItem(word, itemName) {
    if (!word || !itemName) {
        return false;
    }

    const lowerWord = word.toLowerCase().trim();
    const item = KNOWN_ITEMS[itemName.toLowerCase()];

    if (!item) {
        return false;
    }

    return item.variants.some(v => lowerWord === v) || lowerWord === itemName;
}

/**
 * Krijg alle bekende items
 * @returns {object} Object met alle bekende items
 */
function getAllItems() {
    return KNOWN_ITEMS;
}

module.exports = {
    findItemByName,
    findItemsInWords,
    matchesItem,
    getAllItems,
    KNOWN_ITEMS
};
