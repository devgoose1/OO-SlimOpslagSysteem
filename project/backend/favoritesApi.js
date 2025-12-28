/**
 * favoritesApi.js - Favorites Management API
 * 
 * Endpoints:
 * - GET /api/favorites - Haal favorieten op voor ingelogde user
 * - POST /api/favorites - Voeg onderdeel toe aan favorieten
 * - DELETE /api/favorites/:onderdeel_id - Verwijder uit favorieten
 */

const { db } = require('./database');

/**
 * getFavorites - Middleware-compatible handler
 * Expects: req.body.userId (client-provided) or uses as favor query param
 */
async function getFavorites(req, res) {
    try {
        // Get userId from body or query
        const userId = req.body?.userId || req.query?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'userId vereist' });
        }

        db.all(`
            SELECT f.id, f.onderdeel_id, f.created_at, o.name, o.sku, o.description, o.image_url
            FROM favorites f
            JOIN onderdelen o ON f.onderdeel_id = o.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `, [userId], (err, rows) => {
            if (err) {
                console.error('Error fetching favorites:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, favorites: rows || [] });
        });
    } catch (error) {
        console.error('Error in getFavorites:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * POST /api/favorites
 * Voeg een onderdeel toe aan favorieten
 * Body: { userId, onderdeel_id }
 */
async function addFavorite(req, res) {
    try {
        const userId = req.body?.userId;
        const { onderdeel_id } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'userId vereist' });
        }

        if (!onderdeel_id) {
            return res.status(400).json({ error: 'onderdeel_id vereist' });
        }

        // Controleer of onderdeel bestaat
        db.get('SELECT id FROM onderdelen WHERE id = ?', [onderdeel_id], (err, onderdeel) => {
            if (err || !onderdeel) {
                return res.status(404).json({ error: 'Onderdeel niet gevonden' });
            }

            // Voeg favorite toe (IGNORE duplicate constraint)
            db.run(`
                INSERT OR IGNORE INTO favorites (user_id, onderdeel_id)
                VALUES (?, ?)
            `, [userId, onderdeel_id], (err) => {
                if (err) {
                    console.error('Error adding favorite:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    success: true,
                    message: 'Onderdeel toegevoegd aan favorieten',
                    onderdeel_id
                });
            });
        });
    } catch (error) {
        console.error('Error in addFavorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * DELETE /api/favorites/:onderdeel_id
 * Verwijder een onderdeel uit favorieten
 * Body must include: { userId }
 */
async function removeFavorite(req, res) {
    try {
        const userId = req.body?.userId;
        const { onderdeel_id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'userId vereist' });
        }

        db.run(`
            DELETE FROM favorites
            WHERE user_id = ? AND onderdeel_id = ?
        `, [userId, onderdeel_id], function(err) {
            if (err) {
                console.error('Error removing favorite:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Favorite niet gevonden' });
            }

            res.json({
                success: true,
                message: 'Onderdeel verwijderd uit favorieten',
                onderdeel_id
            });
        });
    } catch (error) {
        console.error('Error in removeFavorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
