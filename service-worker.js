const CACHE_NAME = 'hogwarts-sounds-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/images/gryffindor.png',
    '/images/slytherin.png',
    '/images/ravenclaw.png',
    '/images/hufflepuff.png',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

let audioFiles = [];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'CACHE_AUDIO_FILES') {
        audioFiles = event.data.files;
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return Promise.all(
                        audioFiles.map(file => 
                            fetch(file)
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch ${file}`);
                                    }
                                    return cache.put(file, response);
                                })
                                .catch(error => {
                                    console.error('Caching failed for:', file, error);
                                })
                        )
                    );
                })
                .then(() => {
                    // Notify the client that caching is complete
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'AUDIO_CACHE_COMPLETE'
                            });
                        });
                    });
                })
        );
    }
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        // Clone the response as it can only be consumed once
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
});
