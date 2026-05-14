// debug.js
// Lógica da página de debug de notificações push

import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

// Elementos
const logsDiv = document.getElementById('logs');

// Função de log
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;

    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Detectar informações do dispositivo
function detectDevice() {
    const ua = navigator.userAgent;
    const isAndroid = /Android/.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isPWA = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    document.getElementById('user-agent').textContent = ua;
    document.getElementById('platform').textContent = navigator.platform;
    document.getElementById('is-android').innerHTML = isAndroid ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-error">❌ Não</span>';
    document.getElementById('is-ios').innerHTML = isIOS ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-error">❌ Não</span>';
    document.getElementById('is-pwa').innerHTML = isPWA ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-error">❌ Não</span>';

    log(`Dispositivo detectado: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Outro'}`);
    log(`PWA: ${isPWA ? 'Sim' : 'Não'}`);
}

// Verificar suporte a APIs
function checkAPIs() {
    const hasNotification = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;
    const permission = hasNotification ? Notification.permission : 'não suportado';

    document.getElementById('has-notification').innerHTML = hasNotification ? '<span class="status-ok">✅ Suportado</span>' : '<span class="status-error">❌ Não suportado</span>';
    document.getElementById('has-sw').innerHTML = hasSW ? '<span class="status-ok">✅ Suportado</span>' : '<span class="status-error">❌ Não suportado</span>';
    document.getElementById('has-push').innerHTML = hasPush ? '<span class="status-ok">✅ Suportado</span>' : '<span class="status-error">❌ Não suportado</span>';

    let permissionHTML;
    if (permission === 'granted') {
        permissionHTML = '<span class="status-ok">✅ Concedida</span>';
    } else if (permission === 'denied') {
        permissionHTML = '<span class="status-error">❌ Negada</span>';
    } else if (permission === 'default') {
        permissionHTML = '<span class="status-warning">⏳ Não solicitada</span>';
    } else {
        permissionHTML = '<span class="status-error">❌ Não suportado</span>';
    }
    document.getElementById('permission').innerHTML = permissionHTML;

    log(`APIs: Notification=${hasNotification}, SW=${hasSW}, Push=${hasPush}`);
    log(`Permissão: ${permission}`);
}

// Solicitar permissão
async function requestPermission() {
    log('Solicitando permissão...', 'info');

    try {
        const permission = await Notification.requestPermission();
        log(`Permissão: ${permission}`, permission === 'granted' ? 'info' : 'error');
        checkAPIs();

        if (permission === 'granted') {
            log('✅ Permissão concedida! Agora você pode criar uma subscription.', 'info');
        }
    } catch (error) {
        log(`❌ Erro ao solicitar permissão: ${error.message}`, 'error');
    }
}

// Criar subscription
async function createSubscription() {
    log('Criando subscription...', 'info');

    try {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker não suportado');
        }

        log('Aguardando Service Worker...', 'info');
        const registration = await navigator.serviceWorker.ready;
        log('✅ Service Worker pronto', 'info');

        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            log('⚠️ Subscription já existe', 'warn');
            log(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`, 'info');
        } else {
            log('Criando nova subscription...', 'info');

            const vapidKey = 'BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg';

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            log('✅ Subscription criada!', 'info');
            log(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`, 'info');
        }

        log('Salvando no Firestore...', 'info');
        const subscriptionJSON = subscription.toJSON();
        const subscriptionId = hashString(subscriptionJSON.endpoint);

        const isAndroid = /Android/.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const platform = isAndroid ? 'android' : (isIOS ? 'ios' : 'other');

        await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), {
            subscription: subscriptionJSON,
            endpoint: subscriptionJSON.endpoint,
            platform: platform,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            userAgent: navigator.userAgent
        }, { merge: true });

        log(`✅ Salvo no Firestore! ID: ${subscriptionId}`, 'info');
        log(`Plataforma: ${platform}`, 'info');

    } catch (error) {
        log(`❌ Erro: ${error.message}`, 'error');
        console.error(error);
    }
}

// Verificar subscription
async function checkSubscription() {
    log('Verificando subscription...', 'info');

    try {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker não suportado');
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            log('✅ Subscription encontrada!', 'info');
            log(`Endpoint: ${subscription.endpoint}`, 'info');

            const subscriptionJSON = subscription.toJSON();
            log(`Keys: ${JSON.stringify(subscriptionJSON.keys)}`, 'info');
        } else {
            log('❌ Nenhuma subscription encontrada', 'warn');
        }
    } catch (error) {
        log(`❌ Erro: ${error.message}`, 'error');
    }
}

// Testar notificação local
async function testNotification() {
    log('Testando notificação local...', 'info');

    try {
        if (Notification.permission !== 'granted') {
            throw new Error('Permissão não concedida');
        }

        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification('🔔 Teste de Notificação', {
            body: 'Esta é uma notificação de teste do Sapos League!',
            icon: './images/web-app-manifest-192x192.png',
            badge: './images/favicon-96x96.png',
            vibrate: [200, 100, 200],
            tag: 'test-notification'
        });

        log('✅ Notificação enviada!', 'info');
    } catch (error) {
        log(`❌ Erro: ${error.message}`, 'error');
    }
}

// Funções auxiliares
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'sub_' + Math.abs(hash).toString(36);
}

// Event listeners
document.getElementById('btn-request-permission').addEventListener('click', requestPermission);
document.getElementById('btn-subscribe').addEventListener('click', createSubscription);
document.getElementById('btn-check-subscription').addEventListener('click', checkSubscription);
document.getElementById('btn-test-notification').addEventListener('click', testNotification);
document.getElementById('btn-clear-logs').addEventListener('click', () => {
    logsDiv.innerHTML = '';
    log('Logs limpos', 'info');
});

// Inicializar
detectDevice();
checkAPIs();
log('Debug page carregada', 'info');
