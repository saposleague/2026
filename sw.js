// Service Worker para Sapos League PWA - Versão Robusta
const CACHE_VERSION = '2.2.6';
const CACHE_NAME = `sapos-league-v${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const OFFLINE_PAGE = './offline.html';

// Recursos essenciais para cache estático
const STATIC_ASSETS = [
  './',
  './index.html',
  './rodadas.html',
  './admin.html',
  './offline.html',
  './css/index.css',
  './css/rodadas.css',
  './css/admin.css',
  './css/components.css',
  './css/dark-mode-colors.css',
  './css/favicon-display.css',
  './js/index.js',
  './js/rodadas.js',
  './js/admin.js',
  './js/firebase-config.js',
  './js/dark-mode-logic.js',
  './js/auth-manager.js',
  './js/pwa-complete.js',
  './js/pwa-install.js',
  './js/dynamic-favicon.js',
  './js/back-to-home.js',
  './images/favicon.png',
  './images/favicon-48x48.png',
  './images/favicon-96x96.png',
  './images/apple-touch-icon.png',
  './images/web-app-manifest-192x192.png',
  './images/web-app-manifest-512x512.png',
  './site.webmanifest'
];

// Recursos que podem ser cacheados dinamicamente
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/
];

// Recursos que nunca devem ser cacheados
const NEVER_CACHE_PATTERNS = [
  /^https:\/\/.*\.firebaseio\.com/,
  /^https:\/\/.*\.googleapis\.com\/.*firebase/,
  /^https:\/\/.*\.gstatic\.com\/.*firebase/,
  /\/api\//,
  /\?.*nocache/
];

// ==================== INSTALAÇÃO AVANÇADA ====================
self.addEventListener('install', (event) => {
  console.log(`[SW] Instalando versão ${CACHE_VERSION}...`);
  
  event.waitUntil(
    Promise.all([
      // Cache estático
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Criar página offline
      createOfflinePage()
    ])
    .then(() => {
      console.log(`[SW] Versão ${CACHE_VERSION} instalada com sucesso`);
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('[SW] Erro na instalação:', error);
    })
  );
});

// Criar página offline se não existir
async function createOfflinePage() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const offlineResponse = await cache.match(OFFLINE_PAGE);
    
    if (!offlineResponse) {
      const offlineHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Sapos League</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .offline-container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              max-width: 400px;
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin-bottom: 30px; }
            button {
              background: #4caf50;
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 25px;
              font-size: 1.1em;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <h1>⚽ Sapos League</h1>
            <h2>📡 Você está offline</h2>
            <p>Não foi possível conectar à internet. Verifique sua conexão e tente novamente.</p>
            <button onclick="window.location.reload()">🔄 Tentar Novamente</button>
          </div>
        </body>
        </html>
      `;
      
      await cache.put(OFFLINE_PAGE, new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
      }));
    }
  } catch (error) {
    console.error('[SW] Erro ao criar página offline:', error);
  }
}

// ==================== ATIVAÇÃO AVANÇADA ====================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Ativando versão ${CACHE_VERSION}...`);
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      cleanupOldCaches(),
      
      // Tomar controle imediato
      self.clients.claim()
    ])
    .then(() => {
      console.log(`[SW] Versão ${CACHE_VERSION} ativada com sucesso`);
      
      // Notificar clientes sobre atualização
      return notifyClientsOfUpdate();
    })
  );
});

// Limpar caches antigos
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('[SW] Removendo cache antigo:', cacheName);
      return caches.delete(cacheName);
    });
  
  return Promise.all(deletePromises);
}

// Notificar clientes sobre atualização
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_UPDATED',
      version: CACHE_VERSION
    });
  });
}

// ==================== ESTRATÉGIAS DE CACHE AVANÇADAS ====================
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Verificar se deve ser ignorado
  if (shouldNeverCache(url)) return;
  
  // Estratégias baseadas no tipo de recurso
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  } else if (isHTMLPage(url)) {
    event.respondWith(networkFirst(event.request));
  } else if (isDynamicAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

// Verificar se nunca deve ser cacheado
function shouldNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// Verificar se é recurso estático
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         /\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/.test(url.pathname);
}

