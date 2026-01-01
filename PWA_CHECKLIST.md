# 🚀 PWA Test Checklist

## ✅ Setup Verificatie

### Pre-Flight Check

- [ ] Je bent verbonden met WiFi netwerk
- [ ] Je telefoon is op hetzelfde WiFi netwerk
- [ ] Je hebt 2 terminals beschikbaar
- [ ] Windows Firewall regels zijn toegevoegd (zie hieronder)

### Firewall Setup (Eenmalig - Als Administrator)

```powershell
# Run in PowerShell als Administrator:
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

Verificatie:

```powershell
Get-NetFirewallRule -DisplayName "Vite Dev Server"
Get-NetFirewallRule -DisplayName "Node Backend"
```

## 🖥️ Servers Starten

### Start Beide Servers (Eén Commando!)

```powershell
cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem
npm start
```

**Verwachte output:**

```text
[backend] Server draait op http://0.0.0.0:3000
[backend] Database verbonden
[frontend] VITE v5.x.x ready in xxx ms
[frontend] ➜ Local:   http://localhost:5173/
[frontend] ➜ Network: http://192.168.68.122:5173/
```

- [ ] Backend server draait zonder errors
- [ ] Frontend server draait zonder errors  
- [ ] Network URL toont je IP (192.168.68.122)
- [ ] Beide poorten zijn in gebruik (3000 en 5173)

## 💻 Laptop Testing

### Browser Test (localhost)

1. Open browser op je laptop
2. Ga naar: <http://localhost:5173>
3. Test basis functionaliteit

- [ ] App laadt correct
- [ ] Kan inloggen
- [ ] Data wordt geladen
- [ ] Geen console errors

### Network Test (via IP)

1. Open nieuwe browser tab
2. Ga naar: <http://192.168.68.122:5173>
3. Test dat het werkt via IP

- [ ] App laadt via IP address
- [ ] Backend is bereikbaar
- [ ] Functionaliteit werkt hetzelfde

## 📱 Telefoon Testing

### Connectiviteit Check

**Op je telefoon:**

1. Verbind met WiFi netwerk
2. Open browser (Chrome/Edge/Safari)
3. Ga naar: **<http://192.168.68.122:5173>**

- [ ] Pagina laadt
- [ ] Login werkt
- [ ] Data wordt getoond
- [ ] API calls werken

### Service Worker Check

**In Chrome DevTools (laptop):**

1. Open <http://192.168.68.122:5173>
2. F12 → Application tab → Service Workers
3. Check status

- [ ] Service worker is registered
- [ ] Status: "activated and is running"
- [ ] Geen errors in console

### Manifest Check

**In Chrome DevTools:**

1. Application tab → Manifest
2. Verificeer alle velden

- [ ] Name: "Slim Opslagsysteem"
- [ ] Start URL: "/"
- [ ] Display: "standalone"
- [ ] Icons: Alle 5 sizes aanwezig
- [ ] Theme color: "#3b82f6"

## 🔧 PWA Installatie Test

### Android (Chrome/Edge)

1. Open <http://192.168.68.122:5173> in Chrome
2. Klik menu (⋮) rechtsboven
3. Klik "Add to Home screen" of "Install app"
4. Bevestig installatie

- [ ] Install banner verschijnt
- [ ] App installeert succesvol
- [ ] Icoon verschijnt op home screen
- [ ] Icoon toont "OS" logo

### Android - Geïnstalleerde App Test

1. Tap op het geïnstalleerde icoon
2. App opent

- [ ] App opent in standalone mode (geen browser UI)
- [ ] Geen adresbalk zichtbaar
- [ ] Splash screen toont (optioneel)
- [ ] App voelt native aan

### iOS (Safari)

1. Open <http://192.168.68.122:5173> in Safari
2. Tap deel-icoon (□↑)
3. Scroll naar "Add to Home Screen"
4. Tap "Add"

- [ ] "Add to Home Screen" optie beschikbaar
- [ ] App installeert
- [ ] Icoon op home screen
- [ ] App opent in standalone mode

## 🌐 Offline Functionaliteit Test

### Basis Offline Test

1. Open geïnstalleerde app
2. Log in en gebruik de app
3. Schakel WiFi uit (of vliegtuigmodus)
4. Navigeer door de app

- [ ] App blijft werken
- [ ] Gecachete data wordt getoond
- [ ] Geen crash bij offline
- [ ] Service worker handelt requests af

### Online/Offline Transitie

1. Start offline
2. Schakel WiFi aan
3. Refresh data

- [ ] App detecteert online status
- [ ] Nieuwe data wordt geladen
- [ ] Sync werkt correct

## 🎨 UI/UX Test

### Standalone Mode Features

- [ ] Status bar past bij theme color
- [ ] Geen browser chrome zichtbaar
- [ ] Volledig scherm ervaring
- [ ] Native app feel

### Navigation

- [ ] Back button werkt correct
- [ ] App blijft in standalone mode
- [ ] Geen redirect naar browser
- [ ] Smooth transitions

### Performance

- [ ] App laadt snel
- [ ] Geen lag bij navigatie
- [ ] Images laden correct
- [ ] Responsive op telefoon

## 🔍 DevTools Checks

### Console (F12)

- [ ] Geen errors
- [ ] Service worker logs zichtbaar
- [ ] API calls succesvol (200 status)
- [ ] Geen CORS errors

### Network Tab

- [ ] Requests gaan naar 192.168.68.122:3000
- [ ] Responses zijn 200 OK
- [ ] Service worker intercept zichtbaar
- [ ] Cache hits na reload

### Application Tab

**Service Workers:**

- [ ] Status: Activated
- [ ] Source: /sw.js
- [ ] Geen errors

**Manifest:**

- [ ] Alle velden correct
- [ ] Icons laden
- [ ] Geen warnings

**Cache Storage:**

- [ ] Cache 'opslag-app-v1' bestaat
- [ ] Cached files zichtbaar
- [ ] Updates werken

## 🚨 Common Issues

### ❌ App laadt niet op telefoon

**Check:**

```powershell
# Test backend bereikbaarheid
curl http://192.168.68.122:3000/status

