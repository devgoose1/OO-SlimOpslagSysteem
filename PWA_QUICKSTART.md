# PWA Quick Start

## 🚀 Snel Starten

### 1. Firewall Configureren (Eenmalig - Als Administrator)

Open PowerShell **als Administrator** en voer uit:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 2. Start Beide Servers

**Eén Commando:**

```powershell
cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem
npm start
```

Dit start automatisch:

- ✅ Backend op poort 3000
- ✅ Frontend op poort 5173

### 3. Testen

**Op je laptop:**

- Open: <http://localhost:5173>

**Op je telefoon:**

- Zorg dat je op hetzelfde WiFi bent
- Open: **<http://192.168.68.122:5173>**
- Installeer de PWA via browser menu

## ✅ Klaar

Lees [PWA_TESTING.md](PWA_TESTING.md) voor volledige instructies en troubleshooting.

## 📝 Belangrijke Files

- `.env.local` - API configuratie (gebruikt je netwerk IP)
- `vite.config.js` - Configured voor network access
- `server.js` - CORS ingesteld voor lokaal netwerk
- `manifest.json` - PWA configuratie
- `sw.js` - Service worker voor offline functionaliteit
