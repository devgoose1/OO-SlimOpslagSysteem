/**
 * sw.js - Service Worker for PWA
 * 
 * Plaats dit bestand in: project/frontend/public/sw.js
 * 
 * Features:
 * - Offline caching
 * - Push notifications
 * - Background sync (future)
 */

const CACHE_NAME = 'opslag-app-v1';
const BASE_PATH = '/OO-SlimOpslagSysteem/';
const URLS_TO_CACHE = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(URLS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fall back to cache on network failure
                return caches.match(event.request)
                    .then((response) => {
                        return response || new Response(
                            JSON.stringify({
                                error: 'Offline - Gegevens niet beschikbaar',
                                offline: true
                            }),
                            {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: new Headers({
                                    'Content-Type': 'application/json'
                                })
                            }
                        );
                    });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    let notificationData = {
        title: 'Slim Opslagsysteem',
        body: 'Nieuwe notificatie',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png'
    };

    if (event.data) {
        try {
            notificationData = event.data.json();
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(
            notificationData.title,
            {
                body: notificationData.body,
                icon: notificationData.icon,
                badge: notificationData.badge,
                tag: notificationData.tag || 'opslag-notification',
                requireInteraction: notificationData.requireInteraction || false,
                data: notificationData.data || {}
            }
        )
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Open the app or focus existing window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there's already a window open
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
