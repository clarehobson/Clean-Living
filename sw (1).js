var CACHE_NAME = 'cleanliving-v2';
var urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never intercept API calls — let them go straight to network
  if (
    url.indexOf('supabase.co') > -1 ||
    url.indexOf('workers.dev') > -1 ||
    url.indexOf('googleapis.com') > -1 ||
    url.indexOf('gstatic.com') > -1 ||
    event.request.method !== 'GET'
  ) {
    return; // Don't call event.respondWith — browser handles it normally
  }

  // For everything else — network first, fall back to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
