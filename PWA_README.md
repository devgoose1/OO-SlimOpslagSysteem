# 🎉 PWA Setup Compleet

Je PWA is nu klaar om te testen op je telefoon! Hier is alles wat je nodig hebt om te starten.

## 🚀 Quick Start (3 stappen)

### 1️⃣ Firewall Configureren (Eenmalig - Als Administrator)

Open **PowerShell als Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 2️⃣ Start Beide Servers (1 commando!)

**Eén Terminal - Beide Servers:**

```powershell
cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem
npm start
```

✨ Dit start automatisch zowel de backend als frontend!

**Stop beide servers:** Druk `Ctrl+C` in de terminal

### 3️⃣ Test op Telefoon

1. Verbind je telefoon met hetzelfde WiFi
2. Open browser op je telefoon
3. Ga naar: **<http://192.168.68.122:5173>**
4. Test de app en installeer via browser menu!

## 🔒 HTTPS voor PWA install op mobiel

De automatische PWA-install prompt werkt alleen via HTTPS (of localhost). Gebruik mkcert voor een lokaal certificaat:

1. **Installeer mkcert** (PowerShell als Administrator):

 ```powershell
 choco install mkcert -y
 mkcert -install
 ```

1. **Genereer certificaten** in `project/frontend`:

 ```powershell
 cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem\project\frontend
 mkcert localhost 127.0.0.1 192.168.68.122
 ```

 Dit maakt `localhost+2.pem` en `localhost+2-key.pem`.

1. **Start servers** (`npm start`). Vite gebruikt nu automatisch HTTPS als beide files bestaan.
1. **Open op telefoon:** <https://192.168.68.122:5173> en accepteer het certificaat. Daarna verschijnt de install-optie.

## 📚 Documentatie

| Bestand | Doel |
| --------- | ------ |
| **[PWA_QUICKSTART.md](PWA_QUICKSTART.md)** | ⚡ Snelle start (dit document in detail) |
| **[PWA_CHECKLIST.md](PWA_CHECKLIST.md)** | ✅ Volledige test checklist |
| **[PWA_TESTING.md](PWA_TESTING.md)** | 📖 Uitgebreide testing guide |
| **[PWA_SETUP_SUMMARY.md](PWA_SETUP_SUMMARY.md)** | 🔧 Technische details van de setup |

## 📝 Wat Is Er Veranderd?

### ✅ Geconfigureerde Bestanden

- `project/frontend/.env` - Basis API configuratie
- `project/frontend/.env.local` - **Jouw netwerk IP (192.168.68.122)**
- `project/frontend/vite.config.js` - Netwerk toegang enabled
- `project/frontend/src/App.jsx` - Environment variable support
- `project/backend/server.js` - CORS voor lokaal netwerk
- `project/frontend/public/manifest.json` - PWA iconen updated

### ✅ Nieuwe Bestanden

- `project/frontend/public/icons/` - 5 PWA iconen (SVG)
- `PWA_QUICKSTART.md` - Deze guide
- `PWA_CHECKLIST.md` - Test checklist
- `PWA_TESTING.md` - Volledige testing instructies
- `PWA_SETUP_SUMMARY.md` - Technische details
- `setup-pwa-dev.ps1` - Automated setup script

## 🎯 PWA Features

✅ **Installeerbaar** - Add to Home Screen
✅ **Offline Support** - Service Worker caching
✅ **Standalone Mode** - Native app feel
✅ **Responsive** - Werkt op alle devices
✅ **Fast** - Optimized loading
✅ **Network Ready** - Werkt op lokaal netwerk

## 🌐 Je Netwerk URLs

| Locatie | URL |
| --------- | ----- |
| **Telefoon (Frontend)** | <http://192.168.68.122:5173> |
| **Telefoon (Backend)** | <http://192.168.68.122:3000> |
| **Laptop (Frontend)** | <http://localhost:5173> |
| **Laptop (Backend)** | <http://localhost:3000> |

## 🔍 Verificatie

Na het starten van de servers, test deze URLs:

**Backend Status:**

```text
http://192.168.68.122:3000/status
```

Verwacht: `{"status":"Server draait goed!"}`

**Frontend (op telefoon):**

```text
http://192.168.68.122:5173
```

Verwacht: App laadt normaal

## 🐛 Problemen?

### App laadt niet op telefoon

1. Check of beide servers draaien
2. Verify firewall regels zijn toegevoegd
3. Test op laptop eerst: <http://192.168.68.122:5173>
4. Check of telefoon op hetzelfde WiFi is

### Service Worker werkt niet

1. Check console voor errors (F12)
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)
4. Verify `/sw.js` bereikbaar is

### CORS Errors

1. Restart backend server
2. Check CORS config in server.js
3. Verify IP address klopt (192.168.68.122)

**Meer troubleshooting:** Zie [PWA_TESTING.md](PWA_TESTING.md)

## 📱 Installatie Instructies

### Android (Chrome/Edge)

1. Open <http://192.168.68.122:5173>
2. Menu (⋮) → "Add to Home screen"
3. Bevestig
4. Tap icoon op home screen om te openen

### iOS (Safari)

1. Open <http://192.168.68.122:5173>
2. Deel icoon (□↑)
3. "Add to Home Screen"
4. Bevestig

## 🎓 Volgende Stappen

### Basis Testing

- [ ] App installeert op telefoon
- [ ] Werkt in standalone mode
- [ ] Offline functionaliteit werkt
- [ ] Login en data loading OK

### Geavanceerd Testing

- [ ] Test op meerdere devices
- [ ] Test verschillende browsers
- [ ] Test offline → online transitie
- [ ] Performance testing

### Productie Voorbereiding

- [ ] HTTPS setup (Let's Encrypt)
- [ ] PNG icons (converteer SVG)
- [ ] Optimize en minify
- [ ] Deploy naar server
- [ ] Custom domain

## 💡 Tips

1. **Gebruik PWA_CHECKLIST.md** voor systematisch testen
2. **Check DevTools** voor debugging (F12 → Application tab)
3. **Clear cache** als je changes niet ziet
4. **Test offline mode** door WiFi uit te zetten
5. **Herstart servers** na grote wijzigingen

## 🎉 Klaar om te Testen

Je setup is compleet! Start de servers en test op je telefoon.

### Hulp Nodig?

- 📖 Lees [PWA_TESTING.md](PWA_TESTING.md) voor details
- ✅ Gebruik [PWA_CHECKLIST.md](PWA_CHECKLIST.md) als guide
- 🔧 Check [PWA_SETUP_SUMMARY.md](PWA_SETUP_SUMMARY.md) voor technische info

## Veel success
