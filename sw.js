// Service Worker para BellaZo - Suporte Offline e Sincronização
const CACHE_NAME = 'bellazo-v3';
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'bellazo_icon.png'
];

// Instalar o Service Worker e cachear arquivos base
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Alguns arquivos não puderam ser cacheados:', err);
        });
      })
  );
  self.skipWaiting();
});

// Ativar o Service Worker e limpar caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de Cache-First com ignorancia total ao Firebase
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // REGRA DE OURO: Se for requisição do Firebase ou Google APIs, saia imediatamente.
  // Deixe a rede processar direto sem passar pelo interceptador do Service Worker.
  if (event.request.url.includes('firebasedatabase') || event.request.url.includes('googleapis')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => caches.match('index.html'));
      })
  );
});
