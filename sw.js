// Clean Living — Service Worker
// Handles caching and push notifications

const CACHE = 'cl-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

// ── PUSH NOTIFICATION RECEIVED ──────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title = data.title || 'Clean Living';
  var options = {
    body: data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || 'https://cleanliving.app' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || 'https://cleanliving.app';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('cleanliving.app') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
