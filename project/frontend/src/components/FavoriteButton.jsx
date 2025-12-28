/**
 * FavoriteButton.jsx - Reusable favorite/star button
 */

import { useState, useEffect } from 'react';
import { addFavorite, removeFavorite, isFavorited, addLocalFavorite, removeLocalFavorite, getLocalFavorites } from '../services/favoritesService';

export default function FavoriteButton({ onderdeel_id, user, favorites = [], onFavoriteChange }) {
    const [isFav, setIsFav] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check if favorited on mount
    useEffect(() => {
        if (user?.id) {
            setIsFav(favorites.some((f) => f.onderdeel_id === onderdeel_id));
        } else {
            const localFavs = getLocalFavorites();
            setIsFav(localFavs.some((f) => f.onderdeel_id === onderdeel_id));
        }
    }, [onderdeel_id, user?.id, favorites]);

    const handleToggleFavorite = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        setLoading(true);
        try {
            if (user?.id) {
                // Logged-in user
                const response = isFav 
                    ? await removeFavorite(user.id, onderdeel_id)
                    : await addFavorite(user.id, onderdeel_id);

                if (response.success) {
                    setIsFav(!isFav);
                    onFavoriteChange?.(onderdeel_id, !isFav);
                }
            } else {
                // Non-logged-in user - use localStorage
                if (isFav) {
                    removeLocalFavorite(onderdeel_id);
                } else {
                    addLocalFavorite(onderdeel_id);
                }
                setIsFav(!isFav);
                onFavoriteChange?.(onderdeel_id, !isFav);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            className={`favorite-btn ${isFav ? 'active' : ''}`}
            onClick={handleToggleFavorite}
            disabled={loading}
            title={isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
            style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'transform 0.2s, opacity 0.2s'
            }}
        >
            {isFav ? '⭐' : '☆'}
        </button>
    );
}
