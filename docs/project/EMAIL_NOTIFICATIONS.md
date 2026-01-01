# Email Notificaties

## 📧 Overzicht

Het Email Notificatie System stuurt automatische wekelijkse emails naar docenten met updates over:

- ⚠️ **Lage Voorraad Waarschuwingen** (≤10 items beschikbaar)
- 📋 **Nieuwe Reserveringen** van afgelopen week
- 🚨 **Te Late Items** (return deadline voorbij)

**Moment**: Elke **maandag om 09:15** (automatisch via cron job)

---

## 🔧 Setup & Configuratie

### Dependencies

Nodemailer is al geïnstalleerd:

```bash
npm install nodemailer
```

### Environment Variables

Voeg deze toe in `.env` of configureer ze in je server:

```text
MAIL_HOST=smtp.gmail.com          # SMTP server
MAIL_PORT=587                      # SMTP port
MAIL_SECURE=false                  # false voor port 587, true voor 465
MAIL_USER=your-email@gmail.com    # Je email
MAIL_PASSWORD=your-app-password   # App-wachtwoord (niet normaal wachtwoord!)
MAIL_FROM=noreply@slimopslagsysteem.local  # Van-adres
```

### Voor Development (Testing)

We gebruiken standaard `localhost:1025` (Mailtrap, Ethereal of nodemailer preview):

```javascript
// Automatische test email account (geen configuratie nodig):
const transporter = nodemailer.createTestAccount();
```

Om emails te testen in development:

```bash
node -e "const nodemailer = require('nodemailer'); nodemailer.createTestAccount().then(account => console.log(account));"
```

---

## 📡 API Endpoints

### 1. Trigger Notificaties (Manual)

**POST** `/api/admin/send-notifications`

Stuur emails onmiddellijk (niet wachten op maandag 09:15).

**Request:**

```json
{
  "userId": 1,
  "userRole": "admin"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notificaties verzonden",
  "summary": {
    "successful": 3,
    "failed": 0,
    "lowStock": [
      { "naam": "Arduino Uno", "aantal": 5, "categorie": "Microcontroller" }
    ],
    "newReservations": 2,
    "overdueItems": 1
  }
}
```

### 2. Notificatie Rapport (Preview)

**GET** `/api/admin/notifications-report?userRole=admin`

Bekijk welke data zou worden verstuurd (preview voor volgende notificatie).

**Response:**

```json
{
  "lowStock": [
    { "id": 1, "naam": "Arduino Uno", "categorie": "Microcontroller", "aantal": 5, "min_hoeveelheid": 10 }
  ],
  "newReservations": [
    { "onderdeel_naam": "Raspberry Pi", "aantal": 2, "gereserveerd_door": "Pietje Puk", "aanvraag_datum": "2025-01-13" }
  ],
  "overdueItems": [
    { "onderdeel_naam": "Arduino", "aantal": 1, "dagen_verlopen": 3, "gereserveerd_door": "Jan Jansen" }
  ],
  "teachers": [
    { "id": 2, "username": "jjansen", "email": "j.jansen@school.nl" }
  ],
  "summary": {
    "lowStockCount": 5,
    "newReservationsCount": 12,
    "overdueItemsCount": 3,
    "teacherCount": 8
  }
}
```

---

## 🕐 Scheduling

**Automatisch**: Elke **maandag om 09:15**

```javascript
cron.schedule('15 9 * * 1', async () => {
    console.log('[Email] Weekly notifications starting...');
    await sendWeeklyNotifications(db);
});
```

**Cron Format**: `minute hour dayOfMonth month dayOfWeek`

- `15` = minuut 15
- `9` = uur 09:00
- `*` = elke dag van maand
- `*` = elke maand
- `1` = maandag

---

## 📧 Email Template

Iedere email bevat:

### Header

```text
📊 Slim Opslagsysteem - Wekelijkse Update
```

### Secties (indien van toepassing)

1. **⚠️ Lage Voorraad** (≤10 items)
   - Laat onderdelen zien met naam, categorie en hudig aantal

2. **📋 Nieuwe Reserveringen** (afgelopen 7 dagen)
   - Toont wie wat gereserveerd heeft en wanneer

3. **🚨 Te Late Items** (overdue)
   - Onderdelen die niet op tijd zijn teruggebracht
   - Hoeveel dagen verlopen

### Footer

Automatisch gegenereerde email, meld je aan voor meer info.

---

## 🔍 Debuggen

### Logs Controleren

De server print logs bij elke run:

```text
📧 Starting weekly email notifications...
📊 Data verzameld: 5 lage voorraad, 12 nieuwe reserveringen, 3 verlopen items
👥 Verzenden naar 8 docent(en)
✅ Email verzonden naar j.jansen@school.nl: 250 OK
✅ Email notificaties voltooid: 8 verzonden, 0 mislukt
```

### Test Email Versturen

```bash
curl -X POST http://localhost:3000/api/admin/send-notifications \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "userRole": "admin"}'
```

### Preview Genereren

```bash
curl http://localhost:3000/api/admin/notifications-report?userRole=admin
```

---

## 📝 Database Vereisten

De volgende tabellen moeten bestaan:

- `onderdelen` - Met kolommen: `id`, `naam`, `categorie`, `aantal`, `min_hoeveelheid`
- `reserveringen` - Met kolommen: `id`, `onderdeel_id`, `gereserveerd_door`, `aantal`, `status`, `aanvraag_datum`, `retour_datum`
- `users` - Met kolommen: `id`, `username`, `email`, `role`

---

## 🚀 Productie Deploy

### Step 1: Configure SMTP

```bash
# Voor Gmail (aanbevolen):
# 1. Enable 2FA in je Google account
# 2. Generate "App Password" 
# 3. Set environment variables:
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USER=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
export MAIL_FROM=noreply@yourdomain.com
```

### Step 2: Test

```bash
curl -X GET http://localhost:3000/api/admin/notifications-report?userRole=admin
```

### Step 3: Deploy

```bash
npm start
```

---

## 📊 Impact

- ✅ Docenten krijgen automatisch updates
- ✅ Minder handmatig checken nodig
- ✅ Snellere reactie op lage voorraad
- ✅ Reminder voor te late items
- ✅ Transparantie in reserveringsactiviteiten

---

## 🔄 Toekomstige Uitbreidingen

- [ ] Email frequency aanpassen per gebruiker
- [ ] Selectieve topics (lage voorraad, reserveringen, etc)
- [ ] SMS notificaties
- [ ] Instant notifications (niet alleen wekelijks)
- [ ] Email templates customizen
