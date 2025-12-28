/**
 * analyticsApi.js - Analytics Dashboard API
 * 
 * Endpoints (alle zichtbaar voor docent, toa, expert):
 * - GET /api/analytics/overview - Samenvatting (reserveringen totaal, unassigned items, etc)
 * - GET /api/analytics/reservations - Reserveringen over tijd (week/maand)
 * - GET /api/analytics/top-items - Top 10 meest gereserveerde onderdelen
 * - GET /api/analytics/categories - Verdeling per categorie
 * - GET /api/analytics/low-stock - Onderdelen met lage voorraad
 * - GET /api/analytics/unassigned - Hoeveel onderdelen onverdeeld zijn
 */

const { db } = require('./database');

const ALLOWED_ROLES = ['teacher', 'expert', 'admin', 'toa'];

/**
 * Middleware - Check analytics access
 * Expects userId en userRole in req.body
 */
function requireAnalyticsAccess(req, res, next) {
    const userRole = req.body?.userRole || req.query?.userRole;
    if (!userRole) {
        return res.status(401).json({ error: 'userRole vereist' });
    }
    if (!ALLOWED_ROLES.includes(userRole)) {
        return res.status(403).json({ error: 'Geen toestemming voor analytics' });
    }
    next();
}

/**
 * GET /api/analytics/overview
 * Samenvatting van statistieken
 */
async function getAnalyticsOverview(req, res) {
    try {
        // Totaal reserveringen
        db.get(`
            SELECT COUNT(*) as total_reservations,
                   SUM(CASE WHEN status = 'active' THEN qty ELSE 0 END) as active_qty,
                   SUM(CASE WHEN status = 'unassigned' THEN qty ELSE 0 END) as unassigned_qty,
                   SUM(CASE WHEN status = 'pending' THEN qty ELSE 0 END) as pending_qty
            FROM reservations
        `, (err, reservation_stats) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Onderdelen met lage voorraad (≤10)
            db.get(`
                SELECT COUNT(*) as low_stock_count
                FROM onderdelen
                WHERE total_quantity <= 10
            `, (err, low_stock) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                // Unieke onderdelen totaal
                db.get(`
                    SELECT COUNT(*) as total_items
                    FROM onderdelen
                `, (err, total_items) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    res.json({
                        success: true,
                        overview: {
                            total_reservations: reservation_stats.total_reservations || 0,
                            active_reservations: reservation_stats.active_qty || 0,
                            unassigned_qty: reservation_stats.unassigned_qty || 0,
                            pending_qty: reservation_stats.pending_qty || 0,
                            low_stock_items: low_stock.low_stock_count || 0,
                            total_items: total_items.total_items || 0
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error in getAnalyticsOverview:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET /api/analytics/reservations?period=week|month
 * Reserveringen over tijd
 */
async function getReservationsTrend(req, res) {
    try {
        const { period = 'week' } = req.query;

        // SQLite date grouping
        const dateFormat = period === 'month' ? '%Y-%m' : '%Y-%m-%d';

        db.all(`
            SELECT strftime('${dateFormat}', created_at) as period,
                   COUNT(*) as count,
                   SUM(qty) as total_qty
            FROM reservations
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY period
            ORDER BY period ASC
        `, (err, rows) => {
            if (err) {
                console.error('Error fetching reservations trend:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                success: true,
                period,
                data: rows || []
            });
        });
    } catch (error) {
        console.error('Error in getReservationsTrend:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET /api/analytics/top-items
 * Top 10 meest gereserveerde onderdelen
 */
async function getTopItems(req, res) {
    try {
        db.all(`
            SELECT 
                o.id,
                o.name,
                o.sku,
                COUNT(r.id) as reservation_count,
                SUM(r.qty) as total_qty_reserved,
                o.total_quantity as current_stock
            FROM onderdelen o
            LEFT JOIN reservations r ON o.id = r.onderdeel_id
            GROUP BY o.id
            ORDER BY reservation_count DESC
            LIMIT 10
        `, (err, rows) => {
            if (err) {
                console.error('Error fetching top items:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                success: true,
                top_items: rows || []
            });
        });
    } catch (error) {
        console.error('Error in getTopItems:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET /api/analytics/categories
 * Reserveringen verdeling per categorie
 */
async function getCategoriesBreakdown(req, res) {
    try {
        db.all(`
            SELECT 
                COALESCE(c.name, 'Geen categorie') as category,
                COUNT(r.id) as reservation_count,
                SUM(r.qty) as total_qty,
                COUNT(DISTINCT r.project_id) as project_count
            FROM categories c
            LEFT JOIN onderdelen o ON o.id IN (
                SELECT onderdeel_id FROM reservations 
            )
            LEFT JOIN reservations r ON r.onderdeel_id = o.id AND c.id = (
                SELECT category_id FROM projects WHERE id = r.project_id LIMIT 1
            )
            GROUP BY c.id
            ORDER BY reservation_count DESC
        `, (err, rows) => {
            if (err) {
                console.error('Error fetching categories:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                success: true,
                categories: rows || []
            });
        });
    } catch (error) {
        console.error('Error in getCategoriesBreakdown:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET /api/analytics/low-stock
 * Onderdelen met lage voorraad
 */
async function getLowStockItems(req, res) {
    try {
        const { threshold = 10 } = req.query;

        db.all(`
            SELECT 
                o.id,
                o.name,
                o.sku,
                o.total_quantity as current_stock,
                COUNT(r.id) as active_reservations,
                SUM(CASE WHEN r.status = 'active' THEN r.qty ELSE 0 END) as reserved_qty
            FROM onderdelen o
            LEFT JOIN reservations r ON o.id = r.onderdeel_id
            WHERE o.total_quantity <= ?
            GROUP BY o.id
            ORDER BY o.total_quantity ASC
        `, [threshold], (err, rows) => {
            if (err) {
                console.error('Error fetching low stock:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                success: true,
                threshold,
                low_stock_items: rows || []
            });
        });
    } catch (error) {
        console.error('Error in getLowStockItems:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET /api/analytics/unassigned
 * Hoeveel onderdelen onverdeeld zijn
 */
async function getUnassignedStats(req, res) {
    try {
        db.all(`
            SELECT 
                r.id as reservation_id,
                o.id as onderdeel_id,
                o.name,
                o.sku,
                r.qty,
                p.name as project_name,
                r.created_at
            FROM reservations r
            JOIN onderdelen o ON r.onderdeel_id = o.id
            JOIN projects p ON r.project_id = p.id
            WHERE r.status = 'unassigned'
            ORDER BY r.created_at ASC
        `, (err, rows) => {
            if (err) {
                console.error('Error fetching unassigned:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                success: true,
                unassigned_count: rows.length,
                unassigned_items: rows || []
            });
        });
    } catch (error) {
        console.error('Error in getUnassignedStats:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    requireAnalyticsAccess,
    getAnalyticsOverview,
    getReservationsTrend,
    getTopItems,
    getCategoriesBreakdown,
    getLowStockItems,
    getUnassignedStats
};
