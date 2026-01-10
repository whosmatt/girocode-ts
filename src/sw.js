const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/app.js',
    '/lib/qrcodegen.js',
    '/icons/32.png',
    '/icons/180.png',
    '/icons/192.png',
    '/icons/512.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('app')
            .then(cache => cache.addAll(urlsToCache))
            .catch(() => { })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => { })
    );
});

self.addEventListener('activate', event => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(cacheNames.map(c => caches.delete(c)));
        }).then(() => {
            return caches.open('app').then(cache => {
                return cache.addAll(urlsToCache);
            });
        }).then(() => {
            // Notify all clients that cache refresh is complete
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_CACHE_UPDATED' });
                });
            });
        })
    );
});
