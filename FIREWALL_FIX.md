# ⚠️ BACKEND NIET BEREIKBAAR OP TELEFOON?

## Probleem

Backend werkt op laptop maar niet op telefoon.

## Oplossing: Voeg Firewall Regel Toe

### Optie 1: Via Script (Makkelijkst)

1. Rechtermuisklik op PowerShell
2. Kies "Run as Administrator"
3. Voer uit:

```powershell
cd C:\Users\njsch\Projecten\OO-SlimOpslagSysteem
.\add-firewall-rules.ps1
```

### Optie 2: Handmatig (Als Administrator)

Open PowerShell als Administrator en voer uit:

```powershell
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any

New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any
```

### Optie 3: Via Windows Firewall GUI

1. Open "Windows Defender Firewall with Advanced Security"
2. Klik "Inbound Rules" → "New Rule"
3. Type: Port
4. Protocol: TCP
5. Specific local ports: `3000`
6. Action: Allow the connection
7. Profile: Alle 3 (Domain, Private, Public)
8. Name: "Node Backend"
9. Herhaal voor poort `5173` (Vite Dev Server)

## Test Het

1. Start servers: `npm start`
2. Test op laptop: <http://192.168.68.122:3000/status>
3. Test op telefoon: <http://192.168.68.122:3000/status>

Beide moeten `{"status":"Server draait goed!"}` tonen.

## Nog Steeds Problemen?

### Check 1: Is backend bereikbaar via laptop IP?

```powershell
# Op je laptop
curl http://192.168.68.122:3000/status
```

### Check 2: Luistert backend op juiste interface?

```powershell
netstat -an | findstr "3000"
```

Moet tonen: `0.0.0.0:3000` of `[::]:3000` (NIET alleen 127.0.0.1:3000)

### Check 3: Zijn beide op hetzelfde WiFi?

- Laptop en telefoon moeten op hetzelfde netwerk zijn
- Check IP ranges: beide moeten 192.168.68.x zijn

### Check 4: Firewall regel actief?

```powershell
Get-NetFirewallRule -DisplayName "Node Backend" | Select-Object DisplayName, Enabled, Action
```

## Snelle Fix

```powershell
# Als Administrator
.\add-firewall-rules.ps1
```

Dan herstart servers en test opnieuw!