# Check firewall
Get-NetFirewallRule -DisplayName "Vite Dev Server"

# Verify servers draaien
netstat -an | findstr "3000"
netstat -an | findstr "5173"
```

**Oplossing:**

- Verify beide servers draaien
- Check firewall regels
- Verify IP address (ipconfig)
- Test op laptop eerst via IP

### ❌ Service Worker registreert niet

**Check console voor:**

```text
Service Worker registration successful
```

**Oplossing:**

- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Check sw.js bereikbaar: <http://192.168.68.122:5173/sw.js>
- Verify HTTPS niet verplicht voor lokaal IP

### ❌ CORS Errors

**Console toont:**

```text
Access to fetch blocked by CORS policy
```

**Oplossing:**

- Check backend CORS config in server.js
- Verify IP address in CORS origins
- Restart backend server

### ❌ Icons laden niet

**Check:**

- [ ] Icons bestaan in /public/icons/
- [ ] Manifest.json paths kloppen
- [ ] Icons zijn bereikbaar via browser

**Test URLs:**

```text
http://192.168.68.122:5173/icons/icon-192x192.png.svg
http://192.168.68.122:5173/manifest.json
```

## 📊 Success Criteria

### ✅ PWA werkt als alle volgende punten kloppen

1. App installeert op telefoon home screen
2. App opent in standalone mode (geen browser UI)
3. App werkt offline (basis caching)
4. Service worker is geactiveerd
5. API calls werken vanaf telefoon
6. Icons en manifest zijn correct
7. Login en data loading werken
8. Performance is acceptabel

## 🎉 Voltooid

Als alle checks ✅ zijn, dan werkt je PWA correct!

### Volgende Stappen

- Test op meerdere devices
- Test verschillende browsers
- Optimize voor productie
- Deploy naar echte server met HTTPS

### Documentatie

- [PWA_TESTING.md](PWA_TESTING.md) - Volledige guide
- [PWA_QUICKSTART.md](PWA_QUICKSTART.md) - Snelle start
- [PWA_SETUP_SUMMARY.md](PWA_SETUP_SUMMARY.md) - Setup details

---

**Je Netwerk Info:**

- Frontend: <http://192.168.68.122:5173>
- Backend: <http://192.168.68.122:3000>
- Laptop: <http://localhost:5173>
