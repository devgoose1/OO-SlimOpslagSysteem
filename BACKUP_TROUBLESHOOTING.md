# 🔧 Backup Systeem - Troubleshooting Guide

## 🚀 Quick Start

### Eerst de server starten

```bash
cd project/backend
npm install  # Als je backupManager nog niet geïnstalleerd is
npx nodemon server.js
```

Je zou moeten zien:

```text
Server staat aan op http://localhost:3000
Database schema version: 2
Backup manager active with versioning support
```

---

## ✅ Verificatie

### Test 1: Is backup systeem actief?

```bash
curl http://localhost:3000/api/backup/status
```

**Verwacht:**

```json
{
  "currentSchemaVersion": 2,
  "backupManagerActive": true,
  "features": {
    "versioning": true,
    "metadata": true,
    "autoMigration": true,
    "fullTableSupport": true
  }
}
```

### Test 2: Kan je een backup maken?

```bash
curl -X POST http://localhost:3000/api/backup
```

**Verwacht:** Backup bestand + metadata

### Test 3: Run test script

```bash
cd project/backend
node test_backup_system.js
```

**Output moet tonen:**

- BackupManager initialized ✓
- Database connection ✓
- Schema version tracking ✓
- Alle tabel checks

---

## 🐛 Veelvoorkomende Problemen

### Problem 1: "Cannot find module 'backupManager'"

**Oorzaak:** backupManager.js niet in backend folder

**Oplossing:**

```bash
# Zorg dat deze bestanden bestaan:
ls project/backend/backupManager.js
ls project/backend/database.js
ls project/backend/server.js
```

---

### Problem 2: "ENOENT: no such file or directory, open 'database/backups'"

**Oorzaak:** Backups directory bestaat niet

**Oplossing:**

```bash
cd project/backend
mkdir -p database/backups
mkdir -p database/backups/.metadata
```

BackupManager zal dit automatisch aanmaken, maar je kan het ook handmatig doen.

---

### Problem 3: "TypeError: Cannot read property 'listBackups' of undefined"

**Oorzaak:** BackupManager niet geïnstantieerd

**Oplossing:** Check dat server.js dit heeft:

```javascript
const BackupManager = require('./backupManager');
const backupManager = new BackupManager(__dirname);
```

---

### Problem 4: Database lock / "database is locked"

**Oorzaak:** Meerdere connections naar database

**Oplossing:**

```javascript
// In backupManager.js - zorg dat je db.close() roept
backupDb.close((err) => {
    if (err) console.error(err);
});
```

---

### Problem 5: Merge faalt met "no such table: X"

**Oorzaak:** Backup is van zeer oude versie zonder die tabel

**Verwacht gedrag:**

- BackupManager skipped die tabel (graceful degradation)
- Zie console log: "Table X not found, skipping"

**Check logs:**

```bash
# Zien welke tabellen geskipped worden
# In server output zoeken naar [Backup Merge]
```

---

### Problem 6: Metadata niet opgeslagen

**Oorzaak:** `.metadata` directory niet writable

**Oplossing:**

```bash
# Check permissions
ls -la project/backend/database/backups/
# Fix if needed
chmod 755 project/backend/database/backups/
```

Dit is een **warning**, niet fatal - backup werkt nog steeds.

---

## 📊 Debugging

### Log verbiage monitoring

```bash
# Zie alle backup logs in real-time
npx nodemon server.js | grep -i backup
```

### Check database versioning

```bash
sqlite3 project/backend/database/opslag.db
SELECT * FROM schema_version;
SELECT * FROM ordernummer_counters;
.quit
```

### Inspect backup metadata

```bash
# Zie wat in metadata bestand staat
cat "project/backend/database/backups/.metadata/opslag-20250128-143022.json" | jq
```

---

## 🔍 Diagnostic Script

Maak dit script voor volledig diagnostics:

```javascript
// diagnose.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'opslag.db');
const backupDir = path.join(__dirname, 'database', 'backups');

console.log('📋 BACKUP SYSTEM DIAGNOSTICS\n');

// Check 1: File structure
console.log('1. File Structure:');
console.log('   Database exists:', fs.existsSync(dbPath));
console.log('   Backup dir exists:', fs.existsSync(backupDir));
console.log('   Metadata dir exists:', fs.existsSync(path.join(backupDir, '.metadata')));

// Check 2: Database tables
console.log('\n2. Database Tables:');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
const tables = [
    'schema_version', 'categories', 'onderdelen', 'users', 'projects',
    'reservations', 'ordernummers', 'favorites'
];

let checked = 0;
tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
        const status = err ? '✗' : `✓ (${row.count} records)`;
        console.log(`   ${table.padEnd(25)} ${status}`);
        
        checked++;
        if (checked === tables.length) {
            db.close();
            
            // Check 3: Backup files
            console.log('\n3. Available Backups:');
            if (fs.existsSync(backupDir)) {
                const files = fs.readdirSync(backupDir)
                    .filter(f => f.endsWith('.db'))
                    .sort()
                    .reverse();
                
                if (files.length === 0) {
                    console.log('   (None yet - run POST /api/backup)');
                } else {
                    files.slice(0, 5).forEach(f => {
                        const size = fs.statSync(path.join(backupDir, f)).size;
                        console.log(`   ${f} (${(size / 1024 / 1024).toFixed(2)}MB)`);
                    });
                }
            }
            
            console.log('\n✅ Diagnostics complete');
        }
    });
});
```

