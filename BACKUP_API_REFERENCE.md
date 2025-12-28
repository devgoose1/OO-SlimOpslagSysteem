# 🔌 Backup API Referentie

## Endpoints Overzicht

### 1. Create Backup (On-Demand)

**POST** `/api/backup`

Maakt een volledige backup met metadata.

#### Parameters

- `?test` (optional) - Backup test database in plaats van production

#### Response (Create Backup)

```json
{
  "message": "Backup created successfully",
  "filename": "opslag-20250128-143022.db",
  "metadata": {
    "version": 1,
    "schemaVersion": 2,
    "timestamp": "2025-01-28T14:30:22.123Z",
    "backupName": "opslag-20250128-143022",
    "tables": {
      "categories": { "recordCount": 5 },
      "onderdelen": { "recordCount": 152 },
      "users": { "recordCount": 8 },
      "projects": { "recordCount": 12 },
      "reservations": { "recordCount": 487 },
      "favorites": { "recordCount": 42 },
      "ordernummers": { "recordCount": 1203 },
      "purchase_requests": { "recordCount": 28 }
    }
  },
  "downloadUrl": "/api/backup/download/opslag-20250128-143022.db"
}
```

#### cURL Example (Create Backup)

```bash
curl -X POST http://localhost:3000/api/backup
```

---

### 2. List All Backups

**GET** `/api/backup/list`

Toont alle beschikbare backups met metadata.

#### Response (List Backups)

```json
{
  "files": [
    {
      "name": "opslag-20250128-143022.db",
      "date": "2025-01-28T14:30:22.123Z",
      "size": 2097152,
      "backupName": "opslag-20250128-143022",
      "metadata": {
        "version": 1,
        "schemaVersion": 2,
        "timestamp": "2025-01-28T14:30:22.123Z",
        "tables": {
          "categories": { "recordCount": 5 },
          "onderdelen": { "recordCount": 152 }
        }
      }
    },
    {
      "name": "opslag-20250127-020000.db",
      "date": "2025-01-27T02:00:00.000Z",
      "size": 2097152,
      "backupName": "opslag-20250127-020000",
      "metadata": {
        "version": 1,
        "schemaVersion": 1,
        "timestamp": "2025-01-27T02:00:00.000Z"
      }
    }
  ],
  "currentSchemaVersion": 2
}
```

#### cURL Example (List Backups)

```bash
curl http://localhost:3000/api/backup/list | jq
```

---

### 3. Get Backup Metadata

**GET** `/api/backup/metadata/:filename`

Krijg details van een specifieke backup.

#### Parameters (Get Metadata)

- `:filename` - Backup bestandsnaam (bijv. `opslag-20250128-143022.db`)

#### Response (Get Metadata)

```json
{
  "filename": "opslag-20250128-143022.db",
  "metadata": {
    "version": 1,
    "schemaVersion": 2,
    "timestamp": "2025-01-28T14:30:22.123Z",
    "backupName": "opslag-20250128-143022",
    "tables": {
      "categories": { "recordCount": 5 },
      "onderdelen": { "recordCount": 152 },
      "users": { "recordCount": 8 },
      "projects": { "recordCount": 12 },
      "reservations": { "recordCount": 487 },
      "reservation_notes": { "recordCount": 156 },
      "favorites": { "recordCount": 42 },
      "purchase_requests": { "recordCount": 28 },
      "team_advice": { "recordCount": 18 },
      "audit_log": { "recordCount": 2341 },
      "ordernummers": { "recordCount": 1203 },
      "ordernummer_counters": { "recordCount": 5 },
      "ordernummer_actions": { "recordCount": 3102 }
    }
  },
  "currentSchemaVersion": 2,
  "compatible": true
}
```

#### cURL Example (Get Metadata)

```bash
curl "http://localhost:3000/api/backup/metadata/opslag-20250128-143022.db" | jq
```

---

### 4. Download Backup File

**GET** `/api/backup/download/:filename`

Download een backup bestand.

#### Parameters (Download)

- `:filename` - Backup bestandsnaam

#### Response (Download)

Binary file download

#### cURL Example (Download)

```bash
curl -O http://localhost:3000/api/backup/download/opslag-20250128-143022.db
```

#### JavaScript Example (Download)

```javascript
const downloadBackup = async (filename) => {
    const response = await fetch(`/api/backup/download/${filename}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

