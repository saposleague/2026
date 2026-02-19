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
            // Verificar se o navegador suporta notificações
            if (!('Notification' in window)) {
                console.log('❌ Este navegador não suporta notificações');
                return;
            }

            // Verificar se o Service Worker está disponível
            if (!('serviceWorker' in navigator)) {
                console.log('❌ Service Worker não disponível');
                return;
            }

            console.log('🔔 Inicializando Firebase Cloud Messaging...');

            // Inicializar Firebase Messaging
            this.messaging = getMessaging(app);

            // Configurar listener para mensagens em foreground
            this.setupForegroundListener();

            // Solicitar permissão e registrar token
            await this.requestPermissionAndRegisterToken();

        } catch (error) {
            console.error('❌ Erro ao inicializar FCM:', error);
        }
    }

    async requestPermissionAndRegisterToken() {
        try {
            // Verificar permissão atual
            if (Notification.permission === 'granted') {
            console.log('✅ Permissão de notificação já concedida');
                await this.registerToken();
            } else if (Notification.permission === 'default') {
                console.log('⏳ Aguardando permissão do usuário...');
                // A permissão será solicitada pelo pwa-complete.js
                // Quando concedida, este método será chamado novamente
            } else {
                console.log('❌ Permissão de notificação negada');
            }
        } catch (error) {
            console.error('❌ Erro ao solicitar permissão:', error);
        }
    }

    async registerToken() {
        try {
            console.log('📝 Registrando token FCM...');

            // Obter token FCM
            const token = await getToken(this.messaging, {
                vapidKey: 'BCGlPwG2538voWXXYiSV-y6P1jIWN60aYHdcNUQcS4rpWe-eJpo5bK4-HJHkcbDRzD-S0jaW-sXeRL8XsGLPBts'
            });

            if (token) {
                console.log('✅ Token FCM obtido:', token.substring(0, 20) + '...');
                this.currentToken = token;

                // Salvar token no Firestore
                await this.saveTokenToFirestore(token);

                console.log('✅ Token salvo no Firestore');
            } else {
                console.log('❌ Não foi possível obter o token FCM');
            }

        } catch (error) {
            console.error('❌ Erro ao registrar token:', error);
            
            if (error.code === 'messaging/permission-blocked') {
                console.log('⚠️ Permissão de notificação bloqueada pelo usuário');
            }
        }
    }

    async saveTokenToFirestore(token) {
        try {
            // Criar ID único baseado no token (hash simples)
            const tokenId = this.hashToken(token);

            // Salvar no Firestore
            await setDoc(doc(db, 'fcmTokens', tokenId), {
                token: token,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }, { merge: true });

        } catch (error) {
            console.error('❌ Erro ao salvar token no Firestore:', error);
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
            badge: '/images/favicon-96x96.png',
            tag: 'sapos-league-fcm',
            data: data
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
        console.log('🔔 Permissão concedida - registrando token FCM...');
        await this.registerToken();
    }
}

// Criar instância global
const fcmNotifications = new FCMNotifications();

// Expor globalmente
window.fcmNotifications = fcmNotifications;

export default fcmNotifications;
