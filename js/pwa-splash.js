/**
 * pwa-splash.js
 * Controla o splash screen customizado para PWA instalado (iOS e Android).
 * Deve ser carregado antes do dynamic-favicon.js, logo após o elemento
 * #pwa-splash-screen e #main-app-content existirem no DOM.
 */
(function () {
  const isStandalone =
    window.navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const splash = document.getElementById('pwa-splash-screen');
  const mainContent = document.getElementById('main-app-content');

  if (!splash || !mainContent) return;

  if (isStandalone && (isIOS || isAndroid)) {
    splash.style.display = 'flex';

    function hidePWASplash() {
      splash.classList.add('pwa-splash-fade-out');
      setTimeout(function () {
        splash.style.display = 'none';
        mainContent.classList.remove('main-content-hidden');
        mainContent.classList.add('main-content-visible');
      }, 500);
    }

    setTimeout(hidePWASplash, 2000);
  } else {
    splash.style.display = 'none';
    mainContent.classList.remove('main-content-hidden');
    mainContent.classList.add('main-content-visible');
  }
})();
