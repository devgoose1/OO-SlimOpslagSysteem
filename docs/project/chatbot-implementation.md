# Chatbot Implementatiegids

Een stap-voor-stap gids voor implementatie en testing van de chatbot.

## 📋 Checklist

- [ ] Chatbot module aangemaakt in `/project/chatbot`
- [ ] Backend `chatApi.js` toegevoegd
- [ ] Backend `server.js` aangepasst
- [ ] Dependencies geïnstalleerd
- [ ] Chatbot getest
- [ ] Frontend geïntegreerd

---

## 🚀 Quick Start

### 1. Installeer Dependencies

**Backend:**

```bash
cd project/backend
npm install
```

**Chatbot:**

```bash
cd project/chatbot
npm install
```

**Frontend:**

```bash
cd project/frontend
npm install
```

### 2. Start Backend

```bash
cd project/backend
node server.js
```

Controleer: `http://localhost:3000/status`

### 3. Test Chatbot API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Waar ligt de Raspberry Pi?"}'
```

### 4. Check Chatbot Status

```bash
curl http://localhost:3000/api/chat/status
```

---

## 🧪 Testing

### Unit Tests

```bash
cd project/chatbot
node test_chatbot.js
```

Output voorbeeld:

```text
📋 Testing Intent Detection...
✓ Should detect find_item intent
✓ Should detect stock_check intent
✓ Should detect missing intent
✓ Should detect help intent
✓ Should detect unknown intent for unrelated query

🔍 Testing Item Extraction...
✓ Should extract Raspberry Pi
✓ Should extract breadboard
✓ Should extract multiple items

... [meer tests]

📊 Test Summary
==================================================
✓ Passed: 20
✗ Failed: 0
📈 Total: 20

🎉 Alle tests geslaagd!
```

### Manual Testing

```bash
# Test various intents
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hebben we LEDs op voorraad?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Een Arduino is kwijt"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hoe werkt een servo?"}'
```

### Frontend Testing

```javascript
// In browser console of via Postman

// Test 1: Send message
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Waar ligt de LED?' })
})
.then(r => r.json())
.then(data => console.log(data.response));

// Test 2: Check status
fetch('http://localhost:3000/api/chat/status')
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## 🔧 Configuratie

### Backend (server.js)

Chatbot API wordt automatisch geregistreerd wanneer de server start:

```javascript
const { registerChatRoutes } = require('./chatApi');
// ...
registerChatRoutes(app);
```

### Chatbot (intents.js)

Voeg keywords toe voor nieuwe intents:

```javascript
const INTENT_KEYWORDS = {
    mijn_intent: {
        keywords: ['keyword1', 'keyword2'],
        patterns: ['pattern.*']
    }
};
```

### Items (items.js)

Voeg nieuwe onderdelen toe:

```javascript
const KNOWN_ITEMS = {
    'mijn-onderdeel': {
        variants: ['variant1', 'variant2'],
        category: 'Category',
        description: 'Beschrijving'
    }
};
```

### Response (responder.js)

Voeg response-generatie toe voor nieuwe intents:

```javascript
case 'mijn_intent':
    return `Mijn response voor ${item?.name || 'dit onderdeel'}`;
```

---

## 📁 Bestandsstructuur na implementatie

```text
project/
├── backend/
│   ├── chatApi.js          [NEW]
│   ├── server.js           [MODIFIED]
│   ├── database.js
│   ├── package.json
│   └── ...
├── chatbot/                [NEW FOLDER]
│   ├── index.js
│   ├── intents.js
│   ├── items.js
│   ├── responder.js
│   ├── test_chatbot.js
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── chatService.js  [NEW]
│   │   └── ...
│   └── ...
└── docs/
    └── project/
        └── chatbot-api.md  [NEW]
```

---

## 🔍 Debugging

### Enable Debug Mode

```bash
# Chatbot service
DEBUG=true node project/chatbot/index.js

# Backend
DEBUG=chatbot-* node server.js
```

### Check Logs

Chatbot loggt naar console:

