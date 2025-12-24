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
        description: 'Raspberry Pi Single Board Computer',
        connectionGuide: '**Raspberry Pi aansluitingen:**\n\n1. Voeding: USB-C poort\n2. HDMI: Voor monitor verbinding\n3. GPIO pins: Voor sensoren/actuators\n4. MicroSD: Voor besturingssysteem\n5. Ethernet: Voor netwerkverbinding\n\n⚡ **LET OP:** Altijd uitschakelen voor het aanmaken van verbindingen!'
    },
    'arduino': {
        variants: ['arduino', 'arduino uno', 'uno'],
        category: 'Microcontroller',
        description: 'Arduino Microcontroller',
        connectionGuide: '**Arduino aansluitingen:**\n\n1. USB: Voor programmeren en voeding\n2. 5V pin: Voedingsspanning\n3. GND pin: Aarde/Ground\n4. Digital pins (0-13): Voor digitale sensoren/actuators\n5. Analog pins (A0-A5): Voor analoge sensoren\n\nTip: Zorg voor juiste weerstandswaarden bij LED!'
    },
    'led': {
        variants: ['led', 'ledlamp', 'lamp'],
        category: 'Component',
        description: 'Light Emitting Diode',
        connectionGuide: '**LED aansluiten:**\n\n1. Lange poot (+) → Positief (via weerstand)\n2. Korte poot (-) → Ground (GND)\n3. Weerstand: 220Ω - 1kΩ gebruiken voor 5V\n4. Volgorde: +5V → 220Ω → LED lange poot → LED korte poot → GND\n\n⚠️ Zet de LED NOOIT direct op spanning! Altijd weerstand gebruiken!'
    },
    'resistor': {
        variants: ['resistor', 'weerstand', 'ohm'],
        category: 'Component',
        description: 'Elektronische weerstand',
        connectionGuide: '**Weerstand aansluiten:**\n\nWeerstand heeft geen polariteit (beide zijden gelijk)\n\n1. Connect in serie in circuit\n2. Gebruikte waarden: 220Ω, 470Ω, 1kΩ, 10kΩ\n3. Kleurcode lezen: 1e band = tientallen, 2e band = eenheden, 3e band = vermenigvuldiger\n\nVoorbeelden:\n- Rood-Rood-Rood = 22 × 100 = 2.2kΩ\n- Bruin-Zwart-Rood = 10 × 100 = 1kΩ'
    },
    'capacitor': {
        variants: ['capacitor', 'kondensator', 'condensator'],
        category: 'Component',
        description: 'Elektronische condensator',
        connectionGuide: '**Capacitor aansluiten:**\n\n1. Voor elektrolyse capacitors: let op polariteit!\n2. Lange poot (+) → Positief\n3. Korte poot (-) → Ground\n4. Gebruikt voor ruis filteren en stroombuffering\n5. Waarden meestal in µF (microfarad)\n\nTip: Zet altijd filtering capacitors dicht bij IC voeding pins!'
    },
    'breadboard': {
        variants: ['breadboard', 'breadboards', 'experimenteerbord', 'bord'],
        category: 'Equipment',
        description: 'Experimenteerbord voor prototyping',
        connectionGuide: '**Breadboard gebruiken:**\n\n1. Verticale rijen zijn geïsoleerd\n2. Rode rij = +5V (voedingsspoor)\n3. Blauwe rij = GND (aardespoor)\n4. Steek draden/component-poten in gaatjes\n5. Gaatjes in dezelfde kolom zijn verbonden\n\nTip: Organiseer draad per kleur (rood=+, zwart=-, groen=data)'
    },
    'jumper wire': {
        variants: ['jumper wire', 'jumper', 'jumperkabel', 'draad'],
        category: 'Component',
        description: 'Jumper verbindingskabel',
        connectionGuide: '**Jumper wires gebruiken:**\n\n1. Male-to-Male: Beide zijden spits (breadboard naar breadboard)\n2. Female-to-Male: Een zijde hol (Raspberry Pi GPIO naar breadboard)\n3. Female-to-Female: Beide zijden hol (component aan sensor)\n\nTip: Gebruik verschillende kleuren:\n- Rood: Voeding/5V\n- Zwart: Ground/GND\n- Overig: Data signalen'
    },
    'servo': {
        variants: ['servo', 'servo motor', 'servomotor'],
        category: 'Motor',
        description: 'Servo motor voor hoekpositie controle',
        connectionGuide: '**Servo aansluiten:**\n\n1. Bruine/zwarte draad → GND\n2. Rode draad → +5V\n3. Gele/oranje draad → PWM pin (bijv. Arduino pin 9)\n\nCode voorbeeld:\nServo myServo;\nmyServo.attach(9);\nmyServo.write(90); // Zet op 90 graden\n\nBereik: meestal 0-180 graden'
    },
    'sps30': {
        variants: ['sps30', 'sensirion sps30', 'particulate matter sensor'],
        category: 'Sensor',
        description: 'Sensirion SPS30 particulate matter (PM) sensor voor luchtkwaliteitsmetingen',
        connectionGuide: '**SPS30 aansluiten (I2C):**\n\n1. VCC → +5V\n2. GND → GND\n3. SCL → Arduino SCL/A5 (of Raspberry Pi GPIO 3)\n4. SDA → Arduino SDA/A4 (of Raspberry Pi GPIO 2)\n\nLibraries:\n- Arduino: Sensirion library\n- Python: sensirion-uart library\n\nI2C adres: 0x69'
    },
    'ultrasonic sensor': {
        variants: ['ultrasonic', 'hc-sr04', 'hcsr04', 'ultrasone sensor', 'afstandssensor', 'sensor'],
        category: 'Sensor',
        description: 'HC-SR04 ultrasone afstandssensor voor object detectie',
        connectionGuide: '**HC-SR04 aansluiten:**\n\n1. VCC → +5V\n2. GND → GND\n3. TRIG → Arduino pin 7\n4. ECHO → Arduino pin 8 (via spanningsdeler!)\n\n⚠️ ECHO geeft 5V: spanningsdeler gebruiken voor 3.3V systemen\n\nAfstand berekenen:\nDistance = (Echo Time × Sound Speed) / 2'
    },
    'temperature sensor': {
        variants: ['temperature', 'dht11', 'dht22', 'temperatuur sensor', 'temp sensor'],
        category: 'Sensor',
        description: 'DHT11/DHT22 temperatuur en luchtvochtigheid sensor',
        connectionGuide: '**DHT11/DHT22 aansluiten:**\n\n1. (+) → +5V\n2. OUT → Arduino pin (bijv. pin 2)\n3. (-) → GND\n4. Pull-up resistor: 10kΩ tussen pin en +5V\n\nLibrary: DHT library from Adafruit\n\nVerschil:\n- DHT11: Minder nauwkeurig, goedkoper\n- DHT22: Nauwkeuriger, iets duurder'
    },
    'lcd display': {
        variants: ['lcd', 'display', 'lcd1602', 'lcd 16x2', 'scherm'],
        category: 'Display',
        description: 'LCD display voor tekstweergave (bijv. 16x2 karakters)',
        connectionGuide: '**LCD 16x2 aansluiten (via I2C adapter):**\n\n1. GND → GND\n2. VCC → +5V\n3. SDA → Arduino A4 (of Raspberry Pi GPIO 2)\n4. SCL → Arduino A5 (of Raspberry Pi GPIO 3)\n\nLibrary: LiquidCrystal_I2C\n\nI2C adres: meestal 0x27 of 0x3F\n\nCode:\nLCD.print("Hallo!");\nLCD.setCursor(0, 1); // Tweede rij'
    },
    'motor driver': {
        variants: ['motor driver', 'l298n', 'h-bridge', 'motor controller'],
        category: 'Motor',
        description: 'L298N motor driver voor DC motoren en stappenmotor aansturing',
        connectionGuide: '**L298N aansluiten:**\n\n1. GND → GND\n2. +12V → Externe voeding\n3. IN1/IN2 → Arduino pins (PWM voor snelheid)\n4. OUT1/OUT2 → Motor aansluitingen\n\nControleren:\n- digitalWrite(IN1, HIGH); // Motor vooruit\n- analogWrite(PWM, 255); // Snelheid 255\n\nLET OP: Aparte voeding gebruiken voor motor!'
    },
    'pir sensor': {
        variants: ['pir', 'motion sensor', 'bewegingssensor', 'bewegingsmelder'],
        category: 'Sensor',
        description: 'PIR (Passive Infrared) bewegingssensor voor bewegingsdetectie',
        connectionGuide: '**PIR sensor aansluiten:**\n\n1. GND → GND\n2. VCC → +5V\n3. OUT → Arduino digital pin\n\nEigenschappen:\n- Output: HIGH (beweging) of LOW (geen beweging)\n- Warmup tijd: 30-60 seconden\n- Gevoeligheid instelbaar met potentiometer\n\nToepassing: bewegingsmelder, alarm systeem'
    },
    'relay': {
        variants: ['relay', 'relais', 'schakelaar'],
        category: 'Component',
        description: 'Relais module voor het schakelen van hogere spanningen',
        connectionGuide: '**5V Relay aansluiten:**\n\n1. GND → GND\n2. VCC → +5V\n3. IN → Arduino pin (via transistor!)\n4. COM → Gemeenschappelijk contact\n5. NO → Normaal open contact\n\n⚠️ ALTIJD transistor gebruiken! Arduino geeft onvoldoende stroom.\n\nToepassingen: licht schakelen, motor aanzetten, hoge spanning'
    },
    'potentiometer': {
        variants: ['potentiometer', 'pot', 'potmeter', 'draaiknop'],
        category: 'Component',
        description: 'Variabele weerstand voor analoge waarde controle',
        connectionGuide: '**Potentiometer aansluiten:**\n\n1. GND → GND\n2. +5V → +5V\n3. Wiper (middelste pin) → Arduino A0-A5\n\nUitlezen:\nint value = analogRead(A0); // 0-1023\nint percentage = (value / 1023) * 100;\n\nToepassingen: volume controle, LED helderheid, motor snelheid'
    },
    'button': {
        variants: ['button', 'push button', 'knop', 'drukknop'],
        category: 'Component',
        description: 'Drukknop voor gebruikersinvoer',
        connectionGuide: '**Drukknop aansluiten:**\n\n1. Ene zijde → +5V (via 10kΩ naar GND)\n2. Andere zijde → Arduino digital pin\n\nUitlezen:\nint state = digitalRead(buttonPin);\nif(state == LOW) { // Ingedrukt\n  // Actie uitvoeren\n}\n\nLet op: Debouncing nodig (vertraging 20ms)'
    },
    'buzzer': {
        variants: ['buzzer', 'piezo', 'zoemer', 'speaker'],
        category: 'Component',
        description: 'Piezo buzzer voor geluidsignalen',
        connectionGuide: '**Buzzer aansluiten:**\n\n1. (+) → PWM pin Arduino\n2. (-) → GND\n\nGeluiden produceren:\ntone(pin, 1000); // 1000 Hz\ndelay(500);\nnoTone(pin); // Stop\n\nVerschillende frequenties:\n- 262 Hz: C noot\n- 523 Hz: C hoger octaaf\n- 1046 Hz: C nog hoger'
    },
    'transistor': {
        variants: ['transistor', 'npn', 'pnp', '2n2222'],
        category: 'Component',
        description: 'Transistor voor schakel- en versterkingstoepassingen',
        connectionGuide: '**NPN Transistor aansluiten (2N2222):**\n\n1. Base → Arduino pin (via 1kΩ weerstand)\n2. Collector → Load (+5V zijde)\n3. Emitter → GND\n\nGedrag:\n- Base LOW → Transistor uit\n- Base HIGH → Transistor aan, stroom loopt\n\nToepassing: Motor/LED aansturen met Arduino'
    },
    'diode': {
        variants: ['diode', '1n4007', 'rectifier'],
        category: 'Component',
        description: 'Diode voor stroomrichting en spanningsbescherming',
        connectionGuide: '**1N4007 Diode aansluiten:**\n\n1. Anode (+) → Voeding\n2. Kathode (-) → Load\n\nLet op: Streep is kathode kant!\n\nToepassingen:\n- Polariteit bescherming\n- Back-EMF bescherming bij motoren\n- Gelijkrichter in voeding\n\nVorwaarts spanning drop: ~0.7V'
    },
    'esp32': {
        variants: ['esp32', 'esp-32', 'esp32-wroom'],
        category: 'Microcontroller',
        description: 'ESP32 microcontroller met WiFi en Bluetooth',
        connectionGuide: '**ESP32 programmeren en aansluiten:**\n\n1. USB → Computer (voor programmeren)\n2. GND → GND\n3. 3V3 → +3.3V voeding\n4. GPIO pins → Sensoren/actuators\n\nVerschillen met Arduino:\n- Spanningsniveau: 3.3V (niet 5V!)\n- Meer pins (30+)\n- WiFi/Bluetooth ingebouwd\n- Sneller (240MHz)\n\nLet op: Geen direct 5V aansluiten!'
    },
    'esp8266': {
        variants: ['esp8266', 'esp-8266', 'nodemcu', 'wemos'],
        category: 'Microcontroller',
        description: 'ESP8266 WiFi microcontroller voor IoT projecten',
        connectionGuide: '**ESP8266/NodeMCU aansluiten:**\n\n1. USB → Computer (voor programmeren)\n2. GND → GND\n3. 3V3 → Aparte +3.3V voeding (niet Arduino!)\n4. GPIO → Sensoren/actuators\n\nSpecifiek:\n- Spanningsniveau: 3.3V!\n- Minder GPIO pins dan Arduino\n- Ingebouwde WiFi\n- Goedkoop en populair voor IoT\n\nTip: Geschikt voor temperaturemeting via WiFi!'
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
 * Zoek items op basis van functionaliteit/description
 * @param {string} searchTerm - De zoekterm (bijv. 'object detectie', 'temperatuur meten')
 * @returns {array} Array van gevonden items gesorteerd op relevantie
 */
function searchByFunction(searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    const matches = [];

    for (const [name, data] of Object.entries(KNOWN_ITEMS)) {
        const descLower = data.description.toLowerCase();
        const nameLower = name.toLowerCase();
        
        // Tel hoeveel woorden uit de zoekopdracht in de description voorkomen
        const searchWords = lowerSearch.split(/\s+/).filter(w => w.length > 2);
        let score = 0;
        
        for (const word of searchWords) {
            // Hoger gewicht voor matches in de naam
            if (nameLower.includes(word)) {
                score += 3;
            }
            // Normaal gewicht voor matches in description
            if (descLower.includes(word)) {
                score += 1;
            }
            // Check ook variants
            for (const variant of data.variants) {
                if (variant.toLowerCase().includes(word)) {
                    score += 2;
                }
            }
        }
        
        if (score > 0) {
            matches.push({
                name: name,
                ...data,
                relevance: score
            });
        }
    }
    
    // Sorteer op relevantie (hoogste eerst)
    return matches.sort((a, b) => b.relevance - a.relevance);
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
    searchByFunction
};
