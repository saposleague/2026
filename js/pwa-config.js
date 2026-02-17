/**
 * Configurações centralizadas do PWA
 * Arquivo de configuração para personalizar comportamentos do PWA
 */

export const PWA_CONFIG = {
  // Informações básicas
  APP_NAME: 'Sapos League',
  APP_VERSION: '2.1.0',
  APP_DESCRIPTION: 'Sistema completo de gerenciamento do campeonato Sapos League 2026',
  
  // Service Worker
  SW_URL: '/sw.js',
  SW_SCOPE: '/',
  
  // Cache
  CACHE_VERSION: '2.1.0',
  STATIC_CACHE_NAME: 'sapos-league-static-v2.1.0',
  DYNAMIC_CACHE_NAME: 'sapos-league-dynamic-v2.1.0',
  MAX_DYNAMIC_CACHE_SIZE: 50,
  
  // Notificações
  NOTIFICATION_ICON: '/web-app-manifest-192x192.png',
  NOTIFICATION_BADGE: '/favicon-96x96.png',
  NOTIFICATION_TAG: 'sapos-league',
  NOTIFICATION_VIBRATE: [200, 100, 200, 100, 200],
  
  // Instalação
  INSTALL_PROMPT_DELAY: 2000, // ms
  INSTALL_DISMISS_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  INSTALL_AUTO_HIDE_DELAY: 30000, // 30 segundos
  
  // Atualização
  UPDATE_CHECK_INTERVAL: 60000, // 1 minuto
  UPDATE_NOTIFICATION_DURATION: 15000, // 15 segundos
  
  // Recursos offline
  OFFLINE_PAGE: '/offline.html',
  OFFLINE_FALLBACK_IMAGE: '/web-app-manifest-192x192.png',
  
  // URLs que nunca devem ser cacheadas
  NEVER_CACHE_PATTERNS: [
    /^https:\/\/.*\.firebaseio\.com/,
    /^https:\/\/.*\.googleapis\.com\/.*firebase/,
    /^https:\/\/.*\.gstatic\.com\/.*firebase/,
    /\/api\//,
    /\?.*nocache/,
    /\/admin\/api\//
  ],
  
  // URLs para cache dinâmico
  DYNAMIC_CACHE_PATTERNS: [
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/,
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\.(?:css|js)$/
  ],
  
  // Recursos estáticos essenciais
  STATIC_ASSETS: [
    '/',
    '/index.html',
    '/painel.html',
    '/admin.html',
    '/offline.html',
    '/css/index.css',
    '/css/painel.css',
    '/css/admin.css',
    '/css/components.css',
    '/css/dark-mode-colors.css',
    '/css/favicon-display.css',
    '/css/painel-dark-mode.css',
    '/js/index.js',
    '/js/painel.js',
    '/js/admin.js',
    '/js/firebase-config.js',
    '/js/dark-mode-logic.js',
    '/js/auth-manager.js',
    '/js/pwa-complete.js',
    '/js/pwa-install.js',
    '/js/pwa-config.js',
    '/js/dynamic-favicon.js',
    '/js/back-to-home.js',
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-48x48.png',
    '/favicon-96x96.png',
    '/apple-touch-icon.png',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
    '/site.webmanifest',
    '/browserconfig.xml'
  ],
  
  // Configurações de sincronização
  SYNC_TAGS: {
    GAME_DATA: 'sync-game-data',
    NOTIFICATIONS: 'sync-notifications',
    CLEANUP_CACHE: 'cleanup-cache'
  },
  
  // Configurações de debug
  DEBUG: {
    ENABLED: true,
    MAX_LOGS: 50,
    LOG_LEVELS: ['LOG', 'WARN', 'ERROR']
  },
  
  // Configurações específicas por navegador
  BROWSER_SPECIFIC: {
    SAFARI_IOS: {
      NOTIFICATION_AUTO_CLOSE: 8000,
      REQUIRES_USER_INTERACTION: true
    },
    CHROME: {
      SUPPORTS_BACKGROUND_SYNC: true,
      SUPPORTS_PUSH_MANAGER: true
    },
    FIREFOX: {
      NOTIFICATION_REQUIRE_INTERACTION: false
    }
  },
  
  // URLs e endpoints
  URLS: {
    HOME: '/',
    ADMIN: '/painel.html',
    LOGIN: '/admin.html',
    PELADAS: '/pelada/',
    OFFLINE: '/offline.html'
  },
  
  // Mensagens padrão
  MESSAGES: {
    INSTALL_PROMPT: {
      TITLE: 'Instalar App',
      SUBTITLE: 'Acesso rápido e offline'
    },
    UPDATE_AVAILABLE: {
      TITLE: 'Nova versão disponível!',
      SUBTITLE: 'Recarregue para atualizar'
    },
    OFFLINE: {
      TITLE: 'Você está offline',
      MESSAGE: 'Verifique sua conexão e tente novamente'
    },
    NOTIFICATIONS: {
      WELCOME: {
        TITLE: '⚽ Sapos League',
        BODY: 'Notificações ativadas! Você receberá avisos sobre jogos.'
      },
      GAME_TODAY: {
        TITLE: '⚽ Jogo Hoje',
        BODY_TEMPLATE: '{timeA} x {timeB} às {hora}'
      }
    }
  }
};

// Função para obter configuração específica do navegador
export function getBrowserConfig() {
  const ua = navigator.userAgent;
  
  if (/Safari/.test(ua) && /iPhone|iPad|iPod/.test(ua)) {
    return PWA_CONFIG.BROWSER_SPECIFIC.SAFARI_IOS;
  } else if (/Chrome/.test(ua) && !/Edge|Edg/.test(ua)) {
    return PWA_CONFIG.BROWSER_SPECIFIC.CHROME;
  } else if (/Firefox/.test(ua)) {
    return PWA_CONFIG.BROWSER_SPECIFIC.FIREFOX;
  }
  
  return {};
}

// Função para verificar se uma URL deve ser cacheada
export function shouldCache(url) {
  const urlObj = new URL(url);
  
  // Verificar se nunca deve ser cacheada
  if (PWA_CONFIG.NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url))) {
    return false;
  }
  
  // Verificar se é recurso estático
  if (PWA_CONFIG.STATIC_ASSETS.includes(urlObj.pathname)) {
    return 'static';
  }
  
  // Verificar se é recurso dinâmico
  if (PWA_CONFIG.DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url))) {
    return 'dynamic';
  }
  
  return false;
}

// Função para obter ícone otimizado por plataforma
export function getOptimalIcon() {
  const ua = navigator.userAgent;
  
  if (/Safari/.test(ua) && /iPhone|iPad|iPod/.test(ua)) {
    return '/apple-touch-icon.png';
  } else if (/Android/.test(ua)) {
    return PWA_CONFIG.NOTIFICATION_ICON;
  } else {
    return PWA_CONFIG.NOTIFICATION_ICON;
  }
}

// Exportar configuração como padrão
export default PWA_CONFIG;

console.log(`📋 PWA Config v${PWA_CONFIG.APP_VERSION} carregado`);