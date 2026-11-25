// 변경할 때마다 index.html의 APP_VERSION과 같은 값으로 올린다.
const VERSION = '0.1.1';
const CACHE = `app-${VERSION}`;

// 오프라인용으로 미리 저장할 파일. 새 파일을 추가하면 여기에도 넣는다.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 화면(HTML)은 네트워크 우선: 온라인이면 항상 최신, 오프라인이면 저장본
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 나머지는 저장본 우선
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
