// PWA Installation Handler - Versão Robusta
let deferredPrompt;
let installButton;
let updateAvailable = false;

// ==================== SERVICE WORKER REGISTRATION ====================
let swRegistrationPromise = null;

if ('serviceWorker' in navigator) {
  // Registrar imediatamente, não aguardar load
  swRegistrationPromise = (async () => {
    try {
      console.log('🔄 Registrando Service Worker...');
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('✅ Service Worker registrado:', registration.scope);
      
      // Aguardar ativação se necessário
      if (registration.installing) {
        console.log('⏳ Aguardando ativação do Service Worker...');
        await new Promise((resolve) => {
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              console.log('✅ Service Worker ativado!');
              resolve();
            }
          });
        });
      } else if (registration.active) {
        console.log('✅ Service Worker já ativo');
      }
      
      // Configurar listeners de atualização
      setupUpdateHandlers(registration);
      
      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 60000); // Verificar a cada minuto
      
      return registration;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
      throw error;
    }
  })();
  
  // Também registrar no load como fallback
  window.addEventListener('load', async () => {
    try {
      await swRegistrationPromise;
      
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  });
}

// ==================== GERENCIAMENTO DE ATUALIZAÇÕES ====================
function setupUpdateHandlers(registration) {
  // Nova versão encontrada
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    console.log('🔄 Nova versão encontrada');
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('✨ Nova versão instalada');
        updateAvailable = true;
        showUpdateNotification();
      }
    });
  });
  
  // Escutar mensagens do Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, version } = event.data;
    
    switch (type) {
      case 'SW_UPDATED':
        console.log(`🔄 Service Worker atualizado para versão ${version}`);
        showUpdateNotification();
        break;
        
      case 'NOTIFICATION_CLICKED':
        handleNotificationData(event.data);
        break;
        
      case 'DATA_SYNCED':
        console.log('📊 Dados sincronizados');
        // Atualizar interface se necessário
        break;
    }
  });
}

// ==================== INSTALAÇÃO DO PWA ====================
// Aguardar Service Worker antes de processar beforeinstallprompt
window.addEventListener('beforeinstallprompt', async (e) => {
  console.log('💾 Prompt de instalação capturado - aguardando Service Worker...');
  e.preventDefault();
  
  // Aguardar Service Worker estar pronto
  if (swRegistrationPromise) {
    try {
      await swRegistrationPromise;
      console.log('✅ Service Worker pronto - processando prompt de instalação');
    } catch (error) {
      console.error('❌ Erro ao aguardar Service Worker:', error);
    }
  }
  
  deferredPrompt = e;
  showInstallButton();
});

