/**
 * AnalyticsDashboard.jsx - Analytics Dashboard with Chart.js
 */

import { useState, useEffect } from 'react';
import {
    getAnalyticsOverview,
    getReservationsTrend,
    getTopItems,
    getCategoriesBreakdown,
    getLowStockItems,
    getUnassignedStats,
    prepareChartData
} from '../services/analyticsService';
import './AnalyticsDashboard.css';

// Note: You'll need to install: npm install chart.js react-chartjs-2
// Then import: import { Line, Bar, Pie } from 'react-chartjs-2';
// For now, we'll create a simple version without external charts

export default function AnalyticsDashboard({ user }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // State for different analytics
    const [overview, setOverview] = useState(null);
    const [reservationsTrend, setReservationsTrend] = useState(null);
    const [topItems, setTopItems] = useState(null);
    const [categories, setCategories] = useState(null);
    const [lowStock, setLowStock] = useState(null);
    const [unassigned, setUnassigned] = useState(null);

    useEffect(() => {
        if (user?.role && ['teacher', 'expert', 'admin', 'toa'].includes(user.role)) {
            loadAnalytics();
        }
    }, [user?.role]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ov, trend, top, cat, low, una] = await Promise.all([
                getAnalyticsOverview(user.role),
                getReservationsTrend(user.role, 'week'),
                getTopItems(user.role),
                getCategoriesBreakdown(user.role),
                getLowStockItems(user.role),
                getUnassignedStats(user.role)
            ]);

            if (ov.success) setOverview(ov.overview);
            if (trend.success) setReservationsTrend(trend.data);
            if (top.success) setTopItems(top.top_items);
            if (cat.success) setCategories(cat.categories);
            if (low.success) setLowStock(low.low_stock_items);
            if (una.success) setUnassigned(una.unassigned_items);
        } catch (err) {
            setError('Fout bij laden analytics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!user?.role || !['teacher', 'expert', 'admin', 'toa'].includes(user.role)) {
        return (
            <div className="analytics-denied">
                <p>Geen toestemming voor analytics dashboard</p>
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h2>📊 Analytics Dashboard</h2>
                <button onClick={loadAnalytics} disabled={loading} className="refresh-btn">
                    🔄 {loading ? 'Laden...' : 'Vernieuwen'}
                </button>
            </div>

            {error && <div className="analytics-error">{error}</div>}

            <div className="analytics-tabs">
                {['overview', 'reservations', 'items', 'categories', 'low-stock', 'unassigned'].map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div className="analytics-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && overview && (
                    <div className="analytics-overview">
                        <div className="stat-card">
                            <div className="stat-value">{overview.total_reservations}</div>
                            <div className="stat-label">Totaal reserveringen</div>
                        </div>
                        <div className="stat-card highlight">
                            <div className="stat-value">{overview.active_reservations}</div>
                            <div className="stat-label">Actieve reserveringen</div>
                        </div>
                        <div className="stat-card warning">
                            <div className="stat-value">{overview.unassigned_qty}</div>
                            <div className="stat-label">Onverdeeld</div>
                        </div>
                        <div className="stat-card pending">
                            <div className="stat-value">{overview.pending_qty}</div>
                            <div className="stat-label">In afwachting</div>
                        </div>
                        <div className="stat-card danger">
                            <div className="stat-value">{overview.low_stock_items}</div>
                            <div className="stat-label">Lage voorraad items</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{overview.total_items}</div>
                            <div className="stat-label">Totaal onderdelen</div>
                        </div>
                    </div>
                )}

                {/* Reservations Trend Tab */}
                {activeTab === 'reservations' && reservationsTrend && (
                    <div className="analytics-section">
                        <h3>Reserveringen over tijd (afgelopen 30 dagen)</h3>
                        <div className="trend-chart">
                            <table className="trend-table">
                                <thead>
                                    <tr>
                                        <th>Periode</th>
                                        <th>Aantal</th>
                                        <th>Totale Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservationsTrend.map((row) => (
                                        <tr key={row.period}>
                                            <td>{row.period}</td>
                                            <td>{row.count}</td>
                                            <td>{row.total_qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Top Items Tab */}
                {activeTab === 'items' && topItems && (
                    <div className="analytics-section">
                        <h3>Top 10 Meest gereserveerde onderdelen</h3>
                        <div className="items-grid">
                            {topItems.map((item, idx) => (
                                <div key={item.id} className="item-card">
                                    <div className="item-rank">#{idx + 1}</div>
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-sku">SKU: {item.sku}</div>
                                    <div className="item-stats">
                                        <span>Reserveringen: {item.reservation_count}</span>
                                        <span>Qty: {item.total_qty_reserved}</span>
                                    </div>
                                    <div className="item-stock">
                                        Voorraad: {item.current_stock}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && categories && (
                    <div className="analytics-section">
                        <h3>Verdeling per categorie</h3>
                        <div className="categories-list">
                            {categories.map((cat) => (
                                <div key={cat.category} className="category-row">
                                    <div className="category-name">{cat.category}</div>
                                    <div className="category-stats">
                                        <span>Reserveringen: {cat.reservation_count}</span>
                                        <span>Qty: {cat.total_qty}</span>
                                        <span>Projecten: {cat.project_count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Low Stock Tab */}
                {activeTab === 'low-stock' && lowStock && (
                    <div className="analytics-section">
                        <h3>⚠️ Onderdelen met lage voorraad (≤10)</h3>
                        <div className="low-stock-list">
                            {lowStock.length === 0 ? (
                                <p>Alle voorraad is voldoende!</p>
                            ) : (
                                lowStock.map((item) => (
                                    <div key={item.id} className="low-stock-item">
                                        <div className="item-info">
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-sku">SKU: {item.sku}</div>
                                        </div>
                                        <div className="item-stock-status danger">
                                            {item.current_stock} stuks
                                            {item.active_reservations > 0 && (
                                                <span className="reserved">
                                                    ({item.reserved_qty} gereserveerd)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Unassigned Tab */}
                {activeTab === 'unassigned' && unassigned && (
                    <div className="analytics-section">
                        <h3>📦 Onverdeelde reserveringen ({unassigned.unassigned_count})</h3>
                        <div className="unassigned-list">
                            {unassigned.length === 0 ? (
                                <p>Geen onverdeelde reserveringen!</p>
                            ) : (
                                unassigned.map((res) => (
                                    <div key={res.reservation_id} className="unassigned-item">
                                        <div className="item-info">
                                            <div className="item-name">{res.name}</div>
                                            <div className="project-name">Project: {res.project_name}</div>
                                        </div>
                                        <div className="item-qty">
                                            {res.qty} stuks
                                        </div>
                                        <div className="item-date">
                                            {new Date(res.created_at).toLocaleDateString('nl-NL')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