// Verificar se é página HTML
function isHTMLPage(url) {
  return url.pathname.endsWith('.html') || 
         url.pathname === '/' || 
         !url.pathname.includes('.');
}

// Verificar se é recurso dinâmico
function isDynamicAsset(url) {
  return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// ==================== ESTRATÉGIA: CACHE FIRST ====================
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First falhou:', error);
    return await caches.match(OFFLINE_PAGE);
  }
}

// ==================== ESTRATÉGIA: NETWORK FIRST ====================
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network falhou, tentando cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Para páginas HTML, retornar página offline
    if (isHTMLPage(new URL(request.url))) {
      return await caches.match(OFFLINE_PAGE);
    }
    
    throw error;
  }
}

// ==================== ESTRATÉGIA: STALE WHILE REVALIDATE ====================
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// ==================== BACKGROUND SYNC AVANÇADO ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  switch (event.tag) {
    case 'sync-game-data':
      event.waitUntil(syncGameData());
      break;
    case 'sync-notifications':
      event.waitUntil(syncNotifications());
      break;
    case 'cleanup-cache':
      event.waitUntil(cleanupDynamicCache());
      break;
    default:
      console.log('[SW] Sync tag desconhecido:', event.tag);
  }
});

// Sincronizar dados dos jogos
async function syncGameData() {
  try {
    console.log('[SW] Sincronizando dados dos jogos...');
    
    // Tentar buscar dados atualizados
    const response = await fetch('/api/sync-data');
    if (response.ok) {
      const data = await response.json();
      
      // Notificar clientes sobre dados atualizados
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'DATA_SYNCED',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// Sincronizar notificações pendentes
async function syncNotifications() {
  try {
    console.log('[SW] Sincronizando notificações...');
    
    // Buscar notificações pendentes do IndexedDB ou localStorage
    const pendingNotifications = await getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      await self.registration.showNotification(notification.title, notification.options);
    }
    
    // Limpar notificações enviadas
    await clearPendingNotifications();
  } catch (error) {
    console.error('[SW] Erro ao sincronizar notificações:', error);
  }
}

// Limpeza do cache dinâmico
async function cleanupDynamicCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // Manter apenas os 50 recursos mais recentes
    if (requests.length > 50) {
      const toDelete = requests.slice(0, requests.length - 50);
      await Promise.all(toDelete.map(request => cache.delete(request)));
      console.log(`[SW] Removidos ${toDelete.length} itens do cache dinâmico`);
    }
  } catch (error) {
    console.error('[SW] Erro na limpeza do cache:', error);
  }
}

// Funções auxiliares para notificações
async function getPendingNotifications() {
  // Implementar busca de notificações pendentes
  return [];
}

async function clearPendingNotifications() {
  // Implementar limpeza de notificações pendentes
}

// ==================== NOTIFICAÇÕES PUSH AVANÇADAS ====================
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  console.log('[SW] Push data:', event.data ? event.data.text() : 'sem dados');
  
  // Se não houver dados no push, ignorar (evita notificações genéricas aleatórias)
  if (!event.data) {
    console.log('[SW] Push sem dados - ignorando');
    return;
  }

  let notificationData = getDefaultNotificationData();

  // Processar dados do push
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('[SW] Push JSON:', pushData);
      
      notificationData = {
        ...notificationData,
        ...pushData,
        title: pushData.title || pushData.notification?.title || notificationData.title,
        body: pushData.body || pushData.notification?.body || pushData.message || notificationData.body
      };
      
      // Se vier com objeto notification separado (formato FCM)
      if (pushData.notification) {
        notificationData.title = pushData.notification.title || notificationData.title;
        notificationData.body = pushData.notification.body || notificationData.body;
        notificationData.icon = pushData.notification.icon || notificationData.icon;
        notificationData.badge = pushData.notification.badge || notificationData.badge;
        notificationData.tag = pushData.notification.tag || notificationData.tag;
      }
      
      // Dados adicionais
      if (pushData.data) {
        notificationData.data = {
          ...notificationData.data,
          ...pushData.data
        };
      }
      
    } catch (e) {
      console.log('[SW] Erro ao parsear JSON, usando texto:', e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  console.log('[SW] Mostrando notificação:', notificationData.title);
  const options = createNotificationOptions(notificationData);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, options),
      logNotification(notificationData)
    ]).then(() => {
      console.log('[SW] Notificação exibida com sucesso');
    }).catch(error => {
      console.error('[SW] Erro ao exibir notificação:', error);
    })
  );
});

