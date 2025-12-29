# PWA Testing Instructies

## 🎯 Overzicht

Deze instructies helpen je om de Slim Opslagsysteem PWA te testen op je telefoon via je lokale netwerk.

## 📋 Vereisten

- Laptop en telefoon op hetzelfde WiFi-netwerk
- Windows Firewall configuratie om poorten toe te staan
- Chrome, Edge, of Safari op je telefoon

## 🔧 Setup

### 1. IP Configuratie

Je lokale netwerk IP is: **192.168.68.122**

De frontend draait op: `http://192.168.68.122:5173`
De backend draait op: `http://192.168.68.122:3000`

### 2. Firewall Configuratie (Windows)

Voer deze commando's uit in PowerShell als Administrator:

```powershell
# Sta Vite dev server toe (frontend)
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# Sta Node.js backend toe
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Of via de Windows Firewall GUI:**

1. Open "Windows Defender Firewall with Advanced Security"
2. Klik op "Inbound Rules" → "New Rule"
3. Kies "Port" → TCP → Specific local ports: `5173,3000`
4. Allow the connection
5. Apply to alle profielen
6. Naam: "Dev Server Ports"

### 3. Servers Starten

**Eén Commando voor Beide Servers:**

```powershell
cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem
npm start
```

Dit start automatisch:

- ✅ Backend op <http://0.0.0.0:3000>
- ✅ Frontend op <http://0.0.0.0:5173>

Je zou moeten zien:

```text
[backend] Server draait op http://0.0.0.0:3000
[frontend] VITE v5.x.x ready in xxx ms
[frontend] ➜ Local:   http://localhost:5173/
[frontend] ➜ Network: http://192.168.68.122:5173/
```

**Stop beide servers:** Druk `Ctrl+C`

## 📱 Testen op Telefoon

### Stap 1: Open de App

1. Open op je telefoon een browser (Chrome/Edge/Safari)
2. Ga naar: `http://192.168.68.122:5173`
3. De app zou moeten laden

### Stap 2: PWA Installeren

**Op Android (Chrome/Edge):**

1. Tik op het menu (⋮) rechtsboven
2. Kies "Add to Home screen" of "Install app"
3. Bevestig de installatie
4. Het icoon verschijnt op je home screen

**Op iOS (Safari):**

1. Tik op het deel-icoon (□↑)
2. Scroll naar beneden en tik "Add to Home Screen"
3. Geef een naam en tik "Add"
4. Het icoon verschijnt op je home screen

### Stap 3: PWA Features Testen

#### ✅ Offline Functionaliteit

1. Open de geïnstalleerde app
2. Log in en gebruik de app
3. Schakel WiFi uit of zet je telefoon in vliegtuigmodus
4. Probeer door de app te navigeren
5. Service worker zou gecachete data moeten tonen

#### ✅ Standalone Mode

- De app zou moeten draaien zonder browser UI (geen adresbalk)
- Volledig scherm ervaring
- Splash screen bij het openen

#### ✅ Native Feel

- App verschijnt in recente apps
- Kan schakelen tussen apps
- Notificatie badge support (als geïmplementeerd)

#### ✅ Install Prompt

- Check of de PWA install banner verschijnt
- Test de PWAInstallButton component in de app

## 🔍 Debugging

### Chrome DevTools (op je laptop)

1. Open Chrome op je laptop
2. Ga naar `chrome://inspect`
3. Selecteer je telefoon (via USB debugging)
4. Inspect de app om console logs en network requests te zien

### Service Worker Check

1. Open de app op je telefoon
2. Ga naar `http://192.168.68.122:5173`
3. Open Chrome DevTools → Application tab → Service Workers
4. Check of de service worker geregistreerd en actief is

### Manifest Check

In DevTools → Application tab → Manifest:

- Controleer of alle velden correct zijn
- Check of iconen laden
- Verifieer start_url en scope

## 🐛 Problemen Oplossen

### App laadt niet op telefoon

- ✅ Check of je op hetzelfde WiFi netwerk bent
- ✅ Ping `192.168.68.122` vanaf je telefoon (gebruik een network tool app)
- ✅ Controleer firewall regels
- ✅ Check of beide servers draaien

### PWA installeert niet

- ✅ Moet via HTTPS draaien voor productie (lokaal HTTP is OK voor testing)
- ✅ Check of manifest.json correct is
- ✅ Verifieer dat service worker registreert
- ✅ iOS vereist standalone display mode

### Service Worker werkt niet

- ✅ Check console voor errors
- ✅ Verifieer `/sw.js` bereikbaar is
- ✅ Clear browser cache en herlaad
- ✅ Check service worker registration in main.jsx

### Backend niet bereikbaar

- ✅ Controleer CORS instellingen in server.js
- ✅ Check of backend op 0.0.0.0:3000 luistert
- ✅ Test backend met: `curl http://192.168.68.122:3000/status`

## 📝 Testing Checklist

- [ ] Backend server draait op poort 3000
- [ ] Frontend server draait op poort 5173
- [ ] Firewall regels toegevoegd
- [ ] App opent op telefoon via browser
- [ ] App kan geïnstalleerd worden
- [ ] App draait in standalone mode
- [ ] App werkt offline (basis caching)
- [ ] Service worker is geregistreerd
- [ ] API calls werken (check network tab)
- [ ] Login functionaliteit werkt
- [ ] Data wordt geladen en getoond

## 🚀 Voor Productie

Voor een echte productie deployment heb je nodig:

1. **HTTPS** - Verplicht voor PWA (behalve localhost)
2. **Echte iconen** - PNG formaat, verschillende sizes
3. **Domain** - Eigen domein naam
4. **Service Worker** - Optimaliseren voor production
5. **App Store** - Eventueel TWA (Trusted Web Activity) voor Play Store

## 📚 Nuttige Links

- [PWA Builder](https://www.pwabuilder.com/) - Test en verbeter je PWA
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/) - PWA audit tool
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [PWA Checklist](https://web.dev/pwa-checklist/)

## 💡 Tips

1. **Herstart browsers** na grote changes aan service worker
2. **Clear cache** regelmatig tijdens development
3. **Test op verschillende devices** - iOS en Android gedragen zich anders
4. **Chrome DevTools** - Gebruik het Application panel voor PWA debugging
5. **Network throttling** - Test met slechte verbinding in DevTools

## 🎉 Success Criteria

Je PWA werkt correct als:

- ✅ App installeert op home screen
- ✅ App opent in fullscreen (geen browser UI)
- ✅ App blijft werken zonder internet (basis functionaliteit)
- ✅ App icoon en naam zijn correct
- ✅ App kan data laden van de backend
- ✅ Service worker is actief

Veel success met testen! 🚀
