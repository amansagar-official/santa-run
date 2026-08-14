const CACHE = 'santa-run-v16';
const ASSETS = [
  './', './index.html', './game.js', './manifest.json',
  './assets/santa2.png', './assets/kids1.png',
  './assets/gift.png', './assets/snowman.png',
  './assets/eagle.png', './assets/mystery.png',
  './assets/bg.jpg', './assets/icon-192.png', './assets/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
