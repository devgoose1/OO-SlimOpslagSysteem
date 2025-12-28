# Slim Opslagsysteem

Web-applicatie voor magazijnbeheer bij onderwijsinstellingen.

## Wat doet het?

### Onderdelen

- Zoeken op naam, artikelnummer of beschrijving
- Real-time voorraad (totaal, beschikbaar, gereserveerd)
- Locatie bekijken in magazijn
- Toevoegen, bewerken, verwijderen

### Reserveringen

- Onderdelen reserveren voor projecten
- Retourneren (volledig of gedeeltelijk)
- Automatische voorraadupdate

### Projecten

- Projecten aanmaken met categorieën
- Onderdelen per project beheren
- Project overzicht

### Gebruikers

- 4 rollen: student, teacher, expert, admin
- Role-based rechten
- Veilig met bcrypt password hashing

## Rollen & Rechten

| Rol | Wat kan je? |
| --- | ----------- |
| Student | Onderdelen bekijken, reserveren |
| Teacher | + Projecten beheren, gebruikers aanmaken (geen admins) |
| Expert | + Extra beheerrechten |
| Admin | + Test omgeving, volledige controle |

## Features

### Dashboard

- Statistieken (onderdelen, reserveringen, projecten)
- Lage voorraad waarschuwingen (≤10 items)

### UI

- Dark mode (auto-detectie)
- Responsive (desktop, tablet, mobiel)
- Real-time zoeken
- Server status indicator

### Admin Tools

- Test database (veilig testen zonder productiedata)
- Test data genereren
- Gebruikersbeheer

## Tech Stack

**Backend** - Node.js + Express.js + SQLite3  
**Frontend** - React 19 + Vite  
**Security** - bcrypt, SQL injection preventie

## Database

5 tabellen: users, onderdelen, projects, categories, reserveringen  
Details → [database.md](./database.md)

## Status

✅ Productie-ready  
✅ Stabiel  
✅ Schaalbaar tot ~10.000 onderdelen

**Nog niet**:

- Real-time multi-user updates
- Foto uploads
- Email notificaties

→ Zie [roadmap.md](./roadmap.md)

## Meer Info

[setup.md](./setup.md) - Installatie & troubleshooting  
[backend.md](./backend.md) - API endpoints  
[frontend.md](./frontend.md) - UI componenten  
[database.md](./database.md) - Database schema  
[roadmap.md](./roadmap.md) - Toekomstige features
