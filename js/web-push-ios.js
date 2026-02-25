/**
 * Web Push API para iOS e Android
 * Funciona em PWAs instalados no iOS 16.4+ e Android
 * Com painel de logs visual para debug
 */

import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

class WebPushIOS {
    constructor() {
        this.subscription = null;
        this.debugLogs = [];
        this.maxLogs = 100;
        this.createDebugPanel();
        this.init();
    }

    createDebugPanel() {
        // Criar painel de debug fixo no canto da tela
        const panel = document.createElement('div');
        panel.id = 'webpush-debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #9c27b0, #7b1fa2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
            transition: all 0.3s ease;
        `;
        panel.innerHTML = '📱';
        panel.title = 'Ver logs Web Push';

        // Criar modal de logs
        const modal = document.createElement('div');
        modal.id = 'webpush-logs-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 100000;
            display: none;
            overflow: auto;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #9c27b0; margin: 0;">📱 Web Push Logs</h2>
                    <button id="close-webpush-logs" style="
                        background: #f44336;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">✕ Fechar</button>
                </div>
                <div id="webpush-logs-content" style="
                    background: #1a1a1a;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    max-height: 70vh;
                    overflow-y: auto;
                    color: #fff;
                "></div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button id="copy-webpush-logs" style="
                        background: #2196f3;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        flex: 1;
                    ">📋 Copiar Logs</button>
                    <button id="clear-webpush-logs" style="
                        background: #ff9800;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        flex: 1;
                    ">🗑️ Limpar</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        document.body.appendChild(modal);

        // Event listeners
        panel.addEventListener('click', () => {
            modal.style.display = 'block';
            this.updateDebugPanel();
        });

        modal.querySelector('#close-webpush-logs').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.querySelector('#copy-webpush-logs').addEventListener('click', () => {
            const logsText = this.debugLogs.map(log => 
                `[${log.timestamp}] [${log.type}] ${log.message}`
            ).join('\n');
            
            navigator.clipboard.writeText(logsText).then(() => {
                alert('✅ Logs copiados para a área de transferência!');
            }).catch(() => {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = logsText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('✅ Logs copiados!');
            });
        });

        modal.querySelector('#clear-webpush-logs').addEventListener('click', () => {
            this.debugLogs = [];
            this.updateDebugPanel();
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    log(message, type = 'LOG') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            type: type,
            message: message,
            timestamp: timestamp
        };

        this.debugLogs.push(logEntry);

        // Manter apenas os últimos logs
        if (this.debugLogs.length > this.maxLogs) {
            this.debugLogs.shift();
        }

        // Console padrão
        const consoleMessage = `[${timestamp}] ${message}`;
        if (type === 'ERROR') {
            console.error(consoleMessage);
        } else if (type === 'WARN') {
            console.warn(consoleMessage);
        } else {
            console.log(consoleMessage);
        }

        // Atualizar badge do painel
        this.updatePanelBadge();
    }

    updatePanelBadge() {
        const panel = document.getElementById('webpush-debug-panel');
        if (!panel) return;

        const errorCount = this.debugLogs.filter(log => log.type === 'ERROR').length;
        
        if (errorCount > 0) {
            panel.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
            panel.innerHTML = `📱<span style="
                position: absolute;
                top: -5px;
                right: -5px;
                background: #fff;
                color: #f44336;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            ">${errorCount}</span>`;
        } else {
            panel.style.background = 'linear-gradient(135deg, #9c27b0, #7b1fa2)';
            panel.innerHTML = '📱';
        }
    }

    updateDebugPanel() {
        const content = document.getElementById('webpush-logs-content');
        if (!content) return;

        content.innerHTML = '';

        if (this.debugLogs.length === 0) {
            content.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Nenhum log ainda</div>';
            return;
        }

        this.debugLogs.forEach(log => {
            const logElement = document.createElement('div');
            logElement.style.marginBottom = '8px';
            logElement.style.padding = '8px';
            logElement.style.borderLeft = '3px solid ' + this.getTypeColor(log.type);
            logElement.style.paddingLeft = '12px';
            logElement.style.background = 'rgba(255,255,255,0.05)';
            logElement.style.borderRadius = '4px';

            logElement.innerHTML = `
                <span style="color: #888; font-size: 10px;">[${log.timestamp}]</span>
                <span style="color: ${this.getTypeColor(log.type)}; font-weight: bold; margin-left: 8px;">[${log.type}]</span>
                <div style="color: #fff; margin-top: 4px; word-break: break-word;">${this.escapeHtml(log.message)}</div>
            `;

            content.appendChild(logElement);
        });

        // Scroll para o final
        content.scrollTop = content.scrollHeight;
    }

    getTypeColor(type) {
        switch (type) {
            case 'LOG': return '#00ff00';
            case 'WARN': return '#ffff00';
            case 'ERROR': return '#ff0000';
            default: return '#ffffff';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async init() {
        try {
            this.log('📱 [Web Push] Inicializando Web Push...');

            // Verificar se é iOS ou Android
            const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            const isAndroid = /Android/.test(navigator.userAgent);
            
            this.log('📱 [Web Push] User Agent: ' + navigator.userAgent);
            this.log('📱 [Web Push] É iOS? ' + isIOS);
            this.log('📱 [Web Push] É Android? ' + isAndroid);
            
            this.log('📱 [Web Push] Verificando suporte a notificações...');

            // Verificar suporte a notificações
            if (!('Notification' in window)) {
                this.log('❌ [Web Push] Notificações não suportadas', 'ERROR');
                return;
            }

            // Verificar suporte a Service Worker
            if (!('serviceWorker' in navigator)) {
                this.log('❌ [Web Push] Service Worker não suportado', 'ERROR');
                return;
            }

            // Verificar suporte a Push API
            if (!('PushManager' in window)) {
                this.log('❌ [Web Push] Push API não suportada', 'ERROR');
                return;
            }

            this.log('✅ [Web Push] Todos os recursos suportados');
            this.log('✅ [Web Push] Permissão atual: ' + Notification.permission);

            // Aguardar permissão
            if (Notification.permission === 'granted') {
                this.log('✅ [Web Push] Permissão já concedida - registrando...');
                await this.subscribe();
            } else if (Notification.permission === 'default') {
                this.log('⏳ [Web Push] Aguardando permissão...');
                this.startPermissionMonitoring();
            } else {
                this.log('❌ [Web Push] Permissão negada', 'WARN');
            }

        } catch (error) {
            this.log('❌ [Web Push] Erro ao inicializar: ' + error.message, 'ERROR');
            this.log('❌ [Web Push] Stack: ' + error.stack, 'ERROR');
        }
    }

    startPermissionMonitoring() {
        this.log('🔄 [Web Push] Iniciando monitoramento de permissão...');
        
        const checkInterval = setInterval(async () => {
            if (Notification.permission === 'granted') {
                this.log('✅ [Web Push] Permissão concedida detectada - registrando...');
                clearInterval(checkInterval);
                await this.subscribe();
            } else if (Notification.permission === 'denied') {
                this.log('❌ [Web Push] Permissão negada detectada', 'WARN');
                clearInterval(checkInterval);
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(checkInterval);
            this.log('⏱️ [Web Push] Monitoramento encerrado (timeout 30s)');
        }, 30000);
    }

    async subscribe() {
        try {
            this.log('📝 [Web Push] Registrando subscription...');

            if (!('serviceWorker' in navigator)) {
                this.log('❌ [Web Push] Service Worker não disponível', 'ERROR');
                return;
            }

            this.log('⏳ [Web Push] Aguardando Service Worker...');
            
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout aguardando SW')), 10000)
                )
            ]);
            
            this.log('✅ [Web Push] Service Worker pronto');
            this.log('📋 [Web Push] Scope: ' + registration.scope);

            if (!registration.pushManager) {
                this.log('❌ [Web Push] PushManager não disponível', 'ERROR');
                return;
            }

            this.log('✅ [Web Push] PushManager disponível');
            this.log('� [Web Puush] Verificando subscription existente...');
            
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                this.log('📝 [Web Push] Criando nova subscription...');
                
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array('BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg')
                    });

                    this.log('✅ [Web Push] Subscription criada!');
                } catch (subscribeError) {
                    this.log('❌ [Web Push] Erro ao criar: ' + subscribeError.message, 'ERROR');
                    throw subscribeError;
                }
            } else {
                this.log('✅ [Web Push] Subscription já existe');
            }

            this.subscription = subscription;
            this.log('📋 [Web Push] Endpoint: ' + subscription.endpoint.substring(0, 50) + '...');

            this.log('💾 [Web Push] Salvando no Firestore...');
            await this.saveSubscription(subscription);

            this.log('✅ [Web Push] Processo completo finalizado!');

        } catch (error) {
            this.log('❌ [Web Push] Erro: ' + error.message, 'ERROR');
            this.log('🔄 [Web Push] Tentando novamente em 5s...', 'WARN');
            setTimeout(() => this.subscribe(), 5000);
        }
    }

    async saveSubscription(subscription) {
        try {
            const subscriptionJSON = subscription.toJSON();
            
            if (!subscriptionJSON.endpoint) {
                this.log('❌ [Web Push] Subscription sem endpoint!', 'ERROR');
                throw new Error('Subscription sem endpoint');
            }
            
            const subscriptionId = this.hashString(subscriptionJSON.endpoint);
            this.log('🔑 [Web Push] ID: ' + subscriptionId);
            
            const isAndroid = /Android/.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const platform = isAndroid ? 'android' : (isIOS ? 'ios' : 'other');
            this.log('📱 [Web Push] Plataforma: ' + platform);

            const dataToSave = {
                subscription: subscriptionJSON,
                endpoint: subscriptionJSON.endpoint,
                platform: platform,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userAgent: navigator.userAgent,
                browser: this.detectBrowser()
            };
            
            this.log('💾 [Web Push] Firestore: ' + (db ? 'OK' : 'ERRO'));

            if (!db) {
                this.log('❌ [Web Push] Firestore não inicializado!', 'ERROR');
                throw new Error('Firestore não inicializado');
            }

            this.log('💾 [Web Push] Chamando setDoc...');
            await setDoc(doc(db, 'webPushSubscriptions', subscriptionId), dataToSave, { merge: true });

            this.log('✅ [Web Push] Salvo com sucesso! (' + platform + ')');

        } catch (error) {
            this.log('❌ [Web Push] Erro ao salvar: ' + error.message, 'ERROR');
            
            if (error.code) {
                this.log('❌ [Web Push] Código: ' + error.code, 'ERROR');
                
                if (error.code === 'permission-denied') {
                    this.log('� [Web Push] Verifique regras do Firestore', 'WARN');
                } else if (error.code === 'unavailable') {
                    this.log('💡 [Web Push] Sem conexão com internet?', 'WARN');
                }
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
        this.log('📱 [Web Push] onPermissionGranted chamado!');
        await this.subscribe();
    }
}

// Criar instância global
const webPushIOS = new WebPushIOS();

// Expor globalmente
window.webPushIOS = webPushIOS;

export default webPushIOS;
