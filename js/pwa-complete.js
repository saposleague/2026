/**
 * PWA Complete System
 * Sistema completo de PWA com notificações universais
 * Funciona em todos os navegadores e plataformas
 */

import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

class PWAComplete {
    constructor() {
        this.times = [];
        this.rodadas = [];
        this.browserInfo = this.detectBrowser();
        this.debugLogs = [];
        this.maxLogs = 50;
        this.isLogsVisible = false;
        this.init();
    }

    // ==================== DETECÇÃO DE AMBIENTE ====================
    detectBrowser() {
        const ua = navigator.userAgent;
        const platformInfo = navigator.userAgentData?.platform || navigator.platform || 'Unknown';
        
        // Detectar versão do iOS
        const iosVersionMatch = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
        const iosVersion = iosVersionMatch ? {
            major: parseInt(iosVersionMatch[1]),
            minor: parseInt(iosVersionMatch[2]),
            patch: parseInt(iosVersionMatch[3] || '0')
        } : null;
        
        const info = {
            // Plataformas
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isWindows: /Win/.test(platformInfo),
            isMac: /Mac/.test(platformInfo),
            isLinux: /Linux/.test(platformInfo),
            
            // Versão iOS
            iosVersion: iosVersion,
            iosVersionString: iosVersion ? `${iosVersion.major}.${iosVersion.minor}.${iosVersion.patch}` : null,
            
            // Navegadores
            isChrome: /Chrome/.test(ua) && !/Edge|Edg/.test(ua),
            isFirefox: /Firefox/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isEdge: /Edge|Edg/.test(ua),
            isOpera: /Opera|OPR/.test(ua),
            isSamsung: /SamsungBrowser/.test(ua),
            
            // PWA
            isStandalone: window.navigator.standalone || 
                         window.matchMedia('(display-mode: standalone)').matches ||
                         window.matchMedia('(display-mode: fullscreen)').matches,
            
            // Recursos
            hasNotification: 'Notification' in window,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasPushManager: 'PushManager' in window,
            
            // Compatibilidade com notificações web iOS
            supportsIOSWebPush: iosVersion ? (iosVersion.major > 16 || (iosVersion.major === 16 && iosVersion.minor >= 4)) : false,
            
            userAgent: ua,
            platform: platformInfo
        };
        
        return info;
    }

    getBrowserDescription() {
        const { browserInfo } = this;
        
        if (browserInfo.isSafari && browserInfo.isIOS && browserInfo.isStandalone) {
            return 'Safari iOS PWA';
        } else if (browserInfo.isSafari && browserInfo.isMac) {
            return 'Safari macOS';
        } else if (browserInfo.isChrome && browserInfo.isAndroid) {
            return 'Chrome Android';
        } else if (browserInfo.isChrome) {
            return 'Chrome Desktop';
        } else if (browserInfo.isFirefox) {
            return 'Firefox';
        } else if (browserInfo.isEdge) {
            return 'Microsoft Edge';
        } else if (browserInfo.isSamsung) {
            return 'Samsung Internet';
        } else {
            return 'Navegador genérico';
        }
    }

