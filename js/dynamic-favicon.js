/**
 * Dynamic Favicon Generator
 * Gera o favicon dinamicamente com escala de 190% e fundo transparente
 * Baseado no ajustar-favicon-tempo-real.html
 */

(function() {
    'use strict';

    // Configurações
    const FAVICON_SIZE = 16; // Tamanho real da aba do navegador (16x16)
    const SCALE = 1.9; // 190% de escala
    const BG_COLOR = 'transparent'; // Fundo transparente

    /**
     * Gera e atualiza o favicon dinamicamente
     */
    function generateDynamicFavicon() {
        console.log('🚀 Iniciando geração de favicon dinâmico...');
        console.log(`📐 Tamanho: ${FAVICON_SIZE}x${FAVICON_SIZE}, Escala: ${SCALE * 100}%, Fundo: ${BG_COLOR}`);
        
        const svgImage = new Image();
        
        svgImage.onload = function() {
            console.log('✅ SVG carregado com sucesso!');
            
            const canvas = document.createElement('canvas');
            canvas.width = FAVICON_SIZE;
            canvas.height = FAVICON_SIZE;
            const ctx = canvas.getContext('2d');

            // Aplicar fundo se não for transparente
            if (BG_COLOR !== 'transparent') {
                ctx.fillStyle = BG_COLOR;
                ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
            }

            // Calcular dimensões com escala
            const scaledWidth = FAVICON_SIZE * SCALE;
            const scaledHeight = FAVICON_SIZE * SCALE;
            const offsetX = (FAVICON_SIZE - scaledWidth) / 2;
            const offsetY = (FAVICON_SIZE - scaledHeight) / 2;

            console.log(`🖼️ Desenhando: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)} com offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

            // Usar clip para cortar o que sair do quadro (evita overflow)
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
            ctx.clip();

            // Desenhar SVG com escala
            ctx.drawImage(svgImage, offsetX, offsetY, scaledWidth, scaledHeight);

            ctx.restore();

            // Atualizar o favicon
            updateFavicon(canvas.toDataURL('image/png'));
        };

        svgImage.onerror = function() {
            console.error('❌ Erro ao carregar favicon.svg');
        };

        // Carregar o SVG
        svgImage.src = '/favicon.svg';
    }

    /**
     * Atualiza o favicon da página
     */
    function updateFavicon(dataUrl) {
        console.log('🎨 Atualizando favicon dinamicamente...');
        
        // Remover TODOS os favicons existentes (PNG, SVG, ICO)
        const allFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
        console.log(`🗑️ Removendo ${allFavicons.length} favicons existentes`);
        allFavicons.forEach(favicon => favicon.remove());

        // Criar novo favicon dinâmico
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = dataUrl;
        link.id = 'dynamic-favicon';
        
        // Adicionar ao head como primeiro elemento
        document.head.insertBefore(link, document.head.firstChild);
        
        console.log('✅ Favicon dinâmico aplicado com sucesso!');
    }

    // Gerar favicon quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', generateDynamicFavicon);
    } else {
        generateDynamicFavicon();
    }
})();
