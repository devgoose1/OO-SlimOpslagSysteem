# Feature Roadmap

Geplande verbeteringen voor het Slim Opslagsysteem.

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

### 4. Favorieten ⭐⭐⭐⭐
Markeer veelgebruikte onderdelen met ster icoon. Per gebruiker opgeslagen.

**Database**: Nieuwe tabel `favorites` (user_id, onderdeel_id)  
**Tijd**: 1.5 uur

## Tier 2: Medium Impact (2-4 uur)

### 6. Opmerkingen/Notes ⭐⭐⭐⭐
Notitieveld bij reserveringen ("Voor demo op 20 dec").

**Database**: `ALTER TABLE reserveringen ADD COLUMN notes TEXT`  
**Tijd**: 1.5 uur

### 7. Geplande Terugkeer ⭐⭐⭐⭐
Return datum bij reserveren. "Te laat" indicator. Notificaties 1 dag voor deadline.

**Database**: `ALTER TABLE reserveringen ADD COLUMN return_date DATE`  
**Tijd**: 1.5 uur

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
|------|----------|------|--------|
| Tier 1 | 4 features | ~6.5 uur | 📋 Gepland |
| Tier 2 | 4 features | ~8 uur | 📋 Gepland |
| Tier 3 | 4 features | ~21 uur | 📋 Gepland |
| **Totaal** | **12 features** | **~35.5 uur** | - |

## Implementatie Volgorde

**Phase 1** (Week 1): Tier 1 → Snelle wins met grote impact  
**Phase 2** (Week 2-3): Tier 2 → Core verbeteringen  
**Phase 3** (Maand 2): Tier 3 → Premium features

## Impact Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Geavanceerde Filters | ⭐⭐⭐⭐⭐ | ⭐⭐ | 🔥 1 |
| Email Notificaties | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 2 |
| Foto's Onderdelen | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 3 |
| Audit Log | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔥 4 |
| Geplande Terugkeer | ⭐⭐⭐⭐ | ⭐⭐ | 🔥 5 |
| Analytics Dashboard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚡ 6 |
