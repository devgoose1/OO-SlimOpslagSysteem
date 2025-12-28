/**
 * ReturnDatePicker.jsx - Return date for reservations
 */

import { useState, useEffect } from 'react';
import './ReturnDatePicker.css';

export default function ReturnDatePicker({ reservation, onReturnDateChange, readOnly = false }) {
    const [returnDate, setReturnDate] = useState(reservation?.return_date || '');
    const [daysLeft, setDaysLeft] = useState(null);

    // Sync local state when reservation return date changes
    useEffect(() => {
        setReturnDate(reservation?.return_date || '');
    }, [reservation?.return_date, reservation?.id]);

    useEffect(() => {
        if (returnDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(returnDate);
            deadline.setHours(0, 0, 0, 0);
            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysLeft(diffDays);
        } else {
            setDaysLeft(null);
        }
    }, [returnDate]);

    const handleChange = (e) => {
        const newDate = e.target.value;
        setReturnDate(newDate);
        onReturnDateChange?.(newDate);
    };

    // Get min date (today)
    const today = new Date().toISOString().split('T')[0];

    // Determine status badge
    let statusBadge = null;
    if (returnDate && daysLeft !== null) {
        if (daysLeft < 0) {
            statusBadge = { text: '⏰ Te laat', className: 'status-overdue' };
        } else if (daysLeft === 0) {
            statusBadge = { text: '⚠️ Vandaag terugbrengen!', className: 'status-today' };
        } else if (daysLeft === 1) {
            statusBadge = { text: '⚡ Morgen terugbrengen', className: 'status-tomorrow' };
        } else if (daysLeft <= 3) {
            statusBadge = { text: `📌 ${daysLeft} dagen`, className: 'status-soon' };
        }
    }

    const inputId = reservation?.id ? `return-date-${reservation.id}` : 'return-date';

    return (
        <div className="return-date-picker">
            <label htmlFor={inputId} className="return-label">
                📅 Geplande Terugkeer
            </label>
            
            <div className="return-date-input-group">
                <input
                    id={inputId}
                    type="date"
                    value={returnDate}
                    onChange={handleChange}
                    disabled={readOnly}
                    min={today}
                    className="return-date-input"
                />

                {statusBadge && (
                    <div className={`status-badge ${statusBadge.className}`}>
                        {statusBadge.text}
                    </div>
                )}
            </div>

            {returnDate && daysLeft !== null && (
                <div className="return-date-info">
                    {daysLeft < 0 && (
                        <div className="info-alert danger">
                            ⚠️ Deze reservering is {Math.abs(daysLeft)} dag(en) te laat!
                        </div>
                    )}
                    {daysLeft === 0 && (
                        <div className="info-alert warning">
                            📢 Onderdeel moet vandaag worden teruggegeven
                        </div>
                    )}
                    {daysLeft > 0 && daysLeft <= 3 && (
                        <div className="info-alert info">
                            💡 Onderdeel moet over {daysLeft} dag(en) worden teruggegeven
                        </div>
                    )}
                    {daysLeft > 3 && (
                        <div className="info-alert success">
                            ✅ Onderdeel mag tot {new Date(returnDate).toLocaleDateString('nl-NL')} gebruikt worden
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