    // ==================== SISTEMA DE LOGS ====================
    log(message, type = 'LOG') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            type: type,
            message: message,
            timestamp: timestamp
        };

        this.debugLogs.push(logEntry);
        
        // Console padrão
        if (type === 'ERROR') {
            console.error(message);
        } else if (type === 'WARN') {
            console.warn(message);
        } else {
            console.log(message);
        }

        // Manter apenas os últimos logs
        if (this.debugLogs.length > this.maxLogs) {
            this.debugLogs.shift();
        }

        // Atualizar display se visível
        if (this.isLogsVisible) {
            this.updateLogsDisplay();
        }
    }

    setupLogsUI() {
        const toggleButton = document.getElementById('toggle-logs');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleLogs();
            });
        }
    }

    toggleLogs() {
        const logsContainer = document.getElementById('debug-logs');
        const toggleButton = document.getElementById('toggle-logs');
        
        if (!logsContainer || !toggleButton) return;

        this.isLogsVisible = !this.isLogsVisible;

        if (this.isLogsVisible) {
            logsContainer.style.display = 'block';
            toggleButton.textContent = '📋 Ocultar Logs';
            toggleButton.style.background = '#7b1fa2';
            this.updateLogsDisplay();
        } else {
            logsContainer.style.display = 'none';
            toggleButton.textContent = '📋 Mostrar Logs';
            toggleButton.style.background = '#9c27b0';
        }
    }

    updateLogsDisplay() {
        const logContent = document.getElementById('log-content');
        if (!logContent) return;

        logContent.innerHTML = '';

        this.debugLogs.forEach(log => {
            const logElement = document.createElement('div');
            logElement.style.marginBottom = '5px';
            logElement.style.padding = '3px';
            logElement.style.borderLeft = '3px solid ' + this.getTypeColor(log.type);
            logElement.style.paddingLeft = '8px';

            logElement.innerHTML = `
                <span style="color: #888; font-size: 10px;">[${log.timestamp}]</span>
                <span style="color: ${this.getTypeColor(log.type)}; font-weight: bold;">[${log.type}]</span>
                <span style="color: #fff;">${log.message}</span>
            `;

            logContent.appendChild(logElement);
        });

        // Scroll para o final
        logContent.scrollTop = logContent.scrollHeight;
    }

    getTypeColor(type) {
        switch (type) {
            case 'LOG': return '#00ff00';
            case 'WARN': return '#ffff00';
            case 'ERROR': return '#ff0000';
            default: return '#ffffff';
        }
    }

    // ==================== INICIALIZAÇÃO ====================
    async init() {
        this.log('🌍 Inicializando PWA Complete System...');
        this.logEnvironment();
        
        // Setup UI
        this.setupUI();
        
        // Aguardar carregamento completo
        setTimeout(() => {
            this.setupNotifications();
        }, 2000);
        
        // Carregar dados em tempo real
        this.loadTimesRealtime();
        this.loadRodadasRealtime();
    }

    logEnvironment() {
        const { browserInfo } = this;
        
        this.log('🔍 Detecção do ambiente:');
        this.log('📱 Plataforma: ' + (
            browserInfo.isIOS ? 'iOS' :
            browserInfo.isAndroid ? 'Android' :
            browserInfo.isWindows ? 'Windows' :
            browserInfo.isMac ? 'macOS' :
            browserInfo.isLinux ? 'Linux' : 'Desconhecida'
        ));
        
        this.log('🌐 Navegador: ' + this.getBrowserDescription());
        this.log('📱 PWA: ' + (browserInfo.isStandalone ? 'Sim' : 'Não'));
        this.log('🔔 Notification API: ' + (browserInfo.hasNotification ? 'Sim' : 'Não'));
        this.log('⚙️ Service Worker: ' + (browserInfo.hasServiceWorker ? 'Sim' : 'Não'));
        this.log('📤 Push Manager: ' + (browserInfo.hasPushManager ? 'Sim' : 'Não'));
        
        // Logs específicos para Safari iOS
        if (browserInfo.isSafari && browserInfo.isIOS) {
            this.log('🍎 Safari iOS detectado!');
            this.log('📱 Standalone: ' + browserInfo.isStandalone);
            this.log('🔔 Permissão atual: ' + Notification.permission);
            
            if (browserInfo.iosVersion) {
                this.log(`📱 Versão iOS: ${browserInfo.iosVersionString}`);
                this.log(`✅ Suporte Web Push: ${browserInfo.supportsIOSWebPush ? 'Sim' : 'Não (requer iOS 16.4+)'}`);
                
                if (!browserInfo.supportsIOSWebPush) {
                    this.log('⚠️ PROBLEMA: Esta versão do iOS não suporta notificações web!', 'WARN');
                    this.log('💡 Solução: Atualize para iOS 16.4 ou superior', 'WARN');
                }
            } else {
                this.log('⚠️ Não foi possível detectar a versão do iOS', 'WARN');
            }
        }
        
        // Log do User Agent completo para debug
        this.log('🔍 User Agent: ' + browserInfo.userAgent);
    }

    setupUI() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLogsUI();
        });
    }

    // ==================== CONFIGURAÇÃO DE NOTIFICAÇÕES ====================
    async setupNotifications() {
        const { browserInfo } = this;
        
        if (!browserInfo.hasNotification) {
            this.log('❌ Notification API não suportada', 'ERROR');
            return false;
        }

        this.log('🔧 Configurando notificações para: ' + this.getBrowserDescription());
        this.log('🔍 Permissão atual: ' + Notification.permission);
        
        // Verificar se o iOS suporta notificações web
        if (browserInfo.isSafari && browserInfo.isIOS && !browserInfo.supportsIOSWebPush) {
            this.log('❌ Esta versão do iOS não suporta notificações web', 'ERROR');
            this.log('💡 Notificações web requerem iOS 16.4 ou superior', 'WARN');
            this.log(`📱 Versão atual: ${browserInfo.iosVersionString || 'Desconhecida'}`, 'WARN');
            
            // Criar aviso visual para o usuário
            this.createIOSCompatibilityWarning();
            return false;
        }
        
        // Se já tem permissão, não precisa fazer nada (sem notificação de boas-vindas)
        if (Notification.permission === 'granted') {
            this.log('✅ Permissão já concedida');
            return true;
        }
        
        // Estratégia baseada no navegador/plataforma
        if (browserInfo.isSafari && browserInfo.isIOS && browserInfo.isStandalone) {
            this.log('🍎 Detectado Safari iOS PWA - criando botão de permissão');
            return await this.setupSafariIOSPWA();
        } else if (browserInfo.isSafari && browserInfo.isMac) {
            this.log('🍎 Detectado Safari macOS - criando botão de permissão');
            return await this.setupSafariMac();
        } else if (browserInfo.isChrome || browserInfo.isEdge) {
            this.log('🌐 Detectado Chromium - criando botão de permissão');
            return await this.setupChromiumBased();
        } else if (browserInfo.isFirefox) {
            this.log('🦊 Detectado Firefox - criando botão de permissão');
            return await this.setupFirefox();
        } else if (browserInfo.isSamsung) {
            this.log('📱 Detectado Samsung Internet - criando botão de permissão');
            return await this.setupSamsungInternet();
        } else {
            this.log('🔧 Navegador genérico - criando botão de permissão');
            return await this.setupGeneric();
        }
    }

    async setupSafariIOSPWA() {
        this.log('🍎 Configurando Safari iOS PWA...');
        
        if (Notification.permission === 'granted') {
            this.log('✅ Permissão já concedida (Safari iOS PWA)');
            return true;
        }
        
        if (Notification.permission === 'denied') {
            this.log('❌ Permissão negada (Safari iOS PWA)', 'WARN');
            this.log('💡 Para ativar: Configurações → Safari → Notificações');
            return false;
        }
        
        // Safari requer interação do usuário - criar botão específico
        this.log('🔔 Criando botão de permissão para Safari iOS PWA...');
        this.createSafariPermissionButton();
        return true; // Retorna true porque o botão foi criado
    }

    async setupSafariMac() {
        this.log('🍎 Configurando Safari macOS...');
        return await this.setupGeneric();
    }

    async setupChromiumBased() {
        this.log('🌐 Configurando Chromium (Chrome/Edge)...');
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            this.log('❌ Permissão negada (Chromium)', 'WARN');
            return false;
        }
        
        // Chrome também pode precisar de interação do usuário
        this.createPermissionButton('Chrome/Edge');
        return false;
    }

    async setupFirefox() {
        this.log('🦊 Configurando Firefox...');
        return await this.setupGeneric();
    }

    async setupSamsungInternet() {
        this.log('📱 Configurando Samsung Internet...');
        return await this.setupGeneric();
    }

    async setupGeneric() {
        this.log('🔧 Configurando navegador genérico...');
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            this.log('❌ Permissão negada (Genérico)', 'WARN');
            return false;
        }
        
        // Todos os navegadores modernos requerem interação do usuário
        this.createPermissionButton('Navegador');
        return false;
    }

    // ==================== BOTÕES DE PERMISSÃO ====================
    createSafariPermissionButton() {
        this.createPermissionButton('Safari iOS PWA', true);
    }

    createPermissionButton(browserName, isSafari = false) {
        // Remover botão existente se houver
        const existingButton = document.getElementById('notification-permission-button');
        if (existingButton) {
            existingButton.remove();
        }

        const button = document.createElement('button');
        button.id = 'notification-permission-button';
        button.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🔔</span>
                <div>
                    <div style="font-weight: 600;">Ativar Notificações</div>
                    <div style="font-size: 12px; opacity: 0.9;">Clique para permitir avisos de jogos</div>
                </div>
            </div>
        `;
        
        button.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 15px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 8px 25px rgba(255, 152, 0, 0.4);
            z-index: 10001;
            animation: slideInDown 0.5s ease, pulse 2s infinite;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Adicionar animação de pulse
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        // Event listener para o clique
        button.addEventListener('click', async () => {
            this.log(`🔔 Usuário clicou para permitir notificações (${browserName})`);
            this.log(`🔍 Permissão antes da solicitação: ${Notification.permission}`);
            
            try {
                let permission;
                
                if (isSafari) {
                    this.log('🍎 Usando método Safari para solicitar permissão...');
                    permission = await this.requestPermissionSafari();
                } else {
                    this.log('🌐 Usando método padrão para solicitar permissão...');
                    permission = await Notification.requestPermission();
                }
                
                this.log(`🔔 Resultado da permissão: ${permission}`);
                this.log(`🔍 Notification.permission após solicitação: ${Notification.permission}`);
                
                if (permission === 'granted') {
                    this.log('✅ Permissão concedida!');
                    button.style.background = 'linear-gradient(135deg, #4caf50, #66bb6a)';
                    button.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">✅</span>
                            <div>
                                <div style="font-weight: 600;">Notificações Ativadas!</div>
                                <div style="font-size: 12px; opacity: 0.9;">Você receberá avisos sobre jogos</div>
                            </div>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        button.style.animation = 'slideInDown 0.3s ease reverse';
                        setTimeout(() => button.remove(), 300);
                    }, 3000);
                    
                    this.sendWelcomeNotification();
                    
                    // Registrar Web Push para iOS e Android
                    if (window.webPushIOS) {
                        this.log('📱 [Web Push] Registrando Web Push...');
                        try {
                            await window.webPushIOS.onPermissionGranted();
                            this.log('✅ [Web Push] Registro concluído com sucesso!');
                        } catch (error) {
                            this.log('❌ [Web Push] Erro ao registrar: ' + error.message, 'ERROR');
                            this.log('❌ [Web Push] Stack: ' + error.stack, 'ERROR');
                        }
                    } else {
                        this.log('⚠️ [Web Push] webPushIOS não está disponível', 'WARN');
                        this.log('⚠️ [Web Push] Tentando aguardar carregamento...', 'WARN');
                        
                        // Tentar aguardar o carregamento do módulo
                        let attempts = 0;
                        const maxAttempts = 10;
                        
                        while (attempts < maxAttempts && !window.webPushIOS) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            attempts++;
                            this.log(`⏳ [Web Push] Aguardando... (${attempts}/${maxAttempts})`, 'WARN');
                        }
                        
                        if (window.webPushIOS) {
                            this.log('✅ [Web Push] Módulo carregado, registrando...');
                            try {
                                await window.webPushIOS.onPermissionGranted();
                                this.log('✅ [Web Push] Registro concluído com sucesso!');
                            } catch (error) {
                                this.log('❌ [Web Push] Erro ao registrar: ' + error.message, 'ERROR');
                            }
                        } else {
                            this.log('❌ [Web Push] Módulo não carregou após ' + maxAttempts + ' tentativas', 'ERROR');
                        }
                    }
                    
                    // Registrar token FCM para notificações push (Android/Chrome) - DESABILITADO
                    // this.log('🔔 Tentando registrar token FCM...');
                    // await this.registerFCMToken();
                } else if (permission === 'denied') {
                    this.log('❌ Permissão negada pelo usuário', 'WARN');
                    
                    button.style.background = 'linear-gradient(135deg, #f44336, #e57373)';
                    button.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">❌</span>
                            <div>
                                <div style="font-weight: 600;">Permissão Negada</div>
                                <div style="font-size: 12px; opacity: 0.9;">Vá em Configurações → Notificações</div>
                            </div>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        button.style.animation = 'slideInDown 0.3s ease reverse';
                        setTimeout(() => button.remove(), 300);
                    }, 8000);
                } else {
                    this.log('⚠️ Permissão em estado default/desconhecido', 'WARN');
                    button.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
                    button.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">⚠️</span>
                            <div>
                                <div style="font-weight: 600;">Tente Novamente</div>
                                <div style="font-size: 12px; opacity: 0.9;">Clique novamente para permitir</div>
                            </div>
                        </div>
                    `;
                }
                
            } catch (error) {
                this.log('❌ Erro ao solicitar permissão: ' + error.message, 'ERROR');
                this.log('🔍 Tipo do erro: ' + error.name);
                
                button.style.background = 'linear-gradient(135deg, #f44336, #e57373)';
                button.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">⚠️</span>
                        <div>
                            <div style="font-weight: 600;">Erro</div>
                            <div style="font-size: 12px; opacity: 0.9;">Verifique as configurações do Safari</div>
                        </div>
                    </div>
                `;
            }
        });

        document.body.appendChild(button);
        
        this.log(`🔔 Botão de permissão criado para ${browserName}`);
        
        // Auto-remover após 30 segundos se não clicado
        setTimeout(() => {
            if (button && button.parentNode && Notification.permission === 'default') {
                button.style.animation = 'slideInDown 0.3s ease reverse';
                setTimeout(() => {
                    if (button && button.parentNode) {
                        button.remove();
                    }
                }, 300);
            }
        }, 30000);
    }

    // Mostrar instruções detalhadas para Safari
    showSafariInstructions() {
        // Remover instruções existentes
        const existing = document.getElementById('safari-instructions');
        if (existing) existing.remove();

        const instructions = document.createElement('div');
        instructions.id = 'safari-instructions';
        instructions.innerHTML = `
            <div style="padding: 20px; text-align: left;">
                <h3 style="margin: 0 0 15px 0; color: #ff9800;">📱 Como ativar notificações no Safari iOS:</h3>
                <div style="margin-bottom: 15px;">
                    <strong>Método 1 - Configurações do Safari:</strong>
                    <ol style="margin: 5px 0; padding-left: 20px;">
                        <li>Abra <strong>Configurações</strong> do iPhone</li>
                        <li>Vá em <strong>Safari</strong></li>
                        <li>Toque em <strong>Notificações</strong></li>
                        <li>Ative <strong>Permitir Notificações</strong></li>
                    </ol>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Método 2 - Configurações de Notificações:</strong>
                    <ol style="margin: 5px 0; padding-left: 20px;">
                        <li>Abra <strong>Configurações</strong> do iPhone</li>
                        <li>Vá em <strong>Notificações</strong></li>
                        <li>Procure por <strong>Safari</strong> ou <strong>Sapos League</strong></li>
                        <li>Ative as notificações</li>
                    </ol>
                </div>
                <div style="background: rgba(255,152,0,0.2); padding: 10px; border-radius: 8px; margin-top: 15px;">
                    <strong>💡 Dica:</strong> Certifique-se que o app está instalado na tela inicial (PWA) para melhor funcionamento.
                </div>
            </div>
        `;
        
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            border-radius: 15px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;

        // Botão para fechar
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕ Fechar';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        closeButton.addEventListener('click', () => {
            instructions.remove();
        });

        instructions.appendChild(closeButton);
        document.body.appendChild(instructions);

        // Auto-remover após 15 segundos
        setTimeout(() => {
            if (instructions && instructions.parentNode) {
                instructions.remove();
            }
        }, 15000);

        this.log('📋 Instruções do Safari exibidas');
    }

    async requestPermissionSafari() {
        this.log('🍎 Iniciando solicitação de permissão Safari...');
        this.log('🔍 Tipo de Notification.requestPermission: ' + typeof Notification.requestPermission);
        
        return new Promise((resolve) => {
            if (typeof Notification.requestPermission === 'function') {
                this.log('🔧 Notification.requestPermission é uma função');
                
                // Verificar se é a versão moderna (retorna Promise) ou antiga (callback)
                if (Notification.requestPermission.length === 0) {
                    this.log('🆕 Usando versão moderna (Promise)');
                    Notification.requestPermission()
                        .then(result => {
                            this.log('✅ Promise resolvida com: ' + result);
                            resolve(result);
                        })
                        .catch(error => {
                            this.log('❌ Promise rejeitada: ' + error.message, 'ERROR');
                            resolve('denied');
                        });
                } else {
                    this.log('🔄 Usando versão antiga (callback)');
                    try {
                        Notification.requestPermission((result) => {
                            this.log('✅ Callback executado com: ' + result);
                            resolve(result);
                        });
                    } catch (error) {
                        this.log('❌ Erro no callback: ' + error.message, 'ERROR');
                        resolve('denied');
                    }
                }
            } else {
                this.log('❌ Notification.requestPermission não é uma função', 'ERROR');
                resolve('denied');
            }
        });
    }

    sendWelcomeNotification() {
        setTimeout(() => {
            this.sendNotification(
                'Sapos League',
                'Notificações ativadas! Você receberá avisos sobre jogos.',
                this.getOptimalIcon()
            );
        }, 2000);
    }

    getOptimalIcon() {
        const { browserInfo } = this;
        
        if (browserInfo.isSafari && browserInfo.isIOS) {
            return './images/apple-touch-icon.png';
        } else if (browserInfo.isAndroid) {
            return './images/web-app-manifest-192x192.png';
        } else {
            return './images/web-app-manifest-192x192.png';
        }
    }

    async sendNotification(title, body, icon) {
        if (Notification.permission !== 'granted') {
            return false;
        }

        try {
            // Para PWAs (modo standalone) ou quando Service Worker está disponível, usar SW
            if (this.browserInfo.isStandalone || 
                (this.browserInfo.isAndroid && 'serviceWorker' in navigator) ||
                (this.browserInfo.isSafari && this.browserInfo.isIOS && 'serviceWorker' in navigator)) {
                return await this.sendServiceWorkerNotification(title, body, icon);
            }
            
            // Fallback para API direta (navegadores desktop)
            const options = this.getNotificationOptions(body, icon);
            const notification = new Notification(title, options);

            notification.onclick = () => {
                notification.close();
                if (window.focus) window.focus();
            };

            return true;
        } catch (error) {
            // Se falhar, tentar Service Worker como fallback
            if ('serviceWorker' in navigator) {
                return await this.sendServiceWorkerNotification(title, body, icon);
            }
            
            return false;
        }
    }

    async sendServiceWorkerNotification(title, body, icon) {
        try {
            if (!('serviceWorker' in navigator)) {
                return false;
            }

            const registration = await navigator.serviceWorker.ready;
            
            // Opções otimizadas para diferentes plataformas
            const options = {
                body: body,
                icon: icon || this.getOptimalIcon(),
                tag: 'sapos-league-' + Date.now(),
                badge: './images/favicon-96x96.png',
                silent: false,
                renotify: true
            };
            
            // Adicionar opções específicas por plataforma
            if (this.browserInfo.isAndroid) {
                options.requireInteraction = false;
                options.vibrate = [200, 100, 200];
            }
            
            await registration.showNotification(title, options);
            return true;
            
        } catch (error) {
            return false;
        }
    }

    getNotificationOptions(body, icon) {
        const { browserInfo } = this;
        
        let options = {
            body: body,
            icon: icon,
            tag: 'sapos-league-' + Date.now(), // Tag única para evitar conflitos
            renotify: true
        };

        // Adicionar opções específicas por navegador
        if (browserInfo.isChrome || browserInfo.isEdge) {
            options.badge = './images/favicon-96x96.png';
            options.requireInteraction = false;
            options.silent = false;
        } else if (browserInfo.isSafari && browserInfo.isIOS) {
            // Safari iOS - opções muito básicas para máxima compatibilidade
            options = {
                body: body,
                icon: './images/apple-touch-icon.png', // Usar ícone específico do iOS
                tag: 'sapos-league-' + Date.now(),
                silent: false
            };
            
            this.log('🍎 Usando opções Safari iOS otimizadas');
        } else if (browserInfo.isSafari) {
            // Safari macOS
            options = {
                body: body,
                icon: icon,
                tag: 'sapos-league-' + Date.now()
            };
        } else if (browserInfo.isFirefox) {
            options.requireInteraction = false;
        }

        return options;
    }

    // ==================== AVISO DE COMPATIBILIDADE iOS ====================
    createIOSCompatibilityWarning() {
        // Remover aviso existente se houver
        const existingWarning = document.getElementById('ios-compatibility-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warning = document.createElement('div');
        warning.id = 'ios-compatibility-warning';
        warning.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
                z-index: 10000;
                max-width: 90%;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInDown 0.5s ease;
            ">
                <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                    <span style="font-size: 24px;">⚠️</span>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 5px;">
                            Notificações Não Suportadas
                        </div>
                        <div style="font-size: 14px; opacity: 0.9;">
                            Esta versão do iOS não suporta notificações web.<br>
                            Atualize para iOS 16.4+ para receber avisos.
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        padding: 5px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">×</button>
                </div>
            </div>
        `;

        document.body.appendChild(warning);

        // Auto-remover após 15 segundos
        setTimeout(() => {
            if (warning && warning.parentNode) {
                warning.style.animation = 'slideInDown 0.3s ease reverse';
                setTimeout(() => warning.remove(), 300);
            }
        }, 15000);

        this.log('⚠️ Aviso de compatibilidade iOS exibido');
    }

    // ==================== NOTIFICAÇÕES DE JOGOS ====================
    loadTimesRealtime() {
        onSnapshot(collection(db, "times"), (snapshot) => {
            this.times = snapshot.docs.map(doc => ({
                id: doc.id,
                nome: doc.data().nome,
                iconeURL: doc.data().iconeURL
            }));
            this.log(`📊 Times carregados: ${this.times.length}`);
        }, (error) => {
            this.log('❌ Erro ao carregar times: ' + error.message, 'ERROR');
        });
    }

    loadRodadasRealtime() {
        // Carregar rodadas de todas as fases
        const fases = ['rodadas2026_fase1', 'rodadas2026_fase2', 'rodadas2026_final'];
        
        fases.forEach(colecao => {
            onSnapshot(collection(db, colecao), (snapshot) => {
                const rodadasFase = snapshot.docs.map(doc => ({
                    numero: parseInt(doc.id.replace("rodada", "")),
                    jogos: doc.data().jogos,
                    fase: colecao
                }));
                
                // Mesclar com rodadas existentes (remover duplicatas da mesma fase)
                this.rodadas = this.rodadas.filter(r => r.fase !== colecao);
                this.rodadas = [...this.rodadas, ...rodadasFase].sort((a, b) => a.numero - b.numero);
                
                this.log(`📅 Rodadas carregadas de ${colecao}: ${rodadasFase.length}`);
                this.log(`📅 Total de rodadas: ${this.rodadas.length}`);
            }, (error) => {
                this.log(`❌ Erro ao carregar rodadas de ${colecao}: ` + error.message, 'ERROR');
            });
        });
    }

    // ==================== PERSISTÊNCIA ====================
    
    async registerFCMToken() {
        // Tentar registrar token FCM com retry
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (window.fcmNotifications) {
                this.log('✅ fcmNotifications encontrado, registrando token...');
                try {
                    await window.fcmNotifications.onPermissionGranted();
                    this.log('✅ Token FCM registrado com sucesso!');
                    return true;
                } catch (error) {
                    this.log('❌ Erro ao registrar token FCM: ' + error.message, 'ERROR');
                    return false;
                }
            }
            
            this.log(`⏳ Aguardando fcmNotifications carregar... (tentativa ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        this.log('❌ fcmNotifications não carregou após ' + maxAttempts + ' tentativas', 'ERROR');
        return false;
    }
}

// Inicializar sistema completo
const pwaComplete = new PWAComplete();

// Expor globalmente
window.pwaComplete = pwaComplete;

export default pwaComplete;