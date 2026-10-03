/* 考研错题本 离线缓存 Service Worker */
const CACHE = 'cuotiben-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* 网页本身走"缓存优先 + 后台更新"，保证离线也能打开；
   其它请求不拦截，避免影响以后可能加的云同步接口 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('.html') ||
                url.pathname.endsWith('/');

  if (!isDoc && !ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')))) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const fetching = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || fetching;
    })
  );
});
