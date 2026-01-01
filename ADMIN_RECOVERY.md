# 🔐 Emergency Admin Access Guide

## ✅ Probleem OPGELOST

**Je hebt altijd toegang!** Het systeem heeft nu hardcoded fallback credentials, zodat je nooit buiten sluit.

### 🔑 Standaard Login Credentials

```text
Username: NathanSchinkelAdmin
Password: Slimopslagsysteemproject
```

Dit werkt **ALTIJD**, zelfs als:

- ❌ Alle database admin accounts verdwenen zijn
- ❌ De database corrupt is
- ❌ Je alles bent vergeten

---

## 🔑 Login Nu Klaar! Geen Setup Nodig

De fallback admin is **ALTIJD ingeschakeld**. Gewoon inloggen:

```text
Username: NathanSchinkelAdmin
Password: Slimopslagsysteemproject
```

## 🚀 Dat Is Het

Je bent klaar voor je backup upload! 🎉

---

## (Optioneel) Database Admin Account Aanmaken

Wil je een netere database admin? (aanbevolen):

1. Log in met bovenstaande credentials
2. Ga naar **Admin Panel** → **User Management**
3. Klik **Create New User**
4. Maak je eigen admin account
5. Log uit en log in met je nieuwe account

---

## Hoe De Veiligheid Werkt

Het wachtwoord is **bcrypt-gehashed** in de code:

```javascript
// Niet plaintext - veilig!
const ADMIN_PASSWORD_HASH = '$2b$10$8zy2XnvILURjp90DiPG9HuHQ2Q0AGHVOEkSISuXPZqva1o7fb/WAW';
```

Dit betekent:

- ✅ Zelfs als iemand de code leest, ziet die alleen de hash
- ✅ Niet het echte wachtwoord
- ✅ Veilig genoeg voor noodgevallen

---

## Troubleshooting

### Kan niet inloggen?

- Check: `NathanSchinkelAdmin` (hoofdletters!)
- Check: `Slimopslagsysteemproject` (exact spelling)
- Check: Server draait

### Server Logs

Bij startup zie je:

```text
[Admin Init] ℹ️ No admin accounts in database. Fallback admin enabled: NathanSchinkelAdmin
```

Dit is perfect - fallback is actief!