```text
[INTENT] find_item (confidence: 0.8)
[ITEMS] Mogelijke items: ['raspberry', 'pi']
[MATCH] Gevonden item: raspberry pi
[DB] Querying database voor raspberry pi...
```

### Common Issues

#### Issue: "Chatbot service niet geladen"

**Oplossing:**

```bash
cd project/chatbot
npm install
```

#### Issue: "Items not recognized"

**Check:**

- Controleer spelling in KNOWN_ITEMS
- Verify keywords in intents.js
- Run: `DEBUG=true node test_chatbot.js`

#### Issue: "Database queries fail"

**Check:**

- Verify `/api/onderdelen/search` exists in backend
- Check database connection in `database.js`
- Test backend directly: `curl http://localhost:3000/api/onderdelen`

---

## 📊 Performance

### Memory Usage (Raspberry Pi 4B, 2GB RAM)

- Chatbot service: ~30-50 MB
- Backend + Chatbot: ~150-200 MB
- Margin: ~1GB free for operations

### Response Time

- Local message: < 100ms
- With database query: 100-500ms
- Network latency included

### Optimization Tips

1. **Cache item lookups:** Voeg cache in `items.js` toe
2. **Limit database queries:** Cache database results
3. **Async operations:** Huiding reeds geoptimaliseerd
4. **Lazy loading:** Load items only when needed

---

## 🚀 Production Deployment

### Separate Process (Recommended)

Voor production moet de chatbot in een apart process draaien:

```bash
# Terminal 1 - Backend
cd project/backend
node server.js

# Terminal 2 - Chatbot service
cd project/chatbot
node index.js
```

### Environment Variables

Maak `.env` bestand in `/project/backend`:

```env
NODE_ENV=production
PORT=3000
CHATBOT_URL=http://localhost:5000
DATABASE_PATH=./database/opslag.db
```

Update `chatApi.js`:

```javascript
const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:5000';
```

### Docker (Optional)

```dockerfile
FROM node:16-alpine

WORKDIR /app/backend
COPY project/backend ./

RUN npm install

COPY project/chatbot ../chatbot
RUN cd ../chatbot && npm install

CMD ["node", "server.js"]
```

---

## 📚 Verdere Lezen

- [Chatbot README](../chatbot/README.md)
- [API Documentation](./chatbot-api.md)
- [Frontend Integration](./chatbot-frontend.md)

---

## 🎓 Voor Schoolproject Presentatie

### Punten om uit te leggen

1. **Architecture**
   - Modulaire opbouw (intents, items, responder)
   - REST API koppeling
   - Asynchrone verwerking

2. **Intent Detection**
   - Keyword matching
   - Pattern matching met regex
   - Confidence scoring

3. **Item Recognition**
   - Database van bekende items
   - Variant matching
   - Fuzzy matching mogelijkheden

4. **Response Generation**
   - Dynamic content generatie
   - Database integratie
   - Fallback handling

5. **Performance**
   - Memory efficient
   - Geschikt voor Raspberry Pi
   - Sub-100ms response times

### Demo Script

```javascript
// 1. Show status
fetch('http://localhost:3000/api/chat/status').then(r => r.json());

// 2. Simple query
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Waar ligt de Raspberry Pi?' })
}).then(r => r.json()).then(d => console.log(d.response));

// 3. Show debug info
fetch('...').then(r => r.json()).then(d => console.log(d.debug));
```

---

## ✅ Validation Checklist

Voor production:

- [ ] Alle dependencies geïnstalleerd
- [ ] Tests slagen (20/20)
- [ ] Beide databases (prod + test) werken
- [ ] API endpoints antwoorden
- [ ] Frontend integreert correct
- [ ] Error handling werkt
- [ ] Performance acceptabel
- [ ] Logs zijn schoon (geen errors)

---

## 📞 Support

Bij vragen:

1. Controleer de relevante README's
2. Voer unit tests uit
3. Check debug logs
4. Verify database connection
5. Contact project team

---

Last Updated: December 24, 2025