// Dados padrão para notificações
function getDefaultNotificationData() {
  return {
    title: '⚽ Sapos League',
    body: 'Nova atualização disponível!',
    icon: 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
    badge: 'https://saposleague.github.io/2026/images/favicon-96x96.png',
    tag: 'sapos-league',
    url: 'https://saposleague.github.io/2026/'
  };
}

// Criar opções de notificação otimizadas
function createNotificationOptions(data) {
  return {
    body: data.body,
    icon: data.icon || 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
    badge: data.badge || 'https://saposleague.github.io/2026/images/favicon-96x96.png',
    tag: data.tag,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    renotify: true,
    timestamp: Date.now(),
    actions: [
      {
        action: 'view',
        title: '👀 Ver',
        icon: 'https://saposleague.github.io/2026/images/favicon-96x96.png'
      },
      {
        action: 'close',
        title: '❌ Fechar',
        icon: 'https://saposleague.github.io/2026/images/favicon-96x96.png'
      }
    ],
    data: {
      ...data.data,
      dateOfArrival: Date.now(),
      url: data.url || 'https://saposleague.github.io/2026/',
      source: 'sapos-league-pwa'
    }
  };
}

// Log de notificações para analytics
async function logNotification(data) {
  try {
    // Implementar log de notificações se necessário
    console.log('[SW] Notificação enviada:', data.title);
  } catch (error) {
    console.error('[SW] Erro ao logar notificação:', error);
  }
}

// ==================== INTERAÇÃO COM NOTIFICAÇÕES ====================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  
  // Fechar notificação
  notification.close();
  
  // Processar ação
  if (action === 'close') {
    return;
  }
  
  // Determinar URL para abrir
  const urlToOpen = data.url || 'https://saposleague.github.io/2026/';
  
  event.waitUntil(
    handleNotificationClick(urlToOpen, data)
  );
});

// Gerenciar clique em notificação
async function handleNotificationClick(url, data) {
  try {
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    // Procurar janela existente do site
    for (const client of clients) {
      if (client.url.includes('saposleague.github.io')) {
        await client.focus();
        
        // Navegar para a URL correta se necessário
        if (!client.url.includes('/2026/')) {
          client.navigate(url);
        }
        
        // Enviar dados para o cliente
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          url: url,
          data: data
        });
        
        return;
      }
    }
    
    // Abrir nova janela se não houver uma existente
    if (self.clients.openWindow) {
      const newClient = await self.clients.openWindow(url);
      
      // Aguardar carregamento e enviar dados
      if (newClient) {
        setTimeout(() => {
          newClient.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: url,
            data: data
          });
        }, 1000);
      }
    }
  } catch (error) {
    console.error('[SW] Erro ao processar clique na notificação:', error);
    // Tentar abrir a URL mesmo em caso de erro
    if (self.clients.openWindow) {
      self.clients.openWindow(url);
    }
  }
}

// Notificação fechada
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
  
  // Analytics ou limpeza se necessário
  const data = event.notification.data || {};
  if (data.trackClose) {
    // Implementar tracking de fechamento
  }
});

// ==================== COMUNICAÇÃO COM CLIENTES ====================
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'SYNC_REQUEST':
      self.registration.sync.register(payload.tag);
      break;
      
    default:
      console.log('[SW] Tipo de mensagem desconhecido:', type);
  }
});

// Limpar todos os caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] Todos os caches limpos');
}

// ==================== LOGS E MONITORAMENTO ====================
console.log(`[SW] Service Worker versão ${CACHE_VERSION} carregado`);
console.log('[SW] Recursos estáticos:', STATIC_ASSETS.length);
console.log('[SW] Padrões de cache dinâmico:', DYNAMIC_CACHE_PATTERNS.length);
console.log('[SW] Padrões nunca cachear:', NEVER_CACHE_PATTERNS.length);
