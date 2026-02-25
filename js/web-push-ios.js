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

            // Verificar se Service Worker está disponível
            if (!('serviceWorker' in navigator)) {
                console.error('❌ [Web Push] Service Worker não disponível');
                return;
            }

            console.log('⏳ [Web Push] Aguardando Service Worker estar pronto...');
            
            // Aguardar Service Worker estar pronto com timeout
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout aguardando Service Worker')), 10000)
                )
            ]);
            
            console.log('✅ [Web Push] Service Worker pronto');
            console.log('📋 [Web Push] Registration scope:', registration.scope);
            console.log('📋 [Web Push] Registration active:', !!registration.active);

            // Verificar se pushManager está disponível
            if (!registration.pushManager) {
                console.error('❌ [Web Push] PushManager não disponível no registration');
                return;
            }

            console.log('✅ [Web Push] PushManager disponível');

            // Verificar se já existe subscription
            console.log('🔍 [Web Push] Verificando subscription existente...');
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                console.log('📝 [Web Push] Criando nova subscription...');
                console.log('🔑 [Web Push] Usando applicationServerKey...');
                
                try {
                    // Criar nova subscription
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array('BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg')
                    });

                    console.log('✅ [Web Push] Subscription criada com sucesso!');
                } catch (subscribeError) {
                    console.error('❌ [Web Push] Erro ao criar subscription:', subscribeError);
                    console.error('❌ [Web Push] Nome do erro:', subscribeError.name);
                    console.error('❌ [Web Push] Mensagem:', subscribeError.message);
                    throw subscribeError;
                }
            } else {
                console.log('✅ [Web Push] Subscription já existe');
            }

            this.subscription = subscription;
            console.log('📋 [Web Push] Subscription endpoint:', subscription.endpoint);
            console.log('📋 [Web Push] Subscription keys:', subscription.toJSON().keys);

            // Salvar no Firestore
            console.log('💾 [Web Push] Iniciando salvamento no Firestore...');
            await this.saveSubscription(subscription);

            console.log('✅ [Web Push] Processo completo de subscription finalizado!');

        } catch (error) {
            console.error('❌ [Web Push] Erro ao criar subscription:', error);
            console.error('❌ [Web Push] Nome do erro:', error.name);
            console.error('❌ [Web Push] Detalhes:', error.message);
            console.error('❌ [Web Push] Stack:', error.stack);
            
            // Tentar novamente após 5 segundos
            console.log('🔄 [Web Push] Tentando novamente em 5 segundos...');
            setTimeout(() => this.subscribe(), 5000);
        }
    }

    async saveSubscription(subscription) {
        try {
            console.log('💾 [Web Push] Salvando subscription no Firestore...');
            console.log('📋 [Web Push] Subscription completa:', JSON.stringify(subscription.toJSON(), null, 2));

            // Converter subscription para JSON
            const subscriptionJSON = subscription.toJSON();
            console.log('📋 [Web Push] Subscription JSON:', subscriptionJSON);
            
            // Verificar se tem endpoint
            if (!subscriptionJSON.endpoint) {
                console.error('❌ [Web Push] Subscription sem endpoint!');
                throw new Error('Subscription sem endpoint');
            }
            
            // Criar ID único baseado no endpoint
            const subscriptionId = this.hashString(subscriptionJSON.endpoint);
            console.log('🔑 [Web Push] Subscription ID:', subscriptionId);
            console.log('� [Web Push] Endpoint:', subscriptionJSON.endpoint);
            
            // Detectar plataforma
            const isAndroid = /Android/.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : (isIOS ? 'ios' : 'other');
            console.log('📱 [Web Push] Plataforma detectada:', platform);
            console.log('📱 [Web Push] User Agent:', navigator.userAgent);

            // Preparar dados para salvar
            const dataToSave = {
                subscription: subscriptionJSON,
                endpoint: subscriptionJSON.endpoint,
                platform: platform,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent,
                browser: this.detectBrowser()
            };
            
            console.log('💾 [Web Push] Dados a salvar:', JSON.stringify(dataToSave, null, 2));
            console.log('💾 [Web Push] Salvando no documento: webPushSubscriptions/' + subscriptionId);
            console.log('💾 [Web Push] Firestore DB:', db ? 'Inicializado' : 'NÃO inicializado');

            // Verificar se Firestore está disponível
            if (!db) {
                console.error('❌ [Web Push] Firestore não inicializado!');
                throw new Error('Firestore não inicializado');
            }

            // Salvar no Firestore
            console.log('💾 [Web Push] Chamando setDoc...');
            await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), dataToSave, { merge: true });

            console.log(`✅ [Web Push] Subscription salva no Firestore com sucesso (${platform})`);
            console.log(`✅ [Web Push] Documento ID: ${subscriptionId}`);
            console.log(`✅ [Web Push] Endpoint: ${subscriptionJSON.endpoint}`);

        } catch (error) {
            console.error('❌ [Web Push] Erro ao salvar subscription:', error);
            console.error('❌ [Web Push] Nome do erro:', error.name);
            console.error('❌ [Web Push] Código do erro:', error.code);
            console.error('❌ [Web Push] Mensagem:', error.message);
            console.error('❌ [Web Push] Stack:', error.stack);
            
            // Tentar diagnosticar o problema
            if (error.code === 'permission-denied') {
                console.error('❌ [Web Push] PROBLEMA: Permissão negada no Firestore!');
                console.error('💡 [Web Push] Verifique as regras de segurança do Firestore');
            } else if (error.code === 'unavailable') {
                console.error('❌ [Web Push] PROBLEMA: Firestore indisponível (sem conexão?)');
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
