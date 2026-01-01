# Frontend

React 19 + Vite applicatie.

## Structuur

**4 Tabs**:

1. Shop - Onderdelen bekijken en reserveren
2. Projecten - Project beheer
3. Admin - Gebruikers, stats, onderdelen (teacher+)
4. Test - Test database (admin only)

## Hoofdcomponenten

Alles in één `App.jsx` component (voor nu).

**State**:

- `user` - Ingelogde gebruiker
- `onderdelen` - Alle onderdelen
- `projects` - Alle projecten
- `reserveringen` - Alle reserveringen
- `categories` - Categorieën
- `users` - Gebruikerslijst
- `testModeActive` - Test database aan/uit

## Features

### Dark Mode

- Auto-detectie system theme
- Real-time updates bij theme wijziging

### Zoeken

- Real-time filter op naam, artikelnummer, beschrijving
- Geen submit knop nodig

### Modals

- Onderdeel details + reserveer form
- Project details + retourneer buttons
- Edit formulieren

### API Calls

```javascript
const apiUrl = (url) => {
  if (testModeActive) return `${url}?testMode=true`
  return url
}
```

## Test Mode

Admin kan test database activeren met toggle. Alle API calls gebruiken dan `test_opslag.db` in plaats van `opslag.db`.

## Starten

```bash
cd project/frontend
npm install
npm run dev
```

Development: `http://localhost:5173`

## Build

```bash
npm run build    # Output: dist/
npm run preview  # Test production build
```
