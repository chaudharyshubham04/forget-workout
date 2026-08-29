/* Forge service worker — precache app shell, stale-while-revalidate for the rest. */
const VERSION = 'forge-v1.3.0';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
/* Exercise photos and GIFs are large (~110 MB in total), so they are cached on
   demand rather than precached, and kept in a bucket that survives app updates. */
const MEDIA = 'forge-media-v1';

const PRECACHE = [
  './', './index.html', './offline.html', './manifest.webmanifest',
  './css/styles.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/store.js',
  './js/lib/dom.js', './js/lib/utils.js', './js/lib/charts.js',
  './js/lib/anatomy.js', './js/lib/motion.js', './js/lib/progression.js',
  './js/lib/stats.js', './js/lib/idb.js', './js/lib/notify.js', './js/lib/ui.js',
  './js/lib/components.js', './js/lib/install.js', './js/lib/theme.js',
  './js/data/taxonomy.js', './js/data/exercises.js', './js/data/splits.js',
  './js/data/exercises-extended.json', './js/data/curated-media.json', './js/data/app-config.json', './js/lib/media.js',
  './js/views/home.js', './js/views/exercises.js', './js/views/exerciseDetail.js',
  './js/views/exerciseEdit.js', './js/views/workouts.js', './js/views/builder.js',
  './js/views/active.js', './js/views/splits.js', './js/views/splitDetail.js',
  './js/views/progress.js', './js/views/exerciseProgress.js', './js/views/history.js',
  './js/views/sessionDetail.js', './js/views/calendar.js', './js/views/records.js',
  './js/views/goals.js', './js/views/body.js', './js/views/settings.js',
  './js/views/onboarding.js', './js/views/taxonomyEdit.js', './js/views/more.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Add individually so one 404 cannot abort the whole install.
    await Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => !k.startsWith(VERSION) && k !== MEDIA)
      .map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first (fresh shell), fall back to cached shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const net = await fetch(request);
        const cache = await caches.open(SHELL);
        cache.put('./index.html', net.clone());
        return net;
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match('./index.html')) || (await cache.match('./')) ||
               (await cache.match('./offline.html')) || Response.error();
      }
    })());
    return;
  }

  // Exercise media: cache-first and kept indefinitely — these files never change.
  if (/^\/?media\//.test(url.pathname.replace(/^\//, '/')) || url.pathname.includes('/media/')) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      } catch {
        return new Response('', { status: 504, statusText: 'Media unavailable offline' });
      }
    })());
    return;
  }

  // Assets: stale-while-revalidate.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (res) => {
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(RUNTIME);
        cache.put(request, res.clone());
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504, statusText: 'Offline' });
  })());
});

// Reminder notifications scheduled by the page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
