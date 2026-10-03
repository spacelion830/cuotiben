/* 考研错题本 Service Worker
   策略：网页走「网络优先」（保证你永远看到最新版本），
         只有断网时才回退到缓存（保证离线能打开）。
   这样以后更新只需要上传 index.html，不用再改版本号。 */
const CACHE = 'cuotiben-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppFile(url) {
  return url.pathname.endsWith('.html') ||
         url.pathname.endsWith('/') ||
         /\.(js|json|svg|png|webp|ico)$/.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 只接管本站文件

  const isDoc = req.mode === 'navigate' || isAppFile(url);
  if (!isDoc) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        /* 断网了：退回缓存，保证离线可用 */
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || caches.match('./index.html', { ignoreSearch: true })
        )
      )
  );
});