downloadBackup('opslag-20250128-143022.db');
```

---

### 5. Restore Backup (Merge)

**POST** `/api/backup/merge`

Upload en restore een oude backup naar huidige database. **Voorzichtig:** Dit merged data in je huidige database!

#### Parameters (Restore)

- `backupFile` (multipart/form-data) - Het backup .db bestand

#### Response (Restore)

```json
{
  "message": "Backup merge completed successfully",
  "details": "Alle tabellen gemigreerd met schema-compatibiliteit"
}
```

#### cURL Example (Restore)

```bash
curl -X POST \
  -F "backupFile=@opslag-20250127-020000.db" \
  http://localhost:3000/api/backup/merge
```

#### JavaScript Example

```javascript
const restoreBackup = async (file) => {
    const formData = new FormData();
    formData.append('backupFile', file);
    
    const response = await fetch('/api/backup/merge', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    console.log(result);
};

// Usage
document.getElementById('backupFileInput').addEventListener('change', (e) => {
    restoreBackup(e.target.files[0]);
});
```

---

### 6. System Status

**GET** `/api/backup/status`

Kontroleert backup systeem status.

#### Response (Status)

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

#### cURL Example (Status)

```bash
curl http://localhost:3000/api/backup/status | jq
```

---

## 🎯 Praktische Voorbeelden

### Create & Download Backup

```javascript
// Step 1: Create backup
const createResponse = await fetch('/api/backup', { method: 'POST' });
const backup = await createResponse.json();

// Step 2: Download it
window.location = backup.downloadUrl;

// Or get all backups first
const list = await fetch('/api/backup/list').then(r => r.json());
console.log(`${list.files.length} backups available`);
```

### Check Backup Compatibility

```javascript
const checkBackup = async (filename) => {
    const response = await fetch(`/api/backup/metadata/${filename}`);
    const data = await response.json();
    
    if (data.compatible) {
        console.log(`✅ Backup is compatible! (Schema v${data.metadata.schemaVersion})`);
        console.log(`Tables: ${Object.keys(data.metadata.tables).join(', ')}`);
    } else {
        console.log('⚠ Warning: Backup may have compatibility issues');
    }
};
```

### Restore Process

```javascript
const restoreOldBackup = async (filename) => {
    // 1. Get the file
    const fileResponse = await fetch(`/api/backup/download/${filename}`);
    const file = await fileResponse.blob();
    
    // 2. Confirm with user
    const confirmed = confirm(
        `Restore ${filename}? This will merge data into your current database.`
    );
    if (!confirmed) return;
    
    // 3. Perform merge
    const formData = new FormData();
    formData.append('backupFile', file);
    const mergeResponse = await fetch('/api/backup/merge', {
        method: 'POST',
        body: formData
    });
    
    const result = await mergeResponse.json();
    console.log(result.message);
};
```

---

## 📊 Backup-to-Database Schema Versie Compatibiliteit

| Backup Schema | Current Schema | Auto-Migration | Result |
| --- | --- | --- | --- |
| v1 | v1 | ✓ | Direct merge |
| v1 | v2 | ✓ | Automatic upgrade with new columns |
| v2 | v2 | ✓ | Direct merge |
| v2 | v1 | ⚠ | May lose v2-specific data |

---

## 🔒 Error Handling

All endpoints return proper HTTP status codes:

```javascript
const handleBackupError = async (url, method = 'GET') => {
    try {
        const response = await fetch(url, { method });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error);
        }
        
        return await response.json();
    } catch (err) {
        console.error('Backup operation failed:', err.message);
    }
};
```

---

## 🔄 Automatic Scheduled Backups

Backups worden automatisch gemaakt:

- **Schedule**: Elke dag om **2:00 AM** (UTC)
- **Locatie**: `database/backups/opslag-YYYYMMDD-HHMMSS.db`
- **Metadata**: `database/backups/.metadata/opslag-YYYYMMDD-HHMMSS.json`

Zie server logs:

```text
[Backup Scheduler] Running daily backup at 2 AM...
[Backup Scheduler] Daily backup created: /path/to/opslag-20250128-020000.db
```

---

## 📈 Gegevens Tracking

Elk backup tracked:

- **Schema versie**: Voor compatibiliteit
- **Timestamp**: Wanneer gemaakt
- **Record counts**: Per tabel
- **Table names**: Welke tabellen bevat

Nuttig voor:

- Voordat je restore - check hoeveel data je hebt
- Audit trail - wanneer backups gemaakt werden
- Migration planning - schema versies over tijd
