# Chat API Documentation

Volledige API-documentatie voor de chatbot REST API endpoints.

## Base URL

```text
http://localhost:3000
```

## Endpoints

### 1. Send Chat Message

**POST** `/api/chat`

Stuur een chatbericht en ontvang een response van de chatbot.

#### Request

```json
{
  "message": "Waar ligt de Raspberry Pi?",
  "userId": 123,
  "testMode": false
}
```

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| message | string | ✓ | Het chatbericht van de gebruiker |
| userId | number | - | ID van de gebruiker (voor logging) |
| testMode | boolean | - | Gebruik testdatabase i.p.v. production |

#### Response (Success)

```json
{
  "success": true,
  "response": "De raspberry pi ligt op: Vak 3. Aantal beschikbaar: 5.",
  "timestamp": "2025-12-24T12:00:00Z",
  "debug": {
    "intent": "find_item",
    "foundItem": "raspberry pi",
    "hasDatabase": true
  }
}
```

#### Response (Error)

```json
{
  "success": false,
  "error": "Chatbericht is verplicht en mag niet leeg zijn.",
  "timestamp": "2025-12-24T12:00:00Z"
}
```

#### Status Codes

- `200 OK` - Bericht succesvol verwerkt
- `400 Bad Request` - Ongeldig bericht (bijv. leeg)
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Chatbot service niet beschikbaar

#### Examples

**cURL:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Waar ligt de Raspberry Pi?"}'
```

**JavaScript/Fetch:**

```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hebben we LEDs?' })
});
const data = await response.json();
console.log(data.response);
```

**JavaScript/Axios:**

```javascript
const axios = require('axios');

const result = await axios.post('http://localhost:3000/api/chat', {
  message: 'Een Arduino is kwijt'
});
console.log(result.data.response);
```

---

### 2. Get Chatbot Status

**GET** `/api/chat/status`

Controleer of de chatbot service beschikbaar is.

#### Response (Available)

```json
{
  "available": true,
  "status": "ok",
  "service": "chatbot",
  "version": "1.0.0",
  "intentsSupported": [
    "find_item",
    "stock_check",
    "missing",
    "help"
  ],
  "itemsKnown": 10
}
```

#### Response (Unavailable)

```json
{
  "available": false,
  "service": "chatbot",
  "error": "Chatbot service niet geladen"
}
```

#### Status Codes (Get Status)

- `200 OK` - Status succesvol opgehaald

#### Examples (Get Status)

**cURL:**

```bash
curl http://localhost:3000/api/chat/status
```

**JavaScript:**

```javascript
const status = await fetch('http://localhost:3000/api/chat/status')
  .then(r => r.json());
console.log('Chatbot available:', status.available);
```

---

## Intent Types

De chatbot ondersteunt de volgende intents:

| Intent | Detectie | Voorbeeld |
| ------ | -------- | --------- |
| **find_item** | Zoeken naar locatie | "Waar ligt de Raspberry Pi?" |
| **stock_check** | Voorraad controleren | "Hebben we LEDs op voorraad?" |
| **missing** | Vermist onderdeel melden | "Een Arduino is kwijt" |
| **help** | Uitleg vragen | "Hoe werkt een servo?" |
| **unknown** | Niet herkend | "Wat is het weer?" |

---

## Bekende Items

De chatbot kent deze items (met varianten):

- **Raspberry Pi** - raspi, rpi, pi 4, pi4
- **Arduino** - arduino, uno
- **LED** - led, ledlamp, lamp
- **Resistor** - weerstand, ohm
- **Capacitor** - condensator, kondensator
- **Breadboard** - bord
- **Jumper Wire** - jumperkabel, draad
- **Servo** - servo motor, servomotor
- **Sensor** - sensoren
- **Power Supply** - voeding, stroomvoorziening

Items kunnen eenvoudig worden uitgebreid in `project/chatbot/items.js`.

---

## Response Examples

### Find Item

```text
User: "Waar ligt de Raspberry Pi?"
Bot: "De raspberry pi ligt op: **Vak 3**. Aantal beschikbaar: 5."
```

### Stock Check

```text
User: "Hebben we LED lampen op voorraad?"
Bot: "✓ Ja, we hebben 12 stuks LED op voorraad! Locatie: Vak 1."
```

Wanneer niet op voorraad:

```text
Bot: "🚫 De LED is op dit moment NIET op voorraad. 
Vraag een medewerker wanneer deze weer beschikbaar is."
```

### Missing

```text
User: "Een Arduino is vermist"
Bot: "Bedankt dat je het meldt! De arduino is geregistreerd als vermist. 
Een medewerker zal dit onderzoeken."
```

### Help

```text
User: "Hoe werkt een servo?"
Bot: "**SERVO**

Servo motor voor hoekpositie controle

Kategorie: Motor

Kan ik nog wat anders voor je doen?"
```

### Unknown

```text
User: "Welke kleur is het weer?"
Bot: "Sorry, ik snap dit niet helemaal. 
Kun je dat anders formuleren?"
```

---

## Error Handling

### Lege bericht

```json
{
  "success": false,
  "error": "Chatbericht is verplicht en mag niet leeg zijn."
}
```

### Service onbeschikbaar

```json
{
  "success": false,
  "error": "Chatbot service is momenteel niet beschikbaar. 
Probeer het later opnieuw."
}
```

### Server error

```json
{
  "success": false,
  "error": "Er is een serverfout opgetreden. Probeer het later opnieuw."
}
```

---

## Debug Mode

In development modus (NODE_ENV=development) bevat de response een `debug` object:

```json
{
  "success": true,
  "response": "...",
  "debug": {
    "intent": "find_item",
    "foundItem": "raspberry pi",
    "hasDatabase": true
  }
}
```

---

## Rate Limiting

Momenteel geen rate limiting. Dit kan worden geïmplementeerd in `chatApi.js` met `express-rate-limit`.

---

## CORS

CORS is ingeschakeld. Frontend kan vanaf elke origin berichten sturen.

---

## Database Integration

De chatbot query de backend database via `/api/onderdelen/search`:

```javascript
// Wordt automatisch aangeroepen door chatbot
GET /api/onderdelen/search?name=raspberry%20pi
```

Zorg dat deze endpoint beschikbaar is in `server.js`.

---

## Logging

Chatbot interacties worden gelogd in de console. Voor productie kunt u dit uitbreiden naar een logfile of database.

---

## Toekomstige Endpoints

Geplande endpoints voor toekomstige versies:

- `GET /api/chat/history` - Chat geschiedenis ophalen
- `POST /api/chat/feedback` - Feedback op antwoorden
- `GET /api/chat/suggestions` - Vraagsugesties
- `POST /api/chat/train` - Machine learning feedback

---

## Troubleshooting

### "Chatbot service is momenteel niet beschikbaar"

- Check of `/project/chatbot/index.js` correct wordt geïmporteerd
- Controleer of `axios` is geïnstalleerd in `/project/chatbot`

### Backend database query mislukt

- Verify `/api/onderdelen/search` endpoint in backend
- Check backend server staat aan op poort 3000

### No items recognized

- Zorg dat items in `items.js` KNOWN_ITEMS dictionary staan
- Test intent detection met `/api/chat/status`

---

## Version

Current version: **1.0.0**

Last updated: December 24, 2025
