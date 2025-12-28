# Chatbot Service - Level 1.5

Een eenvoudige, regelgebaseerde chatbot voor Arduino en Raspberry Pi onderdelen. Geschikt voor Raspberry Pi 4B met 2GB RAM.

## 🎯 Functionaliteit

De chatbot kan gebruikers helpen met:
- **find_item**: Waar ligt een bepaald onderdeel?
- **stock_check**: Is iets op voorraad?
- **missing**: Rapporteren van vermiste onderdelen
- **help**: Uitleg over onderdelen

## 🏗️ Structuur

```
project/chatbot/
├── index.js          # Chatbot main service
├── intents.js        # Intent detection logica
├── items.js          # Item recognition & database
├── responder.js      # Response generatie
├── package.json      # Dependencies
└── README.md         # Dit bestand
```

### Modules

#### `intents.js`
Detecteert de intent van het gebruikersbericht op basis van:
- Keywords (bijv. "waar", "voorraad", "kwijt")
- Regex patterns
- Confidence scores

**Functies:**
- `detectIntent(message)` - Detecteert intent
- `extractPotentialItems(message)` - Haalt mogelijke itemnamen uit bericht

#### `items.js`
Herkenning van bekende Arduino/Raspberry Pi onderdelen:
- **Raspberry Pi**: variants: ['raspi', 'rpi', 'pi 4']
- **Arduino**: variants: ['uno']
- **LED**: weerstand, capacitor, etc.
- **Sensor, Servo, Jumper wires**, etc.

**Functies:**
- `findItemByName(searchTerm)` - Zoekt item op naam
- `findItemsInWords(words)` - Zoekt items in array van woorden
- `getAllItems()` - Geeft alle bekende items

#### `responder.js`
Genereert vriendelijke Nederlandse responses:
- Response per intent type
- Dynamic content uit database
- Fallback responses

**Functies:**
- `generateResponse(intent, item, databaseResult)` - Genereert response
- Specifieke functies per intent (respondFindItem, respondStockCheck, etc.)

#### `index.js`
Coördineert alles:
1. Intent detection
2. Item extraction
3. Database queries
4. Response generation

**Functies:**
- `processMessage(userMessage, options)` - Main functie
- `queryBackendDatabase(itemName)` - Queries backend
- `getStatus()` - Health check

## 🚀 Gebruik

### Als standalone module
```bash
cd project/chatbot
npm install
npm start
```

### Via backend API
```bash
# POST /api/chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Waar ligt de Raspberry Pi?"}'

# GET /api/chat/status
curl http://localhost:3000/api/chat/status
```

### Frontend integratie
```javascript
const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage })
});
const data = await response.json();
console.log(data.response);
```

## 📊 Voorbeelden

### Find item
```
User: "Waar ligt de Raspberry Pi?"
Bot: "De raspberry pi ligt op: Vak 3. Aantal beschikbaar: 5."
```

### Stock check
```
User: "Hebben we LED lampen op voorraad?"
Bot: "✓ Ja, we hebben 12 stuks LED op voorraad! Locatie: Vak 1."
```

### Missing
```
User: "Een Arduino is vermist"
Bot: "Bedankt dat je het meldt! De arduino is geregistreerd als vermist..."
```

### Help
```
User: "Hoe werkt een servo?"
Bot: "SERVO - Servo motor voor hoekpositie controle..."
```

## ⚙️ Configuratie

De chatbot zoekt items in `items.js` in de `KNOWN_ITEMS` object. Voeg hier meer items toe:

```javascript
const KNOWN_ITEMS = {
    'jouw-item': {
        variants: ['variant1', 'variant2'],
        category: 'Category',
        description: 'Beschrijving'
    }
};
```

## 🔗 Backend integratie

De chatbot communiceert met de backend via `/api/onderdelen/search`:

```javascript
// Dit wordt automatisch gecalled door chatbot
const response = await axios.get('http://localhost:3000/api/onderdelen/search', {
    params: { name: itemName }
});
```

## 📦 Dependencies

- **axios**: HTTP requests naar backend
- (geen zware AI libraries - alles regelgebaseerd!)

## 🎓 Voor schoolproject

Deze chatbot is specifiek ontworpen voor eenvoudig uit te leggen:
- Geen complexe AI-modellen
- Duidelijke, gecommentarieerde code
- Stap-voor-stap verwerking
- Memory-efficient voor Raspberry Pi

## 🐛 Debug mode

Schakel debug-informatie in:
```bash
DEBUG=true npm start
```

## 📝 Toekomstige verbeteringen

- Database persistentie voor geleerde items
- Context awareness (vorig bericht onthouden)
- NLP verbetering
- Fallback naar menselijke support
- Sentiment analysis
- Learning algorithm voor betere matches

## 📄 Licentie

ISC
