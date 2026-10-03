/**
 * ============================================================================
 * FUNDINGLY.IN — HIGH-PERFORMANCE STATIC ASSET CACHE SERVICE WORKER
 * ============================================================================
 * Designed by Kapil Pidhwani: 30-Day Long-Life Cache for Static Assets & Mascots.
 * - Strategy 1 (Cache-First, 30-Day Expiry): Static images (/assets/*), Google Fonts, Three.js
 * - Strategy 2 (Stale-While-Revalidate): Stylesheets (/css/*) and Scripts (/js/*)
 * - Strategy 3 (Network-First): HTML Document navigation with cache fallback
 * ============================================================================
 */

const CACHE_VERSION = 'fundingly-v1';
const ASSETS_CACHE = 'fundingly-assets-v1';
const STATIC_CACHE = 'fundingly-static-v1';

// 30 Days in milliseconds (30 * 24 * 60 * 60 * 1000)
const THIRTY_DAYS_MS = 2592000000;

// Essential Core Assets to Pre-cache on Installation
const PRECACHE_ASSETS = [
    '/',
    '/deals/',
    '/trends/',
    '/css/styles.css',
    '/js/app.js',
    '/js/metaballs.js',
    '/assets/fundingly_logo.png',
    '/assets/fundingly_hello.png',
    '/assets/og-preview.png',
    '/assets/apple-touch-icon.png'
];

// Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('Pre-cache warning (non-fatal):', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: Clear obsolete cache versions
self.addEventListener('activate', (event) => {
    const activeCaches = [STATIC_CACHE, ASSETS_CACHE];
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (!activeCaches.includes(key)) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Intelligent Strategy Routing
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Ignore non-GET requests or browser extension protocols
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // Strategy 1: Cache-First (30-Day Cache) for Images, Icons, and External Fonts
    const isImageOrAsset = url.pathname.startsWith('/assets/') ||
                           request.destination === 'image' ||
                           url.hostname.includes('fonts.gstatic.com') ||
                           url.hostname.includes('fonts.googleapis.com') ||
                           url.hostname.includes('cdnjs.cloudflare.com');

    if (isImageOrAsset) {
        event.respondWith(
            caches.open(ASSETS_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    const cachedTime = cachedResponse.headers.get('sw-cached-time');
                    const isStillFresh = cachedTime ? (Date.now() - parseInt(cachedTime, 10)) < THIRTY_DAYS_MS : true;
                    if (isStillFresh) {
                        return cachedResponse;
                    }
                }

                // Fetch from network and cache for 30 days
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const cloned = networkResponse.clone();
                        const headers = new Headers(cloned.headers);
                        headers.append('sw-cached-time', Date.now().toString());
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (e) {
                    return cachedResponse || Response.error();
                }
            })
        );
        return;
    }

    // Strategy 2: Stale-While-Revalidate for CSS and JS
    const isCodeAsset = url.pathname.endsWith('.css') || url.pathname.endsWith('.js');
    if (isCodeAsset) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Strategy 3: Network-First with Cache Fallback for HTML documents
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
                }
                return networkResponse;
            }).catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) return cachedResponse;
                const rootFallback = await caches.match('/');
                return rootFallback || Response.error();
            })
        );
        return;
    }
});
