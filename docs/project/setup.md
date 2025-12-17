# Setup & Installatie

## Vereisten

Node.js 18+ en npm 9+

## Installatie

### Backend
```bash
cd project/backend
npm install
node server.js
```
Server draait op `http://localhost:3000`

### Frontend
```bash
cd project/frontend
npm install
npm run dev
```
Frontend draait op `http://localhost:5173`

## Eerste Login

**URL**: http://localhost:5173  
**Username**: `admin`  
**Password**: `admin123`

⚠️ Wijzig admin wachtwoord direct na eerste login!

## Configuratie

1. Login als admin
2. Ga naar Admin tab
3. Klik Edit bij admin → nieuw wachtwoord
4. Maak eerste docenten/studenten aan
5. Voeg categorieën toe (Projecten tab)
6. Voeg eerste onderdelen toe (Admin tab)

## Troubleshooting

### Backend start niet
```bash
cd project/backend
rm -rf node_modules package-lock.json
npm install
```

### Database errors
```bash
mkdir -p database
chmod 755 database
node server.js  # Database wordt automatisch aangemaakt
```

### Frontend kan backend niet bereiken
Check of backend draait:
```bash
curl http://localhost:3000/status
```

### Port in gebruik
```bash
# Linux/macOS
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Login werkt niet
Reset admin password:
```bash
cd project/backend
node -e "
const bcrypt = require('bcrypt');
const { db } = require('./database');
bcrypt.hash('nieuwwachtwoord', 10).then(hash => {
    db.run('UPDATE users SET password = ? WHERE username = ?', 
           [hash, 'admin'], 
           () => console.log('Wachtwoord gereset!'));
});
"
```

## LAN Deployment

### Backend toegankelijk maken
In `server.js` verander naar:
```javascript
app.listen(3000, '0.0.0.0', () => {...});
```

### Firewall
```bash
# Linux
sudo ufw allow 3000/tcp

# Windows/macOS: Voeg regel toe in firewall settings
```

### IP Adres vinden
```bash
# Linux/macOS
ifconfig | grep "inet "

# Windows
ipconfig
```

### Frontend configureren
In `App.jsx` vervang `localhost:3000` met `192.168.1.XXX:3000` (jouw server IP).

Build en serve:
```bash
npm run build
npm install -g serve
serve -s dist -p 5173
```

Nu bereikbaar op: `http://192.168.1.XXX:5173`
