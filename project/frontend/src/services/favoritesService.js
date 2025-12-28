/**
 * favoritesService.js - Favorites Management Service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function getFavorites(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites?userId=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return { success: false, favorites: [] };
    }
}

export async function addFavorite(userId, onderdeel_id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, onderdeel_id })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error adding favorite:', error);
        return { success: false };
    }
}

export async function removeFavorite(userId, onderdeel_id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/${onderdeel_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error removing favorite:', error);
        return { success: false };
    }
}

/**
 * Check if onderdeel is in favorites (for client-side state)
 * Falls back to localStorage for non-authenticated users
 */
export function isFavorited(onderdeel_id, favorites) {
    return favorites.some(f => f.onderdeel_id === onderdeel_id);
}

/**
 * LocalStorage fallback for non-authenticated users
 */
export function getLocalFavorites() {
    try {
        return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch {
        return [];
    }
}

export function addLocalFavorite(onderdeel_id) {
    try {
        const favorites = getLocalFavorites();
        if (!favorites.find(f => f.onderdeel_id === onderdeel_id)) {
            favorites.push({ onderdeel_id, created_at: new Date().toISOString() });
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        return favorites;
    } catch (error) {
        console.error('Error updating localStorage:', error);
        return [];
    }
}

export function removeLocalFavorite(onderdeel_id) {
    try {
        const favorites = getLocalFavorites().filter(f => f.onderdeel_id !== onderdeel_id);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        return favorites;
    } catch (error) {
        console.error('Error updating localStorage:', error);
        return [];
    }
}
