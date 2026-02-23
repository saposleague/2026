// Firebase Messaging Service Worker
// Este arquivo é necessário para receber notificações push em background

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyB27qpKx8uKwqBJbBMMvxYfaY43WxOhmBk",
  authDomain: "sapos-league.firebaseapp.com",
  projectId: "sapos-league",
  storageBucket: "sapos-league.appspot.com",
  messagingSenderId: "409318703000",
  appId: "1:409318703000:web:b220af01b78490773cb5ed"
});

const messaging = firebase.messaging();

// Handler para mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);

  const notificationTitle = payload.notification?.title || 'Sapos League';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação',
    icon: 'https://sapos-league.web.app/images/web-app-manifest-192x192.png',
    badge: 'https://sapos-league.web.app/images/web-app-manifest-192x192.png',
    tag: payload.notification?.tag || 'sapos-league',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    image: payload.notification?.image || payload.data?.icon
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
