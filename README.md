# 📦 Slim Opslagsysteem

Professioneel magazijnbeheer systeem voor onderwijsinstellingen.

## Over het Project

Full-stack web-applicatie die docenten en studenten helpt bij magazijnbeheer. Real-time inzicht in beschikbare onderdelen, reserveringen en projecten.

### Features

- 🔍 Snel zoeken (naam, artikelnummer, beschrijving)
- 📊 Real-time voorraad tracking  
- �� Project management met categorieën
- 👥 4 gebruikersrollen (student, teacher, expert, admin)
- 📱 Responsive + dark mode
- 🔐 Veilig (bcrypt, SQL injection preventie)
- 🧪 Test omgeving voor admins

## Quick Start

**Vereisten**: Node.js v18+ en npm v9+

```bash
# Backend
cd project/backend
npm install
node server.js

# Frontend (nieuwe terminal)
cd project/frontend
npm install
npm run dev
```

**Login**: http://localhost:5173  
Username: `admin` | Password: `admin123` (wijzig direct!)

## Documentatie

**Gebruikers**:
- [Project Overzicht](./docs/project/README.md)
- [Setup Gids](./docs/project/setup.md)

**Ontwikkelaars**:
- [Backend API](./docs/project/backend.md)
- [Frontend](./docs/project/frontend.md)
- [Database](./docs/project/database.md)
- [Roadmap](./docs/project/roadmap.md)

**Research**:
- [Product Onderzoek](./docs/onderzoek/producten/)
- [Services Onderzoek](./docs/onderzoek/Services/)

## Tech Stack

**Backend**: Node.js + Express.js + SQLite  
**Frontend**: React 19 + Vite  

## Roadmap Highlights

**Tier 1** (6.5 uur):
- 📧 Email notificaties (elke maandag)
- 📊 Excel export
- 🔍 Geavanceerde filters
- ⭐ Favorieten

**Tier 2** (8 uur):
- 📸 Foto's voor onderdelen
- 📝 Opmerkingen/notities
- 📅 Geplande terugkeer
- 🏆 Audit log

**Tier 3** (21 uur):
- 💰 Kosten tracking
- 📱 App notifications
- 🔐 Two-factor authentication
- 📈 Analytics dashboard

**Totaal: 12 features, ~35.5 uur**

Zie [roadmap.md](./docs/project/roadmap.md)

## Team

Ontwikkeld door **devgoose**

**GitHub**: [@devgoose1](https://github.com/devgoose1)
