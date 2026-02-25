/**
 * Web Push API para iOS e Android
 * Funciona em PWAs instalados no iOS 16.4+ e Android
 */

import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

class WebPushIOS {
    constructor() {
        this.subscription = null;
        this.init();
    }

    async init() {
        try {
            console.log('📱 [Web Push] Inicializando Web Push...');

            // Verificar se é iOS ou Android
            const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            const isAndroid = /Android/.test(navigator.userAgent);
            
            console.log('📱 [Web Push] Plataforma:', isAndroid ? 'Android' : (isIOS ? 'iOS' : 'Outro'));
            console.log('📱 [Web Push] Verificando suporte...');

            // Verificar suporte a notificações
            if (!('Notification' in window)) {
                console.error('❌ [Web Push] Notificações não suportadas');
                return;
            }

            // Verificar suporte a Service Worker
            if (!('serviceWorker' in navigator)) {
                console.error('❌ [Web Push] Service Worker não suportado');
                return;
            }

            // Verificar suporte a Push API
            if (!('PushManager' in window)) {
                console.error('❌ [Web Push] Push API não suportada');
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
                this.startPermissionMonitoring();
            } else {
                console.warn('❌ [Web Push] Permissão negada');
            }

        } catch (error) {
            console.error('❌ [Web Push] Erro ao inicializar:', error);
        }
    }

    startPermissionMonitoring() {
        console.log('🔄 [Web Push] Iniciando monitoramento de permissão...');
        
        const checkInterval = setInterval(async () => {
            if (Notification.permission === 'granted') {
                console.log('✅ [Web Push] Permissão concedida detectada - registrando...');
                clearInterval(checkInterval);
                await this.subscribe();
            } else if (Notification.permission === 'denied') {
                console.warn('❌ [Web Push] Permissão negada detectada');
                clearInterval(checkInterval);
            }
        }, 1000);

        // Limpar após 30 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('⏱️ [Web Push] Monitoramento encerrado (timeout 30s)');
        }, 30000);
    }

    async subscribe() {
        try {
            console.log('📝 [Web Push] Registrando subscription...');

            if (!('serviceWorker' in navigator)) {
                console.error('❌ [Web Push] Service Worker não disponível');
                return;
            }

            console.log('⏳ [Web Push] Aguardando Service Worker...');
            
            // Aguardar Service Worker estar pronto com timeout
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout aguardando Service Worker')), 10000)
                )
            ]);
            
            console.log('✅ [Web Push] Service Worker pronto');

            if (!registration.pushManager) {
                console.error('❌ [Web Push] PushManager não disponível');
                return;
            }

            console.log('✅ [Web Push] PushManager disponível');
            
            // Verificar se já existe subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                console.log('📝 [Web Push] Criando nova subscription...');
                
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array('BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg')
                    });

                    console.log('✅ [Web Push] Subscription criada!');
                } catch (subscribeError) {
                    console.error('❌ [Web Push] Erro ao criar subscription:', subscribeError);
                    throw subscribeError;
                }
            } else {
                console.log('✅ [Web Push] Subscription já existe');
            }

            this.subscription = subscription;

            // Salvar no Firestore
            console.log('💾 [Web Push] Salvando no Firestore...');
            await this.saveSubscription(subscription);

            console.log('✅ [Web Push] Processo completo finalizado!');

        } catch (error) {
            console.error('❌ [Web Push] Erro ao registrar:', error);
            
            // Tentar novamente após 5 segundos
            console.log('🔄 [Web Push] Tentando novamente em 5s...');
            setTimeout(() => this.subscribe(), 5000);
        }
    }

    async saveSubscription(subscription) {
        try {
            const subscriptionJSON = subscription.toJSON();
            
            if (!subscriptionJSON.endpoint) {
                throw new Error('Subscription sem endpoint');
            }
            
            const subscriptionId = this.hashString(subscriptionJSON.endpoint);
            
            // Detectar plataforma
            const isAndroid = /Android/.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : (isIOS ? 'ios' : 'other');

            const dataToSave = {
                subscription: subscriptionJSON,
                endpoint: subscriptionJSON.endpoint,
                platform: platform,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent,
                browser: this.detectBrowser()
            };

            if (!db) {
                throw new Error('Firestore não inicializado');
            }

            await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), dataToSave, { merge: true });

            console.log(`✅ [Web Push] Subscription salva com sucesso (${platform})`);

        } catch (error) {
            console.error('❌ [Web Push] Erro ao salvar subscription:', error);
            
            if (error.code === 'permission-denied') {
                console.error('💡 [Web Push] Verifique as regras de segurança do Firestore');
            } else if (error.code === 'unavailable') {
                console.error('💡 [Web Push] Verifique a conexão com a internet');
            }
            
            throw error;
        }
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        if (/Chrome/.test(ua) && !/Edge|Edg/.test(ua)) return 'Chrome';
        if (/Firefox/.test(ua)) return 'Firefox';
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
        if (/Edge|Edg/.test(ua)) return 'Edge';
        if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
        return 'Unknown';
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
        console.log('📱 [Web Push] onPermissionGranted chamado');
        await this.subscribe();
    }
}

// Criar instância global
const webPushIOS = new WebPushIOS();

// Expor globalmente
window.webPushIOS = webPushIOS;

export default webPushIOS;
