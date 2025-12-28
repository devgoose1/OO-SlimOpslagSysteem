# Backend API

Express.js server op poort 3000.

## Base URL

`http://localhost:3000`

## Authenticatie

### POST `/api/login`

```json
{ "username": "admin", "password": "admin123" }
→ { "id": 1, "username": "admin", "role": "admin" }
```

## Gebruikers

**GET** `/api/users` - Alle gebruikers  
**POST** `/api/users` - Nieuwe gebruiker (username, password, role, userRole)  
**PUT** `/api/users/:id` - Gebruiker bijwerken  
**DELETE** `/api/users/:id?userRole=admin` - Gebruiker verwijderen

## Onderdelen

**GET** `/api/onderdelen` - Alle onderdelen met voorraad  
**GET** `/api/onderdelen/:id` - Specifiek onderdeel  
**POST** `/api/onderdelen` - Nieuw onderdeel (name, artikelnummer, description, location, total_quantity)  
**PUT** `/api/onderdelen/:id` - Onderdeel bijwerken  
**DELETE** `/api/onderdelen/:id` - Onderdeel verwijderen

## Projecten

**GET** `/api/projects` - Alle projecten met categorie  
**GET** `/api/projects/:id/parts` - Onderdelen van project  
**POST** `/api/projects` - Nieuw project (name, category_id)  
**DELETE** `/api/projects/:id` - Project verwijderen

## Categorieën

**GET** `/api/categories` - Alle categorieën  
**POST** `/api/categories` - Nieuwe categorie (name)  
**DELETE** `/api/categories/:id` - Categorie verwijderen

## Reserveringen

**GET** `/api/reserveringen` - Alle reserveringen  
**POST** `/api/reserveringen` - Nieuwe reservering (onderdeel_id, project_id, aantal)  
**PUT** `/api/reserveringen/:id/return` - Onderdelen retourneren (aantal)  
**DELETE** `/api/reserveringen/:id` - Reservering verwijderen

## Statistieken

**GET** `/api/stats` - Systeem statistieken

```json
{
  "totalParts": 150,
  "totalReservations": 42,
  "totalProjects": 18,
  "lowStockCount": 8
}
```

## Test Endpoints (Admin)

**GET** `/api/test/generate?count=20` - Test data genereren  
**GET** `/api/test/clear` - Test database wissen

**Test Mode**: Voeg `?testMode=true` toe aan elke URL voor test database.

## Error Codes

200 - Success  
201 - Created  
400 - Bad Request  
401 - Unauthorized  
403 - Forbidden  
404 - Not Found  
409 - Conflict (duplicate)  
500 - Server Error

## Security

- Bcrypt password hashing (10 rounds)
- Prepared statements (SQL injection preventie)
- CORS enabled
- Role-based access control
