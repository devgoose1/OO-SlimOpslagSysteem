# 🔧 Backup Systeem Upgrade - Volledige Implementatie

## ✅ Wat is Fixed

Je backup systeem is nu **volledig** gerenoveerd met:

### 1. **Volledige Database Versioning** 📊

- Nieuwe `schema_version` tabel trackking alle schema wijzigingen
- Automatische versie-migratie wanneer nieuwe features worden toegevoegd
- Huidige schema versie: **v2**

**Code:**

```javascript
// database.js
const CURRENT_SCHEMA_VERSION = 2;

// Schema version tracking table wordt automatisch aangemaakt
database.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        migration_notes TEXT
    )
`);
```

### 2. **Backup Metadata Systeem** 📝

- Elk backup krijgt een `.json` metadata bestand met:
  - Schema versie van backup moment
  - Timestamp
  - Record count per tabel
  - Compatibiliteit info

**Structuur:**

```markdown
database/
├── backups/
│   ├── opslag-20250101-100000.db
│   ├── opslag-20250102-020000.db
│   └── .metadata/
│       ├── opslag-20250101-100000.json
│       └── opslag-20250102-020000.json
```

### 3. **Alle Tabellen Nu Geback-upt** ✨

**Previously ontbrekend, nu volledige merge support:**

✅ `categories`
✅ `onderdelen`
✅ `users`
✅ `projects`
✅ `reservations` (incl. alle nieuwe kolommen!)
✅ `reservation_notes` - **NIEUW**
✅ `favorites` - **NIEUW**
✅ `purchase_requests`
✅ `team_advice`
✅ `audit_log`
✅ `ordernummers` - **NIEUW**
✅ `ordernummer_counters` - **NIEUW**
✅ `ordernummer_actions` - **NIEUW**

### 4. **Auto-Migration System** 🔄

Backup merge detecteert automatically:

- ✅ Schema verschillen tussen versies
- ✅ Ontbrekende kolommen (oude `artikelnummer` → nieuwe `sku`)
- ✅ Nieuwe kolommen van reservations (counter_*, request_note, etc.)
- ✅ Foreign key mappings tussen alle tabellen

**Hoe het werkt:**

```javascript
// backupManager.js - Automatische kolom mapping
const sku = o.sku || o.artikelnummer || null; // Fallback naar oude kolom

