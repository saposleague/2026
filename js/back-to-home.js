/**
 * Back to Home Button
 * Botão para voltar à página inicial com limpeza de cache
 */

(function() {
    'use strict';

    /**
     * Limpa o cache do Service Worker e volta para a página inicial
     */
    async function clearCacheAndGoHome() {
        console.log('🧹 Limpando cache...');

        try {
            // Limpar todos os caches do Service Worker
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log(`📦 Encontrados ${cacheNames.length} caches`);
                
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log(`🗑️ Deletando cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
                
                console.log('✅ Cache limpo com sucesso!');
            }

            // Desregistrar Service Worker (opcional, mas garante limpeza completa)
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('🔄 Service Worker desregistrado');
                }
            }

            // Voltar para a página inicial
            console.log('🏠 Voltando para página inicial...');
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
            // Mesmo com erro, volta para a página inicial
            window.location.href = '../index.html';
        }
    }

    /**
     * Inicializa o botão de voltar
     */
    function initBackButton() {
        const backButton = document.getElementById('back-to-home');
        
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                clearCacheAndGoHome();
            });
            
            console.log('🔙 Botão de voltar inicializado');
        }
    }

    // Inicializar quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButton);
    } else {
        initBackButton();
    }
})();
