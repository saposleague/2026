/**
 * Back to Home Button
 * Botão para voltar à página inicial
 */

(function() {
    'use strict';

    function goHome() {
        // Navegação normal: o cache e o Service Worker devem permanecer ativos.
        window.location.href = '../index.html';
    }

    /**
     * Inicializa o botão de voltar
     */
    function initBackButton() {
        const backButton = document.getElementById('back-to-home');
        
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                goHome();
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
