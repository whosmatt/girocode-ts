const CACHE_NAME = 'v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/app.js',
    '/lib/qrcodegen.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .catch(() => { })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => { })
    );
});
