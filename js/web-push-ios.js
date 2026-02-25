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
            console.log('📱 [Web Push] Inicializando Web Push...');

            // Verificar se é iOS ou Android
            const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            const isAndroid = /Android/.test(navigator.userAgent);
            
            console.log('📱 [Web Push] User Agent:', navigator.userAgent);
            console.log('📱 [Web Push] Platform:', navigator.platform);
            console.log('📱 [Web Push] É iOS?', isIOS);
            console.log('📱 [Web Push] É Android?', isAndroid);
            
            // Web Push funciona em iOS, Android e outros navegadores modernos
            // Não vamos restringir por plataforma, apenas verificar suporte
            console.log('📱 [Web Push] Verificando suporte a notificações...');

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
                // Monitorar mudanças de permissão
                this.startPermissionMonitoring();
            } else {
                console.log('❌ [Web Push] Permissão negada');
            }

        } catch (error) {
            console.error('❌ [Web Push] Erro ao inicializar:', error);
            console.error('❌ [Web Push] Stack:', error.stack);
        }
    }

    startPermissionMonitoring() {
        // Verificar permissão periodicamente (fallback)
        const checkInterval = setInterval(async () => {
            if (Notification.permission === 'granted') {
                console.log('✅ [Web Push] Permissão concedida detectada - registrando...');
                clearInterval(checkInterval);
                await this.subscribe();
            } else if (Notification.permission === 'denied') {
                console.log('❌ [Web Push] Permissão negada detectada');
                clearInterval(checkInterval);
            }
        }, 1000);

        // Limpar após 30 segundos
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    async subscribe() {
        try {
            console.log('📝 [Web Push] Registrando subscription...');

            // Aguardar Service Worker estar pronto
            const registration = await navigator.serviceWorker.ready;
            console.log('✅ [Web Push] Service Worker pronto');

            // Verificar se já existe subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                console.log('📝 [Web Push] Criando nova subscription...');
                
                // Criar nova subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array('BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg')
                });

                console.log('✅ [Web Push] Subscription criada');
            } else {
                console.log('✅ [Web Push] Subscription já existe');
            }

            this.subscription = subscription;
            console.log('📋 [Web Push] Subscription endpoint:', subscription.endpoint);

            // Salvar no Firestore
            await this.saveSubscription(subscription);

            console.log('✅ [Web Push] Subscription salva com sucesso!');

        } catch (error) {
            console.error('❌ [Web Push] Erro ao criar subscription:', error);
            console.error('❌ [Web Push] Detalhes:', error.message);
            console.error('❌ [Web Push] Stack:', error.stack);
        }
    }

    async saveSubscription(subscription) {
        try {
            console.log('💾 [Web Push] Salvando subscription no Firestore...');
            console.log('📋 [Web Push] Subscription completa:', JSON.stringify(subscription.toJSON(), null, 2));

            // Converter subscription para JSON
            const subscriptionJSON = subscription.toJSON();
            console.log('📋 [Web Push] Subscription JSON:', subscriptionJSON);
            
            // Criar ID único baseado no endpoint
            const subscriptionId = this.hashString(subscriptionJSON.endpoint);
            console.log('🔑 [Web Push] Subscription ID:', subscriptionId);
            console.log('🔗 [Web Push] Endpoint:', subscriptionJSON.endpoint);
            
            // Detectar plataforma
            const isAndroid = /Android/.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : (isIOS ? 'ios' : 'other');
            console.log('📱 [Web Push] Plataforma detectada:', platform);

            // Preparar dados para salvar
            const dataToSave = {
                subscription: subscriptionJSON,
                endpoint: subscriptionJSON.endpoint,
                platform: platform,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent
            };
            
            console.log('💾 [Web Push] Dados a salvar:', dataToSave);
            console.log('💾 [Web Push] Salvando no documento: webPushSubscriptions/' + subscriptionId);

            // Salvar no Firestore
            await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), dataToSave, { merge: true });

            console.log(`✅ [Web Push] Subscription salva no Firestore com sucesso (${platform})`);
            console.log(`✅ [Web Push] Documento ID: ${subscriptionId}`);

        } catch (error) {
            console.error('❌ [Web Push] Erro ao salvar subscription:', error);
            console.error('❌ [Web Push] Código do erro:', error.code);
            console.error('❌ [Web Push] Mensagem:', error.message);
            console.error('❌ [Web Push] Stack:', error.stack);
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
        console.log('📱 [Web Push] onPermissionGranted chamado!');
        console.log('📱 [Web Push] Permissão concedida - registrando subscription...');
        await this.subscribe();
    }
}

// Criar instância global
const webPushIOS = new WebPushIOS();

// Expor globalmente
window.webPushIOS = webPushIOS;

export default webPushIOS;
