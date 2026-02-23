/**
 * Web Push API para iOS
 * Funciona em PWAs instalados no iOS 16.4+
 */

import { getFirestore, collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

class WebPushIOS {
    constructor() {
        this.subscription = null;
        this.init();
    }

    async init() {
        try {
            console.log('🍎 [iOS] Inicializando Web Push...');

            // Verificar se é iOS ou Android
            const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            const isAndroid = /Android/.test(navigator.userAgent);
            
            console.log('🍎 [iOS] User Agent:', navigator.userAgent);
            console.log('🍎 [iOS] Platform:', navigator.platform);
            console.log('🍎 [iOS] É iOS?', isIOS);
            console.log('🍎 [iOS] É Android?', isAndroid);
            
            // Aceitar iOS ou Android (Web Push funciona em ambos)
            if (!isIOS && !isAndroid) {
                console.log('🍎 [iOS] Não é iOS nem Android, pulando...');
                return;
            }

            console.log('📱 [Web Push] Dispositivo móvel detectado');

            // Verificar suporte a notificações
            if (!('Notification' in window)) {
                console.log('❌ [Web Push] Notificações não suportadas');
                return;
            }

            // Verificar suporte a Service Worker
            if (!('serviceWorker' in navigator)) {
                console.log('❌ [Web Push] Service Worker não suportado');
                return;
            }

            // Verificar suporte a Push API
            if (!('PushManager' in window)) {
                console.log('❌ [Web Push] Push API não suportada');
                return;
            }

            console.log('✅ [Web Push] Todos os recursos suportados');
            console.log('✅ [Web Push] Permissão atual:', Notification.permission);

            // Aguardar permissão
            if (Notification.permission === 'granted') {
                console.log('✅ [Web Push] Permissão já concedida - registrando...');
                await this.subscribe();
            } else if (Notification.permission === 'default') {
                console.log('⏳ [Web Push] Aguardando permissão...');
            } else {
                console.log('❌ [Web Push] Permissão negada');
            }

        } catch (error) {
            console.error('❌ [Web Push] Erro ao inicializar:', error);
            console.error('❌ [Web Push] Stack:', error.stack);
        }
    }

    async subscribe() {
        try {
            console.log('📝 [iOS] Registrando subscription...');

            // Aguardar Service Worker estar pronto
            const registration = await navigator.serviceWorker.ready;
            console.log('✅ [iOS] Service Worker pronto');

            // Verificar se já existe subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                console.log('📝 [iOS] Criando nova subscription...');
                
                // Criar nova subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array('BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg')
                });

                console.log('✅ [iOS] Subscription criada');
            } else {
                console.log('✅ [iOS] Subscription já existe');
            }

            this.subscription = subscription;

            // Salvar no Firestore
            await this.saveSubscription(subscription);

            console.log('✅ [iOS] Subscription salva com sucesso!');

        } catch (error) {
            console.error('❌ [iOS] Erro ao criar subscription:', error);
            console.error('❌ [iOS] Detalhes:', error.message);
        }
    }

    async saveSubscription(subscription) {
        try {
            console.log('💾 [Web Push] Salvando subscription no Firestore...');

            // Converter subscription para JSON
            const subscriptionJSON = subscription.toJSON();
            
            // Criar ID único baseado no endpoint
            const subscriptionId = this.hashString(subscriptionJSON.endpoint);
            console.log('🔑 [Web Push] Subscription ID:', subscriptionId);
            
            // Detectar plataforma
            const isAndroid = /Android/.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : 'ios';

            // Salvar no Firestore
            await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), {
                subscription: subscriptionJSON,
                endpoint: subscriptionJSON.endpoint,
                platform: platform,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent
            }, { merge: true });

            console.log(`✅ [Web Push] Subscription salva no Firestore (${platform})`);

        } catch (error) {
            console.error('❌ [Web Push] Erro ao salvar subscription:', error);
            throw error;
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'sub_' + Math.abs(hash).toString(36);
    }

    async onPermissionGranted() {
        console.log('🍎 [iOS] onPermissionGranted chamado!');
        await this.subscribe();
    }
}

// Criar instância global
const webPushIOS = new WebPushIOS();

// Expor globalmente
window.webPushIOS = webPushIOS;

export default webPushIOS;
