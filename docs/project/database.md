# Database Schema

SQLite database in `project/backend/database/`.

## Tabellen

### users

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,  -- bcrypt hashed
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'expert', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### onderdelen

```sql
CREATE TABLE onderdelen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artikelnummer TEXT UNIQUE NOT NULL,
    description TEXT,
    location TEXT,
    total_quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Computed fields** (niet in tabel):

- `reserved_quantity` = SUM(reserveringen.aantal)
- `available_quantity` = total_quantity - reserved_quantity

### categories

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);
```

### projects

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### reserveringen

```sql
CREATE TABLE reserveringen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    onderdeel_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    aantal INTEGER NOT NULL CHECK(aantal > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (onderdeel_id) REFERENCES onderdelen(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## Relaties

users (standalone)

onderdelen ← reserveringen → projects → categories

## Security

- Bcrypt password hashing (10 rounds)
- Prepared statements (SQL injection preventie)
- Unique constraints (username, artikelnummer, category name)
- Check constraints (role, aantal > 0)

## Queries

**Onderdelen met voorraad**:

```sql
SELECT 
    o.*,
    COALESCE(SUM(r.aantal), 0) as reserved_quantity,
    (o.total_quantity - COALESCE(SUM(r.aantal), 0)) as available_quantity
FROM onderdelen o
LEFT JOIN reserveringen r ON o.id = r.onderdeel_id
GROUP BY o.id;
```

**Lage voorraad (≤10)**:

```sql
HAVING available_quantity <= 10
```
