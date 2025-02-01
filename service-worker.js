const CACHE_NAME = 'hogwarts-sounds-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/images/gryffindor.png',
    '/images/slytherin.png',
    '/images/ravenclaw.png',
    '/images/hufflepuff.png',
    '/sounds/gryffindor.mp3',
    '/sounds/slytherin.mp3',
    '/sounds/ravenclaw.mp3',
    '/sounds/hufflepuff.mp3',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