**Run het:**

```bash
node diagnose.js
```

---

## 🔄 Restore Troubleshooting

### De restore process stappen-voor-stappen

```bash
# 1. Backup beschikbaar?
curl http://localhost:3000/api/backup/list | jq '.files[0]'

# 2. Backup metadata controleren
curl "http://localhost:3000/api/backup/metadata/opslag-20250127-020000.db" | jq

# 3. Download backup
curl -O http://localhost:3000/api/backup/download/opslag-20250127-020000.db

# 4. Restore (via API)
curl -X POST -F "backupFile=@opslag-20250127-020000.db" \
  http://localhost:3000/api/backup/merge

# 5. Check result
curl http://localhost:3000/api/backup/list
```

---

## 📈 Performance Tips

### Voor grote databases (>1GB)

```javascript
// BackupManager kan traag zijn voor grote DBs
// Opties:
// 1. Run backup in off-hours (al ingesteld op 2 AM)
// 2. Monitor server memory during backup
// 3. Consider manual backups op rustige momenten
```

### Monitor backup status

```bash
# Check server logs voor:
[Backup Scheduler] Running daily backup at 2 AM...
[Backup Scheduler] Daily backup created: ...

# Zag je dit niet? Check dat cron gestart is
# (cron werkt automatic in Node, dus moet dit werken)
```

---

## 🚨 Critical Issues

### Backup is groter dan schijfruimte

```bash
# Check beschikbare ruimte
df -h /

# Of zelf backup size vorhalen:
ls -lh database/backups/
```

### Merging duurt zeer lang

- Dat is normaal voor grote databases
- Console zal stap-voor-stap loggen
- Wacht totdat je "Merge completed successfully" ziet

### Data verlies na restore

- Backups mergen altijd IN, ze overschrijven niet
- Oude data blijft behouden
- Enkel duplicaten worden geskipped

---

## 📞 Support Checklist

Als iets niet werkt:

- [ ] Server staat aan met `npx nodemon server.js`
- [ ] `/api/backup/status` geeft `backupManagerActive: true`
- [ ] Directory `database/backups` bestaat
- [ ] Geen write-permission errors in server logs
- [ ] Database bestand is niet corrupted
- [ ] Voldoende schijfruimte beschikbaar
- [ ] Port 3000 niet in use door ander proces

---

## 📝 Log Filtering

Handig grep commands:

```bash
# Alle backup logs
npx nodemon server.js 2>&1 | grep -i backup

# Merge logs
npx nodemon server.js 2>&1 | grep "Backup Merge"

# Errors
npx nodemon server.js 2>&1 | grep -E "(Error|✗|ERR)"

# Full verbose
npx nodemon server.js 2>&1 | grep -E "(Backup|Schema|version)"
```

---

## ✨ Best Practices

### Regelmatige backups

```javascript
// Al ingebouwd: dagelijks om 2 AM
// Extra manual backup:
POST /api/backup  // Elke dag handmatig
```

### Test your restores

```bash
# Bij development:
1. Maak backup van huidige state
2. Test restore in ander directory
3. Zorg dat alle data intact is
```

### Monitor de backup size

```bash
# Zie groei
watch -n 60 'du -sh project/backend/database/backups/'
```

### Cleanup oude backups (optioneel)

```bash
# Remove backups ouder dan 30 dagen
find project/backend/database/backups -name "*.db" -mtime +30 -delete
```

---

## 🎯 Checklist voor Productie

- [ ] Automatische backup draait (`cron.schedule` in server.js)
- [ ] Backups maken zich opslagen in `database/backups/`
- [ ] Metadata files worden aangemaakt in `.metadata/`
- [ ] Test één keer een restore procedure
- [ ] Monitor schijfruimte regelmatig
- [ ] Zorg dat backups ook ergens anders opgeslagen worden (externe drive, cloud)
- [ ] Lees de logs regelmatig op errors

---

## 📞 Need Help?

Check deze files:

- [BACKUP_UPGRADE_SUMMARY.md](BACKUP_UPGRADE_SUMMARY.md) - Wat is gechange
- [BACKUP_API_REFERENCE.md](BACKUP_API_REFERENCE.md) - API docs
- [backupManager.js](project/backend/backupManager.js) - De implementation
