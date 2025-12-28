/**
 * PWAInstallButton.jsx - Install App to Home Screen Button
 */

import { useState, useEffect } from 'react';
import { installApp, checkInstallability, requestNotificationPermission, showNotification } from '../services/pwaService';
import './PWAInstallButton.css';

export default function PWAInstallButton() {
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [installability, setInstallability] = useState({
        standalone: false,
        installPromptAvailable: false
    });

    useEffect(() => {
        // Check current installability status
        setInstallability(checkInstallability());

        // Capture install prompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for app installed event
        const handleAppInstalled = () => {
            console.log('App installed successfully');
            setShowInstallPrompt(false);
            window.deferredPrompt = null;
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        const success = await installApp();
        if (success) {
            console.log('App installed successfully');
            setShowInstallPrompt(false);
        }
    };

    const handleNotifications = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            setShowNotifications(true);
            showNotification('Notificaties ingeschakeld!', {
                body: 'Je ontvangt nu meldingen van het opslagsysteem',
                tag: 'welcome'
            });
            setTimeout(() => setShowNotifications(false), 5000);
        }
    };

    if (installability.standalone) {
        // Already installed as PWA
        return null;
    }

    return (
        <div className="pwa-install-container">
            {showInstallPrompt && (
                <div className="pwa-install-banner">
                    <div className="install-content">
                        <div className="install-icon">📱</div>
                        <div className="install-text">
                            <h3>Installeer als App</h3>
                            <p>Snel toegankelijk via je home screen</p>
                        </div>
                        <button
                            className="install-btn"
                            onClick={handleInstall}
                        >
                            Installeer
                        </button>
                        <button
                            className="install-close-btn"
                            onClick={() => setShowInstallPrompt(false)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="pwa-features">
                {!showNotifications && (
                    <button
                        className="feature-btn"
                        onClick={handleNotifications}
                        title="Notificaties inschakelen"
                    >
                        🔔 Notificaties
                    </button>
                )}

                {showNotifications && (
                    <div className="feature-confirmed">
                        🔔 Notificaties ingeschakeld
                    </div>
                )}
            </div>
        </div>
    );
}
