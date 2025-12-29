/**
 * pwaService.js - PWA Registration & Notifications
 */

/**
 * Register Service Worker
 */
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Workers niet ondersteund');
        return null;
    }

    try {
        const basePath = import.meta.env.BASE_URL || '/OO-SlimOpslagSysteem/';
        const registration = await navigator.serviceWorker.register(basePath + 'sw.js', {
            scope: basePath
        });

        console.log('Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New Service Worker available - app update ready');
                    // You could show a "refresh available" notification here
                }
            });
        });

        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notifications niet ondersteund');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(vapidPublicKey) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push Notifications niet ondersteund');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('Push subscription created:', subscription);
        return subscription;
    } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
}

/**
 * Show a local notification
 */
export async function showNotification(title, options = {}) {
    if (!('Notification' in window)) {
        console.log('Notifications niet ondersteund');
        return;
    }

    if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            ...options
        });
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

/**
 * Check if app is installable
 */
export function checkInstallability() {
    return {
        standalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
        installPromptAvailable: !!window.deferredPrompt
    };
}

/**
 * Install app to home screen
 */
export async function installApp() {
    if (!window.deferredPrompt) {
        console.log('Install prompt niet beschikbaar');
        return false;
    }

    try {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // Clear the deferred prompt
        window.deferredPrompt = null;
        return outcome === 'accepted';
    } catch (error) {
        console.error('Error installing app:', error);
        return false;
    }
}

/**
 * Utility: Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Notification types helper
 */
export const NotificationTypes = {
    RESERVATION_CREATED: {
        title: 'Reservering aangemaakt',
        icon: '📦'
    },
    RETURN_DUE_SOON: {
        title: 'Terugkeer deadline nadert',
        icon: '⏰'
    },
    RETURN_OVERDUE: {
        title: 'Terugkeer is te laat!',
        icon: '⚠️'
    },
    LOW_STOCK: {
        title: 'Lage voorraad waarschuwing',
        icon: '📉'
    },
    DECISION_MADE: {
        title: 'Reservering goedgekeurd/afgekeurd',
        icon: '✅'
    }
};

/**
 * Create notification payload
 */
export function createNotificationPayload(type, details) {
    const typeData = NotificationTypes[type] || {};
    return {
        title: typeData.title,
        body: details.message,
        tag: type,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        data: {
            type,
            ...details
        },
        requireInteraction: ['RETURN_OVERDUE', 'DECISION_MADE'].includes(type)
    };
}
