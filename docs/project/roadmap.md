# Feature Roadmap

Geplande verbeteringen voor het Slim Opslagsysteem.

## 🎯 IN DEVELOPMENT

### **Phase 1: Core Improvements** ⭐⭐⭐⭐⭐

**Status**: 🔨 IN PROGRESS (Email Notificaties, Excel Export, Kostentracking, App Notificaties, Analytics Dashboard)

---

### **Ordernummers/Transactie-tracking** ⭐⭐⭐⭐⭐

**Status**: 📋 Gepland (Na Phase 1)

Elk moment dat iets in onderdeel-aantallen verandert, wordt een **Ordernummer** gegenereerd. Dit zorgt voor volledige traceerbaarheid en betere organisatie.

**Format**: `ordn-TYPE-NUMMER` (bijv. `ordn-anv-001`)

**Types**:

- **anv** - Aanvraag (student vraagt spullen)
- **wto** - Wijziging Totaal (voorraadbeheer wijzigt hoeveelheid)
- **wao** - Wijziging Aangewezen (team krijgt/verliest onderdelen)
- **ret** - Retour (spullen teruggeven)
- **rvh** - Review/Handeling (controles, inventarisatie)

**Functionaliteit**:

- ✅ Automatische generatie bij elke wijziging
- ✅ Zoeken op ordernummer
- ✅ Detail-view met voor/na-status
- ✅ Actiegeschiedenis bijhouden
- ✅ Status-beheer (actief, verwerkt, gesloten)
- ✅ Zichtbaar voor docenten, ToA's, experts
- ✅ Integratie met reserveringen, voorraadbeheer, team-requests

**Database**:

- `ordernummers` tabel met alle transacties
- `ordernummer_counters` voor oplopende nummers per type
- `ordernummer_actions` voor uitgevoerde acties

**API Endpoints**:

- `GET /api/ordernummers` - Haal alle ordernummers op (met filters)
- `GET /api/ordernummers/:id` - Details met actiegeschiedenis
- `GET /api/ordernummers/zoeken/:ordernummer` - Zoek op code
- `POST /api/ordernummers/:id/actie` - Voer actie uit
- `PATCH /api/ordernummers/:id` - Update status/notities

**Frontend**:

- Nieuw tabblad "Ordernummers"
- Zoekfunctie naar ordernummer
- Filteropties (type, status, project, onderdeel)
- Detail-view met voor/na-vergelijking
- Actiehistorie-timeline

**Impact**: Maximaal! Zorgt voor:

- ✨ Volledige audit trail
- ✨ Betere traceerbaarheid
- ✨ Betere organisatie voor iedereen
- ✨ Eenvoudig handmatige controles (via fysiek apparaat of website)

**Tijd**: ~4 uur  
**Prioriteit**: 🔥 URGENT - Transformeert gehele workflow

---

## Tier 1: Quick Wins (1-2 uur)

### 1. Email Notificaties ⭐⭐⭐⭐⭐

**Elke maandag** automatisch mailtje naar docenten met:

- Lage voorraad waarschuwingen (≤10 items)
- Nieuwe reserveringen afgelopen week
- Onderdelen die te laat zijn

**Tech**: Nodemailer + node-cron  
**Tijd**: 2 uur

### 2. Export naar Excel ⭐⭐⭐⭐

Export onderdelen, reserveringen en stats naar `.xlsx`.

**Tech**: xlsx library  
**Tijd**: 1 uur

## Tier 3: Premium Features (4+ uur)

### 9. Kostentracking ⭐⭐⭐⭐

Prijs per onderdeel. Totale voorraad waarde. Kosten per project. Budget overzicht.

**Database**: `ALTER TABLE onderdelen ADD COLUMN unit_price REAL`  
**Tijd**: 3 uur

### 10. App Notifications ⭐⭐⭐⭐

Browser push notifications via Service Worker. Real-time updates.

**Tech**: PWA + Push API  
**Tijd**: 5 uur

### 11. Two-Factor Authentication ⭐⭐⭐⭐⭐

TOTP (Google Authenticator). Optioneel per gebruiker, verplicht voor admins.

**Tech**: speakeasy library  
**Database**: `totp_secret`, `totp_enabled` kolommen in users  
**Tijd**: 5 uur

### 12. Analytics Dashboard ⭐⭐⭐⭐⭐

Grafieken met Chart.js:

- Top 10 meest gereserveerde onderdelen
- Reserveringen per week (line chart)
- Verdeling per categorie (pie chart)
- Populaire projecten

**Tech**: Chart.js + React wrapper  
**Tijd**: 8 uur

---

### Kapote onderdelen systeem

## Totaal Overzicht

| Tier | Features | Tijd | Status |
| --- | --- | --- | --- |
| **In Progress** | Ordernummers | ~4 uur | 🔨 **IN DEVELOPMENT** |
| Tier 1 | 4 features | ~6.5 uur | 📋 Gepland |
| Tier 2 | 4 features | ~8 uur | 📋 Gepland |
| Tier 3 | 4 features | ~21 uur | 📋 Gepland |
| **Totaal** | **13 features** | **~39.5 uur** | - |

## Implementatie Volgorde

**Phase 1** (Week 1): Tier 1 → Snelle wins met grote impact  
**Phase 2** (Week 2-3): Tier 2 → Core verbeteringen  
**Phase 3** (Maand 2): Tier 3 → Premium features

## Impact Matrix

| Feature | Impact | Effort | Priority |
| --- | --- | --- | --- |
| Geavanceerde Filters | ⭐⭐⭐⭐⭐ | ⭐⭐ | 🔥 1 |
| Email Notificaties | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 2 |
| Foto's Onderdelen | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 3 |
| Audit Log | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 4 |
| Geplande Terugkeer | ⭐⭐⭐⭐ | ⭐⭐ | 🔥 5 |
| Analytics Dashboard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚡ 6 |
