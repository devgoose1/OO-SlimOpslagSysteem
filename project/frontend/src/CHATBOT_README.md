# Chatbot Frontend Integratie

De chatbot is nu geïntegreerd in de frontend als een **floating chat widget**.

## 🎨 Design

- **Floating Action Button (FAB)** - Altijd zichtbaar in de rechter onderhoek
- **Modern Chat UI** - Slide-up animatie, gradient kleuren
- **Dark/Light mode** - Automatische aanpassing aan systeem thema
- **Responsive** - Werkt op desktop én mobile

## 📦 Componenten

### ChatBot.jsx

Het hoofdcomponent dat de chatbot UI beheert:

- Message state management
- API communicatie
- Auto-scroll functionaliteit
- Quick action buttons
- Typing indicator

### ChatBot.css

Volledige styling met:

- Modern gradient design
- Smooth animaties
- Dark mode support
- Responsive layout
- Custom scrollbar

## 🚀 Gebruik

De chatbot is automatisch beschikbaar op alle pagina's:

1. **Klik op de 💬 button** rechts onderin
2. **Chat window opent** met welkomstbericht
3. **Type je vraag** of gebruik quick actions
4. **Ontvang antwoord** van de AI assistent

## 💡 Features

### Quick Actions

Drie handige snelkoppelingen:

- "Waar ligt...?" - Zoek locatie van onderdeel
- "Voorraad?" - Check beschikbaarheid
- "Help!" - Vraag uitleg over onderdeel

### Real-time Chat

- Typing indicator tijdens verwerking
- Message timestamps
- Error handling met fallback

### User Context

- Stuurt user ID mee (als ingelogd)
- Personalisatie mogelijk

## 🎯 Voorbeelden

### Vind locatie

```text
User: "Waar ligt de Raspberry Pi?"
Bot: "De raspberry pi ligt op: **Vak 3**. Aantal beschikbaar: 5."
```

### Check voorraad

```text
User: "Hebben we LEDs?"
Bot: "✓ Ja, we hebben 12 stuks LED op voorraad! Locatie: Vak 1."
```

### Vermist item

```text
User: "Arduino is kwijt"
Bot: "Bedankt dat je het meldt! De arduino is geregistreerd als vermist..."
```

### Help

```text
User: "Hoe werkt een servo?"
Bot: "**SERVO** - Servo motor voor hoekpositie controle..."
```

## 🎨 Styling Aanpassen

### Kleuren

In [ChatBot.css](ChatBot.css):

```css
/* Gradient kleuren aanpassen */
.chat-fab {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Of custom kleur */
.chat-fab {
    background: #your-color;
}
```

### Positie

```css
.chat-fab {
    bottom: 24px; /* Vanaf onderkant */
    right: 24px;  /* Vanaf rechterkant */
}
```

### Grootte

```css
.chat-window {
    width: 400px;  /* Breedte */
    height: 600px; /* Hoogte */
}
```

## 🔧 Configuratie

### API Endpoint

In [ChatBot.jsx](ChatBot.jsx), regel 38:

```javascript
const response = await fetch('http://localhost:3000/api/chat', {
```

Voor production:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const response = await fetch(`${API_URL}/api/chat`, {
```

### Welkomstbericht

In [ChatBot.jsx](ChatBot.jsx), regel 6-14:

```javascript
const [messages, setMessages] = useState([
    {
        id: 0,
        type: 'bot',
        text: 'Je eigen welkomstbericht hier...',
        timestamp: new Date()
    }
]);
```

### Quick Actions (Customization)

In [ChatBot.jsx](ChatBot.jsx), regel 80-84:

```javascript
const quickActions = [
    { text: 'Custom', prompt: 'Je eigen prompt' },
    // Voeg meer toe...
];
```

## 📱 Responsive Breakpoints

```css
@media (max-width: 768px) {
    /* Mobile styling */
    .chat-window {
        width: calc(100vw - 24px);
        height: calc(100vh - 150px);
    }
}
```

## 🐛 Troubleshooting

### Chat opent niet

- Check of ChatBot component correct geïmporteerd is in App.jsx
- Verify CSS is correct ingeladen

### Berichten komen niet door

- Controleer of backend draait op <http://localhost:3000>
- Check console voor CORS errors
- Verify `/api/chat` endpoint bereikbaar is

### Styling werkt niet

- Check of ChatBot.css correct geïmporteerd is
- Verify CSS variabelen voor dark mode
- Clear browser cache

### Quick actions werken niet

- Check `handleQuickAction` functie
- Verify `setInputMessage` is correct aangeroepen

## 🎓 Code Walkthrough

### Component structuur

```jsx
<ChatBot user={user}>
  └── Floating Action Button (FAB)
  └── Chat Window (conditional render)
      ├── Header
      ├── Messages Area
      │   ├── Bot messages
      │   ├── User messages
      │   └── Typing indicator
      ├── Quick Actions
      └── Input Form
          ├── Text input
          └── Send button
</ChatBot>
```

### State Management

```javascript
messages        // Array van chat berichten
inputMessage    // Huidige input tekst
isLoading       // Loading state tijdens API call
isChatOpen      // Chat window open/gesloten
```

### API Flow

```text
User types message
  ↓
Submit form
  ↓
Add to messages (user)
  ↓
POST /api/chat
  ↓
Await response
  ↓
Add to messages (bot)
  ↓
Auto-scroll to bottom
```

## ✨ Toekomstige Features

Mogelijke uitbreidingen:

- [ ] Message persistence (localStorage)
- [ ] Message reactions
- [ ] File attachments
- [ ] Voice input
- [ ] Multi-language support
- [ ] Chat history export
- [ ] Admin chat moderation
- [ ] Chatbot avatar customization

## 📚 Dependencies

Geen extra dependencies nodig! Gebruikt alleen:

- React (useState, useRef, useEffect)
- Native fetch API
- CSS3

## 🔗 Gerelateerd

- [Chatbot Backend](../../chatbot/README.md)
- [API Documentation](../../../docs/project/chatbot-api.md)
- [Implementation Guide](../../../docs/project/chatbot-implementation.md)

---

**Versie**: 1.0.0  
**Created**: December 24, 2025
