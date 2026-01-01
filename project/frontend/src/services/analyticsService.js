/**
 * analyticsService.js - Analytics Dashboard Service
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`).replace(/\/$/, '');

async function callAnalyticsAPI(endpoint, userRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/${endpoint}?userRole=${userRole}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching analytics/${endpoint}:`, error);
        return { success: false };
    }
}

export async function getAnalyticsOverview(userRole) {
    return callAnalyticsAPI('overview', userRole);
}

export async function getReservationsTrend(userRole, period = 'week') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/reservations?period=${period}&userRole=${userRole}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching reservations trend:', error);
        return { success: false };
    }
}

export async function getTopItems(userRole) {
    return callAnalyticsAPI('top-items', userRole);
}

export async function getCategoriesBreakdown(userRole) {
    return callAnalyticsAPI('categories', userRole);
}

export async function getLowStockItems(userRole, threshold = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/low-stock?threshold=${threshold}&userRole=${userRole}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        return { success: false };
    }
}

export async function getUnassignedStats(userRole) {
    return callAnalyticsAPI('unassigned', userRole);
}

/**
 * Prepare data for Chart.js
 */
export function prepareChartData(data, chartType) {
    switch (chartType) {
        case 'reservations-trend':
            return {
                labels: data.data.map(d => d.period),
                datasets: [{
                    label: 'Reserveringen',
                    data: data.data.map(d => d.count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3
                }]
            };

        case 'top-items':
            return {
                labels: data.top_items.map(item => item.name.substring(0, 20)),
                datasets: [{
                    label: 'Reserveringen',
                    data: data.top_items.map(item => item.reservation_count),
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#eab308', '#6366f1', '#14b8a6'
                    ]
                }]
            };

        case 'categories':
            return {
                labels: data.categories.map(c => c.category),
                datasets: [{
                    label: 'Reserveringen per categorie',
                    data: data.categories.map(c => c.reservation_count),
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#eab308', '#6366f1', '#14b8a6'
                    ]
                }]
            };

        default:
            return { labels: [], datasets: [] };
    }
}
