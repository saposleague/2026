/**
 * Firebase Cloud Messaging - Notificações Push
 * Permite receber notificações mesmo com o app fechado
 */

import { app } from './firebase-config.js';
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const db = getFirestore(app);

class FCMNotifications {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.init();
    }

    async init() {
        try {
            console.log('🔔 [FCM] FCM desabilitado - usando Web Push API para todos os dispositivos');
            return;
            
            // Código FCM desabilitado - Web Push funciona melhor
            /*
            console.log('🔔 [FCM] Iniciando...');
            
            // Verificar se o navegador suporta notificações
            if (!('Notification' in window)) {
                console.log('❌ [FCM] Este navegador não suporta notificações');
                return;
            }

            // Verificar se o Service Worker está disponível
            if (!('serviceWorker' in navigator)) {
                console.log('❌ [FCM] Service Worker não disponível');
                return;
            }

            // Verificar se é Android ou Chrome (FCM é para esses)
            const isAndroid = /Android/.test(navigator.userAgent);
            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
            const isEdge = /Edge|Edg/.test(navigator.userAgent);
            
            console.log('🔔 [FCM] User Agent:', navigator.userAgent);
            console.log('🔔 [FCM] É Android?', isAndroid);
            console.log('🔔 [FCM] É Chrome?', isChrome);
            console.log('🔔 [FCM] É Edge?', isEdge);
            
            // FCM deve ser usado em Android, Chrome e Edge
            if (!isAndroid && !isChrome && !isEdge) {
                console.log('❌ [FCM] Não é Android/Chrome/Edge - pulando FCM');
                return;
            }

            console.log('🔔 [FCM] Inicializando Firebase Cloud Messaging...');
            console.log('🔔 [FCM] Permissão atual:', Notification.permission);

            // Inicializar Firebase Messaging
            this.messaging = getMessaging(app);
            console.log('✅ [FCM] Messaging inicializado');

            // Configurar listener para mensagens em foreground
            this.setupForegroundListener();

            // Solicitar permissão e registrar token
            await this.requestPermissionAndRegisterToken();
            */

        } catch (error) {
            console.error('❌ [FCM] Erro ao inicializar:', error);
        }
    }

    async requestPermissionAndRegisterToken() {
        try {
            console.log('🔔 [FCM] Verificando permissão...');
            console.log('🔔 [FCM] Status:', Notification.permission);
            
            // Verificar permissão atual
            if (Notification.permission === 'granted') {
                console.log('✅ [FCM] Permissão já concedida - registrando token...');
                await this.registerToken();
            } else if (Notification.permission === 'default') {
                console.log('⏳ [FCM] Aguardando permissão do usuário...');
                // A permissão será solicitada pelo pwa-complete.js
                // Quando concedida, este método será chamado novamente
            } else {
                console.log('❌ [FCM] Permissão negada');
            }
        } catch (error) {
            console.error('❌ [FCM] Erro ao solicitar permissão:', error);
        }
    }

    async registerToken() {
        try {
            console.log('📝 [FCM] Iniciando registro de token...');

            // Garantir que o Service Worker está registrado
            const registration = await navigator.serviceWorker.ready;
            console.log('✅ [FCM] Service Worker pronto:', registration.scope);

            // Obter token FCM
            const token = await getToken(this.messaging, {
                vapidKey: 'BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg',
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log('✅ [FCM] Token obtido:', token.substring(0, 30) + '...');
                this.currentToken = token;

                // Salvar token no Firestore
                console.log('💾 [FCM] Salvando token no Firestore...');
                await this.saveTokenToFirestore(token);

                console.log('✅ [FCM] Token salvo com sucesso!');
            } else {
                console.log('❌ [FCM] Não foi possível obter o token');
            }

        } catch (error) {
            console.error('❌ [FCM] Erro ao registrar token:', error);
            console.error('❌ [FCM] Código do erro:', error.code);
            console.error('❌ [FCM] Mensagem:', error.message);
            
            if (error.code === 'messaging/permission-blocked') {
                console.log('⚠️ [FCM] Permissão bloqueada pelo usuário');
            }
        }
    }

    async saveTokenToFirestore(token) {
        try {
            console.log('💾 [FCM] Preparando para salvar no Firestore...');
            
            // Criar ID único baseado no token (hash simples)
            const tokenId = this.hashToken(token);
            console.log('🔑 [FCM] Token ID:', tokenId);

            // Salvar no Firestore
            console.log('💾 [FCM] Salvando documento...');
            await setDoc(doc(db, 'fcmTokens', tokenId), {
                token: token,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }, { merge: true });

            console.log('✅ [FCM] Documento salvo com sucesso!');

        } catch (error) {
            console.error('❌ [FCM] Erro ao salvar no Firestore:', error);
            console.error('❌ [FCM] Código:', error.code);
            console.error('❌ [FCM] Mensagem:', error.message);
            throw error;
        }
    }

    hashToken(token) {
        // Hash simples para criar ID único
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
            const char = token.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'token_' + Math.abs(hash).toString(36);
    }

    setupForegroundListener() {
        // Listener para mensagens recebidas quando o app está aberto
        onMessage(this.messaging, (payload) => {
            console.log('📨 Mensagem recebida em foreground:', payload);

            const { notification, data } = payload;

            if (notification) {
                // Mostrar notificação customizada
                this.showNotification(
                    notification.title,
                    notification.body,
                    notification.icon,
                    data
                );
            }
        });
    }

    showNotification(title, body, icon, data) {
        // Verificar se temos permissão
        if (Notification.permission !== 'granted') {
            return;
        }

        // Criar notificação
        const notification = new Notification(title, {
            body: body,
            icon: icon || '/images/web-app-manifest-192x192.png',
            badge: '/images/web-app-manifest-192x192.png',
            tag: 'sapos-league-fcm',
            data: data,
            vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
            notification.close();
            
            // Navegar para URL se fornecida
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                window.focus();
            }
        };
    }

    // Método público para ser chamado após permissão concedida
    async onPermissionGranted() {
        console.log('🔔 [FCM] onPermissionGranted chamado!');
        console.log('🔔 [FCM] Permissão concedida - registrando token...');
        await this.registerToken();
    }
}

// Criar instância global
const fcmNotifications = new FCMNotifications();

// Expor globalmente
window.fcmNotifications = fcmNotifications;

export default fcmNotifications;