// Criar botão de instalação avançado
function showInstallButton() {
  if (document.getElementById('pwa-install-button')) return;

  installButton = document.createElement('div');
  installButton.id = 'pwa-install-button';
  installButton.innerHTML = `
    <div class="install-content">
      <div class="install-icon">📱</div>
      <div class="install-text">
        <div class="install-title">Instalar App</div>
        <div class="install-subtitle">Acesso rápido e offline</div>
      </div>
      <div class="install-close">×</div>
    </div>
  `;
  
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    margin: 0 auto;
    background: linear-gradient(135deg, #2e7d32, #4caf50);
    color: white;
    border-radius: 15px;
    box-shadow: 0 8px 25px rgba(46, 125, 50, 0.4);
    z-index: 9999;
    cursor: pointer;
    animation: slideInUp 0.5s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Adicionar estilos internos
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100px); opacity: 0; }
    }
    .install-content {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      gap: 15px;
    }
    .install-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .install-text {
      flex: 1;
    }
    .install-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 2px;
    }
    .install-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }
    .install-close {
      font-size: 20px;
      opacity: 0.7;
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    .install-close:hover {
      opacity: 1;
      background: rgba(255,255,255,0.2);
    }
    #pwa-install-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(46, 125, 50, 0.5);
    }
  `;
  document.head.appendChild(style);

  // Event listeners
  installButton.addEventListener('click', (e) => {
    if (e.target.classList.contains('install-close')) {
      dismissInstallPrompt();
    } else {
      installPWA();
    }
  });

  document.body.appendChild(installButton);
  
  // Auto-dismiss após 30 segundos
  setTimeout(() => {
    if (installButton && installButton.parentNode) {
      dismissInstallPrompt();
    }
  }, 30000);
}

// Instalar PWA
async function installPWA() {
  if (!deferredPrompt) {
    console.log('❌ Prompt não disponível');
    return;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`👤 Instalação ${outcome === 'accepted' ? 'aceita' : 'recusada'}`);
    
    if (outcome === 'accepted') {
      hideInstallButton();
      showSuccessMessage('✅ App instalado com sucesso!');
    }
    
    deferredPrompt = null;
  } catch (error) {
    console.error('❌ Erro na instalação:', error);
  }
}

// Dispensar prompt de instalação
function dismissInstallPrompt() {
  if (installButton) {
    installButton.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.remove();
      }
    }, 300);
  }
  
  // Lembrar que o usuário dispensou
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
}

// Esconder botão de instalação
function hideInstallButton() {
  if (installButton) {
    installButton.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.remove();
      }
    }, 300);
  }
}

// ==================== NOTIFICAÇÕES E FEEDBACK ====================
function showUpdateNotification() {
  // Remover notificação existente
  const existing = document.getElementById('update-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <div class="update-icon">🔄</div>
      <div class="update-text">
        <div class="update-title">Nova versão disponível!</div>
        <div class="update-subtitle">Recarregue para atualizar</div>
      </div>
      <button class="update-button" onclick="reloadApp()">Atualizar</button>
      <div class="update-close" onclick="dismissUpdate()">×</div>
    </div>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    margin: 0 auto;
    background: linear-gradient(135deg, #1976d2, #2196f3);
    color: white;
    border-radius: 15px;
    box-shadow: 0 8px 25px rgba(25, 118, 210, 0.4);
    z-index: 10000;
    animation: slideInDown 0.5s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Estilos internos
  const updateStyle = document.createElement('style');
  updateStyle.textContent = `
    @keyframes slideInDown {
      from { transform: translateY(-100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .update-content {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      gap: 15px;
    }
    .update-icon {
      font-size: 24px;
      animation: spin 2s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .update-text {
      flex: 1;
    }
    .update-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 2px;
    }
    .update-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }
    .update-button {
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .update-button:hover {
      background: rgba(255,255,255,0.3);
    }
    .update-close {
      font-size: 20px;
      opacity: 0.7;
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      transition: all 0.2s ease;
      margin-left: 10px;
    }
    .update-close:hover {
      opacity: 1;
      background: rgba(255,255,255,0.2);
    }
  `;
  document.head.appendChild(updateStyle);

  document.body.appendChild(notification);

  // Auto-dismiss após 15 segundos
  setTimeout(() => {
    if (notification && notification.parentNode) {
      dismissUpdate();
    }
  }, 15000);
}

// Recarregar aplicação
function reloadApp() {
  // Enviar mensagem para o Service Worker pular a espera
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Dispensar notificação de atualização
function dismissUpdate() {
  const notification = document.getElementById('update-notification');
  if (notification) {
    notification.style.animation = 'slideInDown 0.3s ease reverse';
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }
}

// Mostrar mensagem de sucesso
function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #4caf50, #66bb6a);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
    z-index: 10000;
    animation: slideInDown 0.5s ease;
    font-weight: 600;
  `;
  successDiv.textContent = message;

  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// ==================== DETECÇÃO DE INSTALAÇÃO ====================
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalado com sucesso!');
  hideInstallButton();
  showSuccessMessage('✅ App instalado! Agora você pode acessá-lo offline.');
  
  // Analytics ou tracking se necessário
  trackInstallation();
});

// Verificar se já está instalado
function checkIfInstalled() {
  // Verificar se está rodando como PWA
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone) {
    console.log('📱 Rodando como PWA instalado');
    return true;
  }
  
  // Verificar se foi dispensado recentemente
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceDismissed < 7) { // Não mostrar por 7 dias
      return true;
    }
  }
  
  return false;
}

// ==================== FUNCIONALIDADES AUXILIARES ====================
function trackInstallation() {
  // Implementar tracking de instalação se necessário
  console.log('📊 PWA instalado - tracking');
}

function handleNotificationData(data) {
  // Processar dados de notificação clicada
  console.log('🔔 Dados da notificação:', data);
  
  if (data.url && data.url !== window.location.pathname) {
    window.location.href = data.url;
  }
}

// Expor funções globalmente
window.reloadApp = reloadApp;
window.dismissUpdate = dismissUpdate;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 PWA Install Handler Robusto carregado');
  
  // Verificar se deve mostrar prompt de instalação
  if (!checkIfInstalled() && !deferredPrompt) {
    // Aguardar um pouco para o evento beforeinstallprompt
    setTimeout(() => {
      if (deferredPrompt) {
        showInstallButton();
      } else {
        console.log('⚠️ beforeinstallprompt ainda não capturado após 5 segundos');
        console.log('🔍 Verificando Service Worker...');
        
        if (swRegistrationPromise) {
          swRegistrationPromise.then(() => {
            console.log('✅ Service Worker confirmado como ativo');
            console.log('⏳ Aguardando mais 5 segundos por beforeinstallprompt...');
            
            setTimeout(() => {
              if (!deferredPrompt) {
                console.log('❌ beforeinstallprompt não disparou mesmo com SW ativo');
                console.log('💡 Possíveis causas:');
                console.log('   - Chrome DevTools aberto');
                console.log('   - PWA já instalado');
                console.log('   - Cache antigo');
                console.log('   - Manifest com problemas');
              }
            }, 5000);
          }).catch(error => {
            console.error('❌ Service Worker falhou:', error);
          });
        }
      }
    }, 5000);
  }
});

console.log('🚀 PWA Install Handler Robusto carregado');