// Geavanceerde INSERT met alle huidige schema kolommen
const values = [
    newOnderdeelId, newProjectId, qty, r.status || 'active',
    // ... veel meer kolommen ...
    r.counter_type || null, r.counter_qty || null, // Nieuw in v2
    r.request_note || null  // Nieuw in v2
];
```

### 5. **Geavanceerde Merge Logica** 🔗

- **ID Remapping**: Oude IDs in backup worden gemapt naar nieuwe IDs
- **Duplicate Prevention**: Controleert of data al bestaat
- **Foreign Key Handling**: Bewaart relaties tussen tabellen
- **Graceful Degradation**: Skips tabellen die niet bestaan (legacy backups)

### 6. **Nieuwe API Endpoints** 🌐

**Backup maken:**

```bash
POST /api/backup
Response: { 
  message, 
  filename, 
  metadata (includes schema version, record counts),
  downloadUrl 
}
```

**Backup herstellen:**

```bash
POST /api/backup/merge
Body: multipart/form-data with file
```

**Alle backups oplijsten (MET metadata):**

```bash
GET /api/backup/list
Response: [
  {
    name, 
    date, 
    size,
    metadata: { schemaVersion, timestamp, tables }
  }
]
```

**Backup metadata checken:**

```bash
GET /api/backup/metadata/:filename
Response: {
  filename,
  metadata,
  currentSchemaVersion,
  compatible: boolean
}
```

**Status check:**

```bash
GET /api/backup/status
Response: {
  currentSchemaVersion,
  backupManagerActive: true,
  features: {
    versioning: true,
    metadata: true,
    autoMigration: true,
    fullTableSupport: true
  }
}
```

### 7. **Automatische Scheduled Backups** ⏰

Elke dag om **2 AM** een automatische backup:

```javascript
// server.js
cron.schedule('0 2 * * *', () => {
    console.log('[Backup Scheduler] Running daily backup at 2 AM...');
    backupManager.createBackup(dbPath, (err, result) => {
        // ...
    });
});
```

---

## 📁 Bestanden die zijn Aangemaakt/Gewijzigd

### Nieuwe Files

1. **[backupManager.js](backupManager.js)** - Volledige backup management module (300+ lines)
   - BackupManager class
   - Metadata handling
   - Schema migration
   - Merge logic met ID remapping

### Gewijzigde Files

1. **database.js**
   - Import CURRENT_SCHEMA_VERSION
   - Schema version tracking tabel
   - Export CURRENT_SCHEMA_VERSION

2. **server.js**
   - Import BackupManager
   - Import CURRENT_SCHEMA_VERSION
   - Gereplace oude backup functies met BackupManager
   - 6 nieuwe API endpoints
   - Auto backup scheduling

---

## 🎯 Wat Gebeurt Nu Bij Een Restore

### Scenario: Je hebt een backup van v1.0, server is nu v2.0

1. **Upload backup** → `/api/backup/merge`
2. **BackupManager leest metadata** → Detecteert v1 schema
3. **ID Mapping**:
   - Alle categories/onderdelen/users/projects van OLD naar NEW
4. **Auto-Migration**:
   - Oude kolommen → Nieuwe kolommen
   - Ontbrekende waarden → NULL/defaults
5. **Alle tabellen**:
   - Reservations + alle 23 nieuwe kolommen
   - Favorites (als die bestaan)
   - Ordernummers (als die bestaan)
   - Etc.
6. **Foreign Keys**: Automatisch bijgewerkt naar nieuwe IDs
7. **Validatie**: Duplicaten genegeerd
8. **Opschoning**: Temp file verwijderd

---

## 🧪 Testing Checklist

Wanneer je server start:

```markdown
Server staat aan op http://localhost:3000
Database schema version: 2
Backup manager active with versioning support
```

Test endpoints:

```bash
# 1. Check status
curl http://localhost:3000/api/backup/status

# 2. Create backup
curl -X POST http://localhost:3000/api/backup

# 3. List all backups with metadata
curl http://localhost:3000/api/backup/list

# 4. Check specific backup metadata
curl "http://localhost:3000/api/backup/metadata/opslag-20250128-100000.db"
```

---

## 💾 Backward Compatibility

✅ **Oude backups**: Worden automatisch gemigreerd  
✅ **Huidige database**: Niets veranderd, alleen metadata toevoegd  
✅ **Legacy support**: Detecteert missing tables en skipst gracefully  
✅ **Column compatibility**: Ondersteunt `artikelnummer`, `quantity`, `aantal`, etc.

---

## 🔐 Beveiliging

- Path traversal protection op `/api/backup/download/:filename`
- Temp files worden opgeruimd na merge
- Database locking voorkomen met proper close()
- SQLite transactions voor data integriteit

---

## 📊 Wat Je Nu Hebt

| Feature | Status |
| --------- | -------- |
| Backup versioning | ✅ Compleet |
| Metadata tracking | ✅ Compleet |
| Alle 13 tabellen | ✅ Geback-upt |
| Auto-migration | ✅ Compleet |
| Schema detection | ✅ Compleet |
| ID remapping | ✅ Compleet |
| Scheduled backups | ✅ Compleet |
| API endpoints | ✅ 6 endpoints |
| Error handling | ✅ Robust |

---

## 🚀 Volgende Stappen (Optioneel)

Mogelijke toekomstige verbeteringen:

- Backup retention policy (max X backup bestanden)
- Differential backups (alleen wijzigingen)
- Backup compression (.gz)
- Email notifications bij backup fout
- Web UI voor backup management
- Restore-preview (kijken wat gaat er gebeuren)
