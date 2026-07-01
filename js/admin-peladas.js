// js/admin-peladas.js
// Sistema de administração para cadastro de peladas

// 1. VARIÁVEIS GLOBAIS
let processedPlayers = [];
let currentPeladaData = null;

// 2. ELEMENTOS DO DOM
const peladaForm = document.getElementById('pelada-form');
const dataPeladaInput = document.getElementById('data-pelada');
const listaJogadoresTextarea = document.getElementById('lista-jogadores');
const observacoesTextarea = document.getElementById('observacoes');
const btnPreview = document.getElementById('btn-preview');
// Botão de cadastrar removido - agora só existe o botão de preview
const btnConfirmar = document.getElementById('btn-confirmar');
const btnEditar = document.getElementById('btn-editar');

const previewSection = document.getElementById('preview-section');
const previewContent = document.getElementById('preview-content');


const modalConfirmacao = document.getElementById('modal-confirmacao');
const modalSucesso = document.getElementById('modal-sucesso');
const modalMessage = document.getElementById('modal-message');
const modalDetails = document.getElementById('modal-details');
const btnCancelar = document.getElementById('btn-cancelar');
const btnConfirmarFinal = document.getElementById('btn-confirmar-final');
const btnOk = document.getElementById('btn-ok');
const sucessoMessage = document.getElementById('sucesso-message');

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Aguarda a inicialização do Supabase
        let tentativas = 0;
        const maxTentativas = 20; // Aumentado para dar mais tempo
        
        while (!supabaseClient && tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Aumentado o delay
            tentativas++;
            console.log(`Tentativa ${tentativas} de inicialização do Supabase...`);
            
            // Tenta inicializar o Supabase
            if (typeof getSupabaseClient === 'function') {
                supabaseClient = getSupabaseClient();
            }
        }
        
        // Verifica se o Supabase foi carregado
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não foi carregado. Verifique sua conexão com a internet.');
        }
        
        // Verifica se o cliente foi criado
        if (!supabaseClient) {
            throw new Error('Cliente Supabase não foi inicializado corretamente após várias tentativas.');
        }
        
        // Define data padrão como hoje
        const hoje = new Date();
        const hojeFormatado = hoje.toISOString().split('T')[0];
        dataPeladaInput.value = hojeFormatado;
        
        initEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Erro ao carregar dados: ${error.message}`);
    }
});

// 4. INICIALIZAÇÃO DE EVENT LISTENERS
function initEventListeners() {
    // Botão de preview
    btnPreview.addEventListener('click', processarListaJogadores);
    
    // Botão de cadastrar removido - agora só existe o botão de preview
    
    // Botão de confirmar preview
    btnConfirmar.addEventListener('click', confirmarCadastro);
    
    // Botão de editar preview
    btnEditar.addEventListener('click', editarLista);
    
    // Modais
    btnCancelar.addEventListener('click', () => {
        modalConfirmacao.style.display = 'none';
    });
    
    btnConfirmarFinal.addEventListener('click', cadastrarPelada);
    
    btnOk.addEventListener('click', () => {
        modalSucesso.style.display = 'none';
        resetForm();
    });
    
    // Fechar modais clicando fora
    window.addEventListener('click', function(e) {
        if (e.target === modalConfirmacao) {
            modalConfirmacao.style.display = 'none';
        }
        if (e.target === modalSucesso) {
            modalSucesso.style.display = 'none';
        }
    });
}

// 5. PROCESSAMENTO DA LISTA DE JOGADORES
function processarListaJogadores() {
    const dataPelada = dataPeladaInput.value;
    const listaJogadores = listaJogadoresTextarea.value.trim();
    const observacoes = observacoesTextarea.value.trim();
    
    if (!dataPelada) {
        showWarning('Atenção!', 'Por favor, selecione a data da pelada.');
        return;
    }
    
    if (!listaJogadores) {
        showWarning('Atenção!', 'Por favor, digite a lista de jogadores.');
        return;
    }
    
    // Processa a lista de jogadores
    const linhas = listaJogadores.split('\n');
    processedPlayers = [];
    
    linhas.forEach((linha, index) => {
        const nome = linha.trim();
        if (nome) {
            // Limpa o nome removendo números, símbolos e formatação
            const nomeLimpo = limparNome(nome);
            
            // Corrige acentuação automaticamente
            const nomeCorrigido = corrigirAcentuacao(nomeLimpo);
            
            processedPlayers.push({
                nomeOriginal: nome,        // Nome original da lista
                nome: nomeLimpo,           // Nome limpo para busca
                nomeCorrigido: nomeCorrigido, // Nome com acentuação corrigida
                linha: index + 1,
                status: 'ok'
            });
        }
    });
    
    if (processedPlayers.length === 0) {
        showWarning('Atenção!', 'Nenhum jogador válido encontrado na lista.');
        return;
    }
    
    // Verifica duplicatas baseado no nome limpo
    const nomes = processedPlayers.map(p => p.nome.toLowerCase());
    const duplicatas = nomes.filter((nome, index) => nomes.indexOf(nome) !== index);
    
    if (duplicatas.length > 0) {
        processedPlayers.forEach(player => {
            if (duplicatas.includes(player.nome.toLowerCase())) {
                player.status = 'duplicado';
            }
        });
    }
    
    // Armazena dados da pelada
    currentPeladaData = {
        data: dataPelada,
        observacoes: observacoes,
        jogadores: processedPlayers
    };
    
    // Mostra preview
    mostrarPreview();
}

// Função para limpar nomes (remove números, símbolos e formatação)
function limparNome(nome) {
    if (!nome || typeof nome !== 'string') return '';
    
    let nomeLimpo = nome
        .replace(/^\d+\s*/, '')           // Remove números no início (ex: "1 ", "2 ", "3 ")
        .replace(/^\d+\s*[-–—]\s*/, '')  // Remove "1 - ", "2 - ", etc.
        .replace(/[^\w\sÀ-ÿ]/g, '')       // Remove símbolos especiais (mantém acentos)
        .replace(/\s+/g, ' ')              // Remove espaços múltiplos
        .trim();                           // Remove espaços das extremidades
    
    return nomeLimpo;
}

// Função para corrigir acentuação e capitalizar nomes
// Estratégia: capitalização inteligente + dicionário de nomes que precisam
// de acento específico (não detectável por regra geral).
// O usuário pode editar qualquer nome manualmente no preview.
function corrigirAcentuacao(nome) {
    if (!nome || typeof nome !== 'string') return '';

    // Preposições e artigos que ficam em minúsculo dentro de nomes compostos
    const MINUSCULAS = new Set([
        'de', 'da', 'do', 'das', 'dos', 'e', 'em',
        'na', 'no', 'nas', 'nos', 'para', 'por', 'com'
    ]);

    // Dicionário de nomes que precisam de acento especial.
    // Chave: versão sem acento em minúsculo. Valor: forma correta.
    const ACENTOS = {
        'joao':       'João',
        'jose':       'José',
        'antonio':    'Antônio',
        'otavio':     'Otávio',
        'claudio':    'Cláudio',
        'vinicius':   'Vinícius',
        'fabio':      'Fábio',
        'julio':      'Júlio',
        'marcio':     'Márcio',
        'mauricio':   'Maurício',
        'sergio':     'Sérgio',
        'joao paulo': 'João Paulo',
        'joao pedro': 'João Pedro',
        'joao victor':'João Victor',
        'joao vitor': 'João Vitor',
        'joao luis':  'João Luís',
        'joao lucas': 'João Lucas',
        'andre':      'André',
        'cesar':      'César',
        'renato':     'Renato',
        'renan':      'Renan',
        'rogerio':    'Rogério',
        'luis':       'Luís',
        'julia':      'Júlia',
        'leticia':    'Letícia',
        'patricia':   'Patrícia',
        'cecilia':    'Cecília',
        'natalia':    'Natália',
        'debora':     'Débora',
        'monica':     'Mônica',
        'beatriz':    'Beatriz',
    };

    // 1. Capitaliza cada palavra respeitando preposições
    const capitalizado = nome
        .split(' ')
        .filter(p => p.length > 0)
        .map((palavra, idx) => {
            const lower = palavra.toLowerCase();
            // Preposições só ficam minúsculas se não forem a primeira palavra
            if (idx > 0 && MINUSCULAS.has(lower)) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');

    // 2. Verifica se o nome completo (sem acento, minúsculo) tem entrada no dicionário
    const semAcento = capitalizado
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (ACENTOS[semAcento]) {
        return ACENTOS[semAcento];
    }

    // 3. Verifica cada palavra individualmente no dicionário
    const palavrasCorrigidas = capitalizado.split(' ').map(palavra => {
        const chave = palavra
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        return ACENTOS[chave] || palavra;
    });

    return palavrasCorrigidas.join(' ');
}

// 6. EXIBIÇÃO DO PREVIEW
function mostrarPreview() {
    
    let html = `
        <div class="preview-info">
            <p><strong>Data:</strong> ${formatDate(currentPeladaData.data)}</p>
            <p><strong>Total de jogadores:</strong> ${currentPeladaData.jogadores.length}</p>
            ${currentPeladaData.observacoes ? `<p><strong>Observações:</strong> ${currentPeladaData.observacoes}</p>` : ''}
        </div>
        <div class="jogadores-lista">
    `;
    
    currentPeladaData.jogadores.forEach((player, index) => {
        const statusClass = player.status === 'duplicado' ? 'duplicado' : 'ok';
        const nomeDisplay = player.nomeOriginal !== player.nomeCorrigido ? 
            `${player.nomeOriginal} → <strong>${player.nomeCorrigido}</strong>` : 
            player.nomeCorrigido;
        
        html += `
            <div class="jogador-item ${statusClass}">
                <div class="jogador-nome" 
                     onclick="editarNomeInline(${index})" 
                     data-index="${index}"
                     style="cursor: pointer; padding: 5px; border-radius: 3px; transition: background-color 0.2s;">
                    ${nomeDisplay}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (currentPeladaData.jogadores.some(p => p.status === 'duplicado')) {
        html += '<div class="warning-message">⚠️ Alguns nomes aparecem duplicados na lista.</div>';
    }
    
    html += '<div class="edicao-info"><small>💡 Clique no nome corrigido para editar acentos e capitalização</small></div>';
    
    previewContent.innerHTML = html;
    previewSection.style.display = 'block';
    

    
    // Scroll para o preview
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Função para edição inline do nome
function editarNomeInline(index) {
    const player = currentPeladaData.jogadores[index];
    
    // Cria um modal de edição mais elegante
    const modalHtml = `
        <div id="modal-edicao-nome" class="modal modal-edicao-nome">
            <div class="modal-content modal-edicao-content">
                <div class="modal-header">
                    <h3>✏️ Editar Nome do Jogador</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label" for="novo-nome-input">Nome atual: <strong>${player.nomeCorrigido}</strong></label>
                        <input type="text" id="novo-nome-input" class="form-input" value="${player.nomeCorrigido}" placeholder="Digite o novo nome">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-cancelar-edicao" class="btn btn-cancelar-edicao">❌ Cancelar</button>
                    <button id="btn-salvar-edicao" class="btn btn-confirmar">💾 Salvar</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove modal anterior se existir
    const modalAnterior = document.getElementById('modal-edicao-nome');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    // Adiciona o modal ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('modal-edicao-nome');
    const inputNovoNome = document.getElementById('novo-nome-input');
    const btnCancelar = document.getElementById('btn-cancelar-edicao');
    const btnSalvar = document.getElementById('btn-salvar-edicao');
    
    // Foca no input
    inputNovoNome.focus();
    inputNovoNome.select();
    
    // Event listeners
    btnCancelar.addEventListener('click', () => {
        modal.remove();
    });
    
    btnSalvar.addEventListener('click', () => {
        const novoNome = inputNovoNome.value.trim();
        if (novoNome !== '') {
            // Atualiza o nome corrigido
            player.nomeCorrigido = novoNome;
            
            // Atualiza o preview
            mostrarPreview();
            
            // Feedback visual
            const jogadorItem = document.querySelector(`[data-index="${index}"]`);
            if (jogadorItem) {
                jogadorItem.style.backgroundColor = '#d4edda';
                setTimeout(() => {
                    jogadorItem.style.backgroundColor = '';
                }, 1000);
            }
            
            // Fecha o modal
            modal.remove();
            
            // Mostra mensagem de sucesso
            showSuccess('Nome atualizado!', `O nome foi alterado para "${novoNome}" com sucesso.`);
        } else {
            showWarning('Campo vazio', 'Por favor, digite um nome válido.');
            inputNovoNome.focus();
        }
    });
    
    // Fecha modal ao pressionar Enter
    inputNovoNome.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSalvar.click();
        }
    });
    
    // Fecha modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Mostra o modal
    modal.style.display = 'block';
}

// 7. CONFIRMAÇÃO DO CADASTRO
function confirmarCadastro() {
    if (!currentPeladaData) return;
    
    const duplicatas = currentPeladaData.jogadores.filter(p => p.status === 'duplicado');
    
    if (duplicatas.length > 0) {
        if (!confirm('Existem nomes duplicados na lista. Deseja continuar mesmo assim?')) {
            return;
        }
    }
    
    // Mostra modal de confirmação
    modalMessage.textContent = `Tem certeza que deseja cadastrar esta pelada?`;
    
    let detailsHtml = `
        <div class="confirm-details">
            <p><strong>Data:</strong> ${formatDate(currentPeladaData.data)}</p>
            <p><strong>Jogadores:</strong> ${currentPeladaData.jogadores.length}</p>
            ${currentPeladaData.observacoes ? `<p><strong>Observações:</strong> ${currentPeladaData.observacoes}</p>` : ''}
        </div>
    `;
    
    modalDetails.innerHTML = detailsHtml;
    modalConfirmacao.style.display = 'block';
}

// 8. CADASTRO DA PELADA NO BANCO
// NOVA FUNCIONALIDADE: Jogadores não cadastrados são automaticamente adicionados ao sistema sem time
async function cadastrarPelada() {
    if (!currentPeladaData) return;
    
    modalConfirmacao.style.display = 'none';
    
    try {
        // Mostra loading
        btnConfirmarFinal.disabled = true;
        btnConfirmarFinal.textContent = 'Cadastrando...';
        
        // Obtém cliente Supabase
        const client = getSupabaseClient();
        
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Processa cada jogador
        const resultados = [];
        
        for (const player of currentPeladaData.jogadores) {
            try {
                // Busca o jogador no banco com múltiplas estratégias
                let jogador = null;
                let estrategiaUsada = '';
                
                // Estratégia 1: Busca exata com nome corrigido
                // client já foi obtido no início da função
                if (!client) {
                    throw new Error('Cliente Supabase não está disponível');
                }
                
                let { data: jogadorExato, error: errorExato } = await client
                    .from('jogadores')
                    .select('id, nome, time_id')
                    .eq('nome', player.nomeCorrigido)
                    .limit(1);
                
                if (!errorExato && jogadorExato && jogadorExato.length > 0) {
                    jogador = jogadorExato[0];
                    estrategiaUsada = 'busca_exata';
                } else {
                    // Estratégia 2: Busca por nome completo (mais restritiva)
                    // Busca nomes que começam com o nome do jogador OU terminam com o nome do jogador
                    let { data: jogadorCompleto, error: errorCompleto } = await client
                        .from('jogadores')
                        .select('id, nome, time_id')
                        .or(`nome.ilike.${player.nomeCorrigido}%,nome.ilike.% ${player.nomeCorrigido}`)
                        .limit(1);
                    
                    if (!errorCompleto && jogadorCompleto && jogadorCompleto.length > 0) {
                        // Verifica se é realmente uma correspondência válida
                        const nomeEncontrado = jogadorCompleto[0].nome.toLowerCase();
                        const nomeProcurado = player.nomeCorrigido.toLowerCase();
                        
                        // Só aceita se for uma correspondência muito próxima
                        if (nomeEncontrado === nomeProcurado || 
                            nomeEncontrado.startsWith(nomeProcurado + ' ') ||
                            nomeEncontrado.endsWith(' ' + nomeProcurado) ||
                            nomeEncontrado === nomeProcurado) {
                            jogador = jogadorCompleto[0];
                            estrategiaUsada = 'busca_completa';
                        }
                    }
                    
                    // Estratégia 3: Busca por similaridade (mais restritiva)
                    if (!jogador) {
                        const primeirasLetras = player.nomeCorrigido.substring(0, 4);
                        let { data: jogadorSimilar, error: errorSimilar } = await client
                            .from('jogadores')
                            .select('id, nome, time_id')
                            .ilike('nome', `${primeirasLetras}%`)
                            .limit(10); // Busca mais resultados para comparar
                        
                        if (!errorSimilar && jogadorSimilar && jogadorSimilar.length > 0) {
                            // Calcula similaridade para cada resultado
                            const resultadosComSimilaridade = jogadorSimilar.map(j => ({
                                jogador: j,
                                similaridade: calcularSimilaridade(player.nomeCorrigido, j.nome)
                            }));
                            
                            // Filtra apenas resultados com alta similaridade (> 0.7)
                            const resultadosFiltrados = resultadosComSimilaridade.filter(r => r.similaridade > 0.7);
                            
                            if (resultadosFiltrados.length > 0) {
                                // Pega o resultado com maior similaridade
                                const melhorResultado = resultadosFiltrados.reduce((prev, current) => 
                                    (prev.similaridade > current.similaridade) ? prev : current
                                );
                                
                                // Só aceita se a similaridade for muito alta (> 0.8) ou se for o único resultado
                                if (melhorResultado.similaridade > 0.8 || resultadosFiltrados.length === 1) {
                                    jogador = melhorResultado.jogador;
                                    estrategiaUsada = `busca_similar_${Math.round(melhorResultado.similaridade * 100)}%`;
                                }
                            }
                        }
                    }
                }
                

                
                if (jogador) {
                    // Jogador encontrado - cadastra presença com jogador_id
                    const dadosPresenca = {
                        jogador_id: jogador.id,
                            data_pelada: currentPeladaData.data,
                            observacoes: currentPeladaData.observacoes || null
                    };
                    
                    console.log(`📝 Tentando inserir presença para ${player.nomeOriginal}:`, dadosPresenca);
                    
                    const { error: presencaError } = await client
                        .from('presencas')
                        .insert(dadosPresenca);
                    
                    if (presencaError) {
                        console.error(`❌ Erro ao inserir presença para ${player.nomeOriginal}:`, presencaError);
                        console.error(`📋 Dados tentados:`, dadosPresenca);
                        throw presencaError;
                    }
                    
                    console.log(`✅ Presença inserida com sucesso para ${player.nomeOriginal}`);
                    
                    resultados.push({
                        nome: player.nomeOriginal,
                        status: 'sucesso',
                        jogador_id: jogador.id,
                        tipo: 'jogador_cadastrado',
                        estrategia: estrategiaUsada
                    });
                } else {
                    // Jogador não encontrado - cadastra automaticamente no sistema sem time
                    try {
                        // Cadastra o jogador no sistema sem time
                        const dadosJogador = {
                            nome: player.nomeCorrigido,
                            time_id: null, // Sem time
                            data_cadastro: new Date().toISOString().split('T')[0]
                        };
                        
                        // Insere o jogador
                        const { data: novoJogador, error: jogadorError } = await client
                            .from('jogadores')
                            .insert(dadosJogador)
                            .select('id, nome')
                            .single();
                        
                        if (jogadorError) {
                            throw jogadorError;
                        }
                        
                        // Cadastra a presença com o novo jogador_id
                        const dadosPresenca = {
                            jogador_id: novoJogador.id,
                            data_pelada: currentPeladaData.data,
                            observacoes: currentPeladaData.observacoes || null
                        };
                        
                        const { error: presencaError } = await client
                            .from('presencas')
                            .insert(dadosPresenca);
                        
                        if (presencaError) {
                            throw presencaError;
                        }
                        
                        resultados.push({
                            nome: player.nomeOriginal,
                            status: 'sucesso',
                            jogador_id: novoJogador.id,
                            tipo: 'jogador_cadastrado_automaticamente',
                            estrategia: 'cadastro_automatico'
                        });
                        
                    } catch (error) {
                        // Se falhar o cadastro automático, tenta o método antigo como fallback
                        const dadosPresenca = {
                            jogador_id: null,
                            data_pelada: currentPeladaData.data,
                            observacoes: `Jogador não cadastrado: ${player.nomeOriginal} (${currentPeladaData.observacoes || 'Sem observações'})`
                        };
                        
                        const { error: presencaError } = await client
                            .from('presencas')
                            .insert(dadosPresenca);
                        
                        if (presencaError) {
                            throw presencaError;
                        }
                        
                        resultados.push({
                            nome: player.nomeOriginal,
                            status: 'sucesso_sem_cadastro',
                            tipo: 'jogador_nao_cadastrado_fallback'
                        });
                    }
                }
                
            } catch (error) {
                console.error(`Erro ao processar jogador ${player.nomeOriginal}:`, error);
                resultados.push({
                    nome: player.nomeOriginal,
                    status: 'erro',
                    erro: error.message
                });
            }
        }
        
        // Mostra resultado
        mostrarResultadoCadastro(resultados);
        
    } catch (error) {
        console.error('Erro ao cadastrar pelada:', error);
        showError('Erro!', `Erro ao cadastrar pelada: ${error.message}`);
    } finally {
        btnConfirmarFinal.disabled = false;
        btnConfirmarFinal.textContent = 'Confirmar';
    }
}

// 9. EXIBIÇÃO DO RESULTADO
function mostrarResultadoCadastro(resultados) {
    const sucessos = resultados.filter(r => r.status === 'sucesso' && r.tipo !== 'jogador_cadastrado_automaticamente');
    const sucessosCadastroAutomatico = resultados.filter(r => r.tipo === 'jogador_cadastrado_automaticamente');
    const sucessosSemCadastro = resultados.filter(r => r.status === 'sucesso_sem_cadastro');
    const erros = resultados.filter(r => r.status === 'erro');
    
    let message = `Pelada cadastrada com sucesso!`;
    
    if (sucessos.length > 0) {
        const estrategias = {};
        sucessos.forEach(r => {
            if (r.estrategia) {
                estrategias[r.estrategia] = (estrategias[r.estrategia] || 0) + 1;
            }
        });
        
        let estrategiasText = '';
        if (Object.keys(estrategias).length > 0) {
            estrategiasText = Object.entries(estrategias)
                .map(([estrategia, count]) => `${estrategia}: ${count}`)
                .join(', ');
        }
        
        message += `\n\n✅ ${sucessos.length} jogador(es) cadastrado(s) com sucesso (já existiam no sistema).`;
        if (estrategiasText) {
            message += `\nEstratégias de busca: ${estrategiasText}`;
        }
    }
    
    if (sucessosCadastroAutomatico.length > 0) {
        message += `\n\n🆕 ${sucessosCadastroAutomatico.length} jogador(es) cadastrado(s) automaticamente no sistema (sem time).`;
    }
    
    if (sucessosSemCadastro.length > 0) {
        message += `\n\n📝 ${sucessosSemCadastro.length} jogador(es) cadastrado(s) na pelada (não estavam no sistema, mas foram registrados).`;
    }
    
    if (erros.length > 0) {
        message += `\n\n❌ ${erros.length} erro(s) durante o cadastro.`;
        
        // Mostra detalhes dos erros no console
        console.log('❌ Erros detalhados:', erros);
    }
    
    // Log completo dos resultados
    console.log('📊 Resultado completo do cadastro:', {
        total: resultados.length,
        sucessos: sucessos.length,
        sucessosCadastroAutomatico: sucessosCadastroAutomatico.length,
        sucessosSemCadastro: sucessosSemCadastro.length,
        erros: erros.length,
        resultados: resultados
    });
    
    sucessoMessage.textContent = message;
    modalSucesso.style.display = 'block';
}

// 10. EDIÇÃO DA LISTA
function editarLista() {
    previewSection.style.display = 'none';
    listaJogadoresTextarea.focus();
}

// 11. RESET DO FORMULÁRIO
function resetForm() {
    peladaForm.reset();
    listaJogadoresTextarea.value = '';
    observacoesTextarea.value = '';
    previewSection.style.display = 'none';
    processedPlayers = [];
    currentPeladaData = null;
    
    // Define data padrão como hoje
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().split('T')[0];
    dataPeladaInput.value = hojeFormatado;
}



// 12. UTILITÁRIOS
function formatDate(dateString) {
    // Trata a data corretamente para evitar problemas de fuso horário
    if (!dateString) return 'Data não informada';
    
    // Se a data já estiver no formato brasileiro (DD/MM/YYYY), retorna como está
    if (dateString.includes('/')) {
        return dateString;
    }
    
    // Para datas ISO (YYYY-MM-DD), cria a data no fuso horário local
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
        console.error('Data inválida:', dateString);
        return dateString;
    }
    
    const formattedDay = String(date.getDate()).padStart(2, '0');
    const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const formattedYear = date.getFullYear();
    
    return `${formattedDay}/${formattedMonth}/${formattedYear}`;
}

function showError(title, message) {
    alert(`${title}: ${message}`);
}

// Função para calcular similaridade entre nomes
function calcularSimilaridade(nome1, nome2) {
    const n1 = nome1.toLowerCase().trim();
    const n2 = nome2.toLowerCase().trim();
    
    // Se são exatamente iguais
    if (n1 === n2) return 1.0;
    
    // Se um é parte do outro (ex: "Marcelo" em "Marcelo Silva")
    if (n1.includes(n2) || n2.includes(n1)) {
        const palavras1 = n1.split(' ');
        const palavras2 = n2.split(' ');
        
        // Verifica se há palavras em comum
        const palavrasComuns = palavras1.filter(p1 => palavras2.includes(p1));
        if (palavrasComuns.length > 0) {
            return 0.8; // Alta similaridade
        }
    }
    
    // Calcula distância de Levenshtein para nomes similares
    const distancia = levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);
    
    return 1 - (distancia / maxLength);
}

// Função para calcular distância de Levenshtein
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}





// 13. FUNÇÃO DE RECONEXÃO DE PRESENÇAS PASSADAS
async function reconectarPresencasPassadas(nomeJogador, jogadorId) {
    try {
        console.log(`Tentando reconectar presenças para: ${nomeJogador} (ID: ${jogadorId})`);
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Busca presenças passadas com jogador_id = null que contenham o nome
        const { data: presencasPassadas, error } = await client
            .from('presencas')
            .select('*')
            .is('jogador_id', null)
            .ilike('observacoes', `%${nomeJogador}%`);
        
        if (error) throw error;
        
        if (presencasPassadas && presencasPassadas.length > 0) {
            console.log(`Encontradas ${presencasPassadas.length} presenças passadas para reconectar`);
            
            // Atualiza cada presença encontrada
            for (const presenca of presencasPassadas) {
                const { error: updateError } = await client
                    .from('presencas')
                    .update({
                        jogador_id: jogadorId,
                        observacoes: presenca.observacoes.replace(
                            /Jogador não cadastrado: (.+?) \(/,
                            'Jogador reconectado: $1 ('
                        )
                    })
                    .eq('id', presenca.id);
                
                if (updateError) {
                    console.error(`Erro ao atualizar presença ${presenca.id}:`, updateError);
                }
            }
            
            return {
                sucesso: true,
                presencasReconectadas: presencasPassadas.length,
                mensagem: `${presencasPassadas.length} presença(s) passada(s) reconectada(s) para ${nomeJogador}`
            };
        }
        
        return {
            sucesso: true,
            presencasReconectadas: 0,
            mensagem: `Nenhuma presença passada encontrada para ${nomeJogador}`
        };
        
    } catch (error) {
        console.error('Erro ao reconectar presenças passadas:', error);
        return {
            sucesso: false,
            erro: error.message
        };
    }
}

// 14. FUNÇÃO PARA VERIFICAR PRESENÇAS PASSADAS
async function verificarPresencasPassadas(nomeJogador) {
    try {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        const { data: presencas, error } = await client
            .from('presencas')
            .select('*')
            .is('jogador_id', null)
            .ilike('observacoes', `%${nomeJogador}%`)
            .order('data_pelada', { ascending: false });
        
        if (error) throw error;
        
        return presencas || [];
        
    } catch (error) {
        console.error('Erro ao verificar presenças passadas:', error);
        return [];
    }
}

// 15. FUNÇÕES PARA GERENCIAR PELADAS EXISTENTES

// Variáveis globais para paginação e filtros
let peladasExistentes = [];
let peladasFiltradas = [];
let paginaAtual = 1;
const peladasPorPagina = 10;

// Abrir gerenciador de peladas
async function abrirGerenciadorPeladas() {
    try {
        // Primeiro mostra o modal
        mostrarGerenciadorPeladas();
        
        // Depois carrega os dados
        console.log('🔄 Carregando dados das peladas...');
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Busca todas as peladas sem filtro de data para garantir que todas apareçam
        console.log('🔍 Buscando todas as peladas...');
        
        const { data: presencas, error } = await client
            .from('presencas')
            .select(`
                id,
                data_pelada,
                observacoes,
                jogador_id,
                jogadores (
                    id,
                    nome,
                    times (
                        nome
                    )
                )
            `)
            .order('data_pelada', { ascending: false });
        
        if (error) throw error;
        
        console.log('📊 Presenças carregadas:', presencas ? presencas.length : 0);
        if (presencas && presencas.length > 0) {
            console.log('📅 Primeira presença:', presencas[0]);
            console.log('📅 Última presença:', presencas[presencas.length - 1]);
        }
        
        // Agrupa por data
        const peladasPorData = {};
        presencas.forEach(presenca => {
            const data = presenca.data_pelada;
            if (!peladasPorData[data]) {
                peladasPorData[data] = {
                    data: data,
                    presencas: [],
                    observacoes: presenca.observacoes
                };
            }
            peladasPorData[data].presencas.push(presenca);
        });
        
        console.log('📅 Peladas agrupadas por data:', Object.keys(peladasPorData));
        console.log('📅 Detalhes das peladas agrupadas:', peladasPorData);
        
        peladasExistentes = Object.values(peladasPorData);
        peladasFiltradas = [...peladasExistentes];
        paginaAtual = 1;
        
        console.log('✅ Dados carregados com sucesso:', peladasExistentes.length, 'peladas encontradas');
        console.log('📊 Estrutura das peladas:', peladasExistentes.map(p => ({ data: p.data, presencas: p.presencas.length })));
        console.log('🔍 Verificação detalhada das peladas:');
        peladasExistentes.forEach((pelada, index) => {
            console.log(`  Pelada ${index + 1}:`, {
                data: pelada.data,
                tipo: typeof pelada.data,
                presencas: pelada.presencas.length,
                observacoes: pelada.observacoes
            });
        });
        
        console.log('✅ Dados carregados:', peladasExistentes.length, 'peladas encontradas');
        
        // Renderiza as peladas
        renderizarPeladas();
        
    } catch (error) {
        console.error('❌ Erro ao carregar peladas:', error);
        
        // Mostra erro no modal em vez de alert
        const modal = document.querySelector('#modal-gerenciador-overlay');
        if (modal) {
            const container = modal.querySelector('#peladas-lista');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <div class="empty-title">Erro ao carregar dados</div>
                        <div class="empty-text">${error.message}</div>
                    </div>
                `;
            }
        }
    }
}

// Mostrar gerenciador de peladas
function mostrarGerenciadorPeladas() {
    console.log('🚀 Abrindo gerenciador de peladas...');
    
    // Remover modal existente se houver
    const modalExistente = document.querySelector('#modal-gerenciador-overlay');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Criar o modal com estrutura mais simples
    const modalHTML = `
        <div id="modal-gerenciador-overlay" class="gerenciador-modal-overlay show">
            <div id="modal-gerenciador-content" class="modal-gerenciador">
                <div class="modal-header-gerenciador">
                    <div class="modal-title">
                        <div class="modal-icon">🏆</div>
                        <span>Gerenciador de Peladas</span>
                    </div>
                    <button class="close-btn" onclick="fecharGerenciadorPeladas()">×</button>
                </div>

                <div class="modal-body-gerenciador">
                    <div class="filters-section">
                        <div class="filters-title">
                            🔍 Filtros de Busca
                        </div>
                        <div class="filters-grid">
                            <div class="filter-group">
                                <label class="filter-label">Data Início:</label>
                                <input type="date" class="filter-input" id="filtro-data-inicio" onchange="aplicarFiltros()">
                            </div>
                            <div class="filter-group">
                                <label class="filter-label">Data Fim:</label>
                                <input type="date" class="filter-input" id="filtro-data-fim" onchange="aplicarFiltros()">
                            </div>

                            <div class="filter-group">
                                <button class="filter-btn" onclick="aplicarFiltros()">
                                    🔍 Filtrar
                                </button>
                            </div>
                            <div class="filter-group">
                                <button class="filter-btn" style="background: linear-gradient(45deg, #95a5a6, #7f8c8d);" onclick="limparFiltros()">
                                    🗑️ Limpar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="peladas-lista">
                        <div class="estado-carregando">Carregando peladas...</div>
                    </div>
                    
                    <div id="paginacao" class="paginacao" style="display: none;">
                        <div class="paginacao-info">
                            Mostrando <span id="info-paginacao"></span>
                        </div>
                        <div class="controles-paginacao" id="controles-paginacao">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inserir o modal no body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Verificar se foi criado e mostrar
    const modalCriado = document.querySelector('#modal-gerenciador-overlay');
    console.log('✅ Modal criado:', modalCriado);
    
    if (!modalCriado) {
        console.error('❌ Erro: Modal não foi criado');
        return;
    }
    
    // Garantir que o modal seja exibido
    modalCriado.style.display = 'flex';
    modalCriado.style.visibility = 'visible';
    modalCriado.style.opacity = '1';
    modalCriado.classList.add('show');
    
    // Força a re-renderização do DOM
    modalCriado.offsetHeight;
    
    // Log adicional para debug
    console.log('🔍 Verificando estilos do modal:');
    console.log('- display:', modalCriado.style.display);
    console.log('- visibility:', modalCriado.style.visibility);
    console.log('- opacity:', modalCriado.style.opacity);
    console.log('- z-index:', window.getComputedStyle(modalCriado).zIndex);
    console.log('- position:', window.getComputedStyle(modalCriado).position);
    
    // Modal não fecha ao clicar fora (removido para melhor UX)
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharGerenciadorPeladas();
        }
    });
    
    // O modal está pronto para receber dados
    console.log('✅ Modal do gerenciador criado e exibido com sucesso!');
    
    // Adicionar classe ao body para bloquear interação com o fundo
    document.body.classList.add('modal-open');
}

// Fechar gerenciador de peladas
function fecharGerenciadorPeladas() {
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (modal) {
        // Remover a classe show e esconder o modal
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        // Remover classe do body para permitir interação novamente
        document.body.classList.remove('modal-open');
        
        // Remover o modal após a animação
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
}

// Aplicar filtros
function aplicarFiltros() {
    // Procurar especificamente dentro do modal
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (!modal) {
        console.error('Modal não encontrado para aplicar filtros');
        return;
    }
    
    const dataInicio = modal.querySelector('#filtro-data-inicio').value;
    const dataFim = modal.querySelector('#filtro-data-fim').value;
    
    // Animação do botão de filtro
    const filterBtn = modal.querySelector('.filter-btn');
    if (filterBtn) {
        const originalText = filterBtn.innerHTML;
        filterBtn.innerHTML = '🔄 Filtrando...';
        filterBtn.style.background = 'linear-gradient(45deg, #ffc107, #ff9800)';
        
        setTimeout(() => {
            filterBtn.innerHTML = originalText;
            filterBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        }, 1000);
    }
    
    console.log('🔍 Aplicando filtros:', { dataInicio, dataFim });
    console.log('📊 Peladas existentes antes do filtro:', peladasExistentes.length);
    console.log('📅 Datas das peladas:', peladasExistentes.map(p => p.data));
    
    peladasFiltradas = peladasExistentes.filter(pelada => {
        // Filtro por data
        if (dataInicio && pelada.data < dataInicio) {
            console.log(`❌ Pelada ${pelada.data} removida por data início ${dataInicio}`);
            return false;
        }
        if (dataFim && pelada.data > dataFim) {
            console.log(`❌ Pelada ${pelada.data} removida por data fim ${dataFim}`);
            return false;
        }
        
        console.log(`✅ Pelada ${pelada.data} mantida no filtro`);
        return true;
    });
    
    console.log('📊 Peladas filtradas:', peladasFiltradas.length);
    console.log('📅 Datas das peladas filtradas:', peladasFiltradas.map(p => p.data));
    
    paginaAtual = 1;
    renderizarPeladas();
}

// Limpar filtros
function limparFiltros() {
    console.log('🧹 limparFiltros chamada');
    
    // Procurar especificamente dentro do modal
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (!modal) {
        console.error('Modal não encontrado para limpar filtros');
        return;
    }
    
    modal.querySelector('#filtro-data-inicio').value = '';
    modal.querySelector('#filtro-data-fim').value = '';
    
    peladasFiltradas = [...peladasExistentes];
    paginaAtual = 1;
    
    console.log('✅ Filtros limpos, peladas filtradas:', peladasFiltradas.length);
    renderizarPeladas();
}

// Renderizar peladas com paginação
function renderizarPeladas() {
    console.log('🎨 Renderizando peladas:', peladasFiltradas?.length || 0);
    
    if (!peladasFiltradas || !Array.isArray(peladasFiltradas)) {
        console.error('❌ peladasFiltradas inválida');
        return;
    }
    
    // Procurar especificamente dentro do modal
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (!modal) {
        console.error('Modal não encontrado para renderizar peladas');
        return;
    }
    
    const container = modal.querySelector('#peladas-lista');
    const paginacao = modal.querySelector('#paginacao');
    
    if (!container) {
        console.error('Container de peladas não encontrado');
        return;
    }
    
    if (peladasFiltradas.length === 0) {
        console.log('⚠️ Nenhuma pelada encontrada após filtro');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">Nenhuma pelada encontrada</div>
                <div class="empty-text">Não foram encontradas peladas com os filtros aplicados.</div>
            </div>
        `;
        paginacao.style.display = 'none';
        return;
    }
    
    // Calcular paginação
    const totalPaginas = Math.ceil(peladasFiltradas.length / peladasPorPagina);
    const inicio = (paginaAtual - 1) * peladasPorPagina;
    const fim = inicio + peladasPorPagina;
    const peladasPagina = peladasFiltradas.slice(inicio, fim);
    
    console.log('📊 Renderizando', peladasPagina.length, 'peladas de', peladasFiltradas.length, 'total');
    
    // Renderizar peladas da página atual
    let html = '<div class="peladas-list">';
    
    peladasPagina.forEach((pelada, index) => {
        const jogadoresUnicos = [...new Set(pelada.presencas.map(p => {
            if (p.jogadores) {
                return p.jogadores.nome;
            } else if (p.jogador_id === null) {
                const nomeMatch = p.observacoes?.match(/Jogador não cadastrado: (.+?) \(/);
                return nomeMatch ? nomeMatch[1] : 'Nome não encontrado';
            }
            return 'Jogador não encontrado';
        }))];
        
        console.log(`📅 ${pelada.data}: ${jogadoresUnicos.length} jogadores`);
        
        html += `
            <div class="pelada-card">
                <div class="pelada-header">
                    <div class="pelada-date">
                        📅 ${formatDate(pelada.data)}
                    </div>
                    <div class="pelada-count">
                        👥 ${jogadoresUnicos.length} jogadores
                    </div>
                </div>
                
                <div class="pelada-players">
                    <div class="players-label">Jogadores:</div>
                    <div class="players-list">${jogadoresUnicos.slice(0, 8).join(', ')}
                    ${jogadoresUnicos.length > 8 ? `... e mais ${jogadoresUnicos.length - 8}` : ''}</div>
                </div>
                
                ${pelada.observacoes ? `
                    <div class="pelada-observations">
                        <div class="obs-label">Observações:</div>
                        <div class="obs-text">${pelada.observacoes}</div>
                    </div>
                ` : ''}
                
                <div class="pelada-actions">
                    <button class="action-btn btn-edit" onclick="editarPeladaExistente('${pelada.data}')">
                        ✏️ Editar
                    </button>
                    <button class="action-btn btn-delete" onclick="excluirPelada('${pelada.data}')">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Renderizar paginação
    if (totalPaginas > 1) {
        renderizarPaginacao(totalPaginas);
        paginacao.style.display = 'flex';
    } else {
        paginacao.style.display = 'none';
    }
    
    // Atualizar informações da paginação
    const infoPaginacao = modal.querySelector('#info-paginacao');
    if (infoPaginacao) {
        infoPaginacao.textContent = `${inicio + 1}-${Math.min(fim, peladasFiltradas.length)} de ${peladasFiltradas.length}`;
    }
    
    // Adicionar animações aos botões de ação
    setTimeout(() => {
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Efeito ripple
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.style.position = 'absolute';
                ripple.style.borderRadius = '50%';
                ripple.style.background = 'rgba(255,255,255,0.5)';
                ripple.style.transform = 'scale(0)';
                ripple.style.animation = 'ripple 0.6s linear';
                ripple.style.pointerEvents = 'none';
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }, 100);
}

// Renderizar controles de paginação
function renderizarPaginacao(totalPaginas) {
    // Procurar especificamente dentro do modal
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (!modal) {
        console.error('Modal não encontrado para renderizar paginação');
        return;
    }
    
    const controles = modal.querySelector('#controles-paginacao');
    if (!controles) return;
    
    let html = '';
    
    // Botão anterior
    html += `
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual - 1})" 
                ${paginaAtual === 1 ? 'disabled' : ''}
                style="display: flex; align-items: center; gap: 5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            Anterior
        </button>
    `;
    
    // Indicador de página atual
    html += `
        <span class="pagina-atual" style="margin: 0 15px; font-weight: bold; color: #333;">
            Página ${paginaAtual} de ${totalPaginas}
        </span>
    `;
    
    // Botão próximo
    html += `
        <button class="btn-pagina" onclick="mudarPagina(${paginaAtual + 1})" 
                ${paginaAtual === totalPaginas ? 'disabled' : ''}
                style="display: flex; align-items: center; gap: 5px;">
            Próximo
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
    `;
    
    controles.innerHTML = html;
}

// Mudar página
function mudarPagina(pagina) {
    if (pagina < 1 || pagina > Math.ceil(peladasFiltradas.length / peladasPorPagina)) {
        return;
    }
    
    paginaAtual = pagina;
    renderizarPeladas();
    
    // Scroll para o topo da lista dentro do modal
    const modal = document.querySelector('#modal-gerenciador-overlay');
    if (modal) {
        const container = modal.querySelector('#peladas-lista');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Editar pelada existente
async function editarPeladaExistente(dataPelada) {
    try {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Busca presenças da pelada
        const { data: presencas, error } = await client
            .from('presencas')
            .select(`
                id,
                data_pelada,
                observacoes,
                jogador_id,
                jogadores (
                    id,
                    nome,
                    times (
                        nome
                    )
                )
            `)
            .eq('data_pelada', dataPelada)
            .order('id');
        
        if (error) throw error;
        
        // Prepara dados para edição
        const jogadoresEditaveis = presencas.map(presenca => {
            let nome = '';
            let nomeOriginal = '';
            
            if (presenca.jogadores) {
                // Jogador cadastrado
                nome = presenca.jogadores.nome;
                nomeOriginal = presenca.jogadores.nome;
            } else if (presenca.jogador_id === null) {
                // Jogador não cadastrado - extrai nome das observações
                if (presenca.observacoes && presenca.observacoes.includes('Jogador não cadastrado:')) {
                    // Padrão: "Jogador não cadastrado: NOME (observações)"
                    const nomeMatch = presenca.observacoes.match(/Jogador não cadastrado: (.+?) \(/);
                    if (nomeMatch) {
                        nome = nomeMatch[1].trim();
                        nomeOriginal = nomeMatch[1].trim();
                    } else {
                        // Padrão alternativo: "Jogador não cadastrado: NOME"
                        const nomeMatch2 = presenca.observacoes.match(/Jogador não cadastrado: (.+)/);
                        if (nomeMatch2) {
                            nome = nomeMatch2[1].trim();
                            nomeOriginal = nomeMatch2[1].trim();
                        } else {
                            nome = 'Nome não encontrado';
                            nomeOriginal = presenca.observacoes;
                        }
                    }
                } else {
                    // Se não tem o padrão, usa as observações como nome
                    nome = presenca.observacoes || 'Nome não encontrado';
                    nomeOriginal = presenca.observacoes || 'Nome não encontrado';
                }
            }
            
            console.log('🔍 Processando presença:', {
                id: presenca.id,
                jogador_id: presenca.jogador_id,
                observacoes: presenca.observacoes,
                nomeExtraido: nome,
                nomeOriginal: nomeOriginal
            });
            
            return {
                id: presenca.id,
                nome: nome,
                nomeOriginal: nomeOriginal,
                jogador_id: presenca.jogador_id,
                observacoes: presenca.observacoes
            };
        });
        
        mostrarEditorPelada(dataPelada, jogadoresEditaveis);
        
    } catch (error) {
        console.error('Erro ao carregar pelada para edição:', error);
        alert(`Erro ao carregar pelada: ${error.message}`);
    }
}

// Mostrar editor de pelada
function mostrarEditorPelada(dataPelada, jogadores) {
    const modal = document.createElement('div');
    modal.className = 'editor-pelada';
    
    modal.innerHTML = `
        <div class="editor-content">
            <div class="editor-header">
                <h2>✏️ Editar Pelada - ${formatDate(dataPelada)}</h2>
                <button class="btn-fechar" onclick="fecharEditorPelada()">❌ Fechar</button>
            </div>
            
            <div class="editor-form">
                <div class="info-pelada">
                    <h4>📅 Informações da Pelada</h4>
                    <div class="info-grid">
                        <div class="info-campo">
                            <label for="edit-data-pelada">Data da Pelada:</label>
                            <input type="date" id="edit-data-pelada" value="${dataPelada}">
                        </div>
                        <div class="info-campo">
                            <label for="edit-observacoes">Observações:</label>
                            <textarea id="edit-observacoes" 
                                      placeholder="Observações sobre a pelada, local, horário, etc.">${jogadores[0]?.observacoes?.replace(/Jogador não cadastrado: .+? \(/, '')?.replace(/\)$/, '') || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="jogadores-editaveis">
                    <h4>👥 Jogadores da Pelada</h4>
                    ${jogadores.map((jogador, index) => {
                        const statusClass = jogador.jogador_id ? 'status-cadastrado' : 'status-nao-cadastrado';
                        const statusIcon = jogador.jogador_id ? '✅' : '⚠️';
                        const statusText = jogador.jogador_id ? 'Jogador cadastrado' : 'Jogador não cadastrado';
                        
                        // Informações adicionais para jogadores não cadastrados
                        let infoAdicional = '';
                        if (!jogador.jogador_id && jogador.observacoes) {
                            const observacoesLimpa = jogador.observacoes
                                .replace(/Jogador não cadastrado: .+? \(/, '')
                                .replace(/\)$/, '')
                                .trim();
                            if (observacoesLimpa && observacoesLimpa !== jogador.nome) {
                                infoAdicional = `<div style="font-size: 11px; color: #6c757d; margin-top: 2px;">📝 ${observacoesLimpa}</div>`;
                            }
                        }
                        
                        return `
                            <div class="jogador-editavel">
                                <div class="jogador-linha">
                                    <div class="jogador-numero">${index + 1}</div>
                                    
                                    <div class="jogador-campo">
                                        <input type="text" 
                                               value="${jogador.nome}" 
                                               data-id="${jogador.id}"
                                               data-jogador-id="${jogador.jogador_id || ''}"
                                               data-original-nome="${jogador.nomeOriginal}"
                                               class="nome-jogador-input"
                                               placeholder="Nome do jogador"
                                               oninput="buscarJogadoresSugestao(this)"
                                               onclick="mostrarInfoJogador(${index}, '${jogador.nome}', '${jogador.jogador_id}', '${jogador.observacoes || ''}')">
                                        ${infoAdicional}
                                        <div class="sugestoes-container"></div>
                                    </div>
                                    
                                    <div class="jogador-status">
                                        <div class="status-indicador ${statusClass}">
                                            ${statusIcon} ${statusText}
                                        </div>
                                        <button class="btn-remover" onclick="removerJogadorPelada(${jogador.id})">
                                            🗑️ Remover
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    
                    <button class="btn-adicionar-jogador" onclick="adicionarJogadorPelada()">
                        ➕ Adicionar Jogador
                    </button>
                </div>
                
                <div class="editor-acoes">
                    <button class="btn-salvar" onclick="salvarEdicaoPelada('${dataPelada}')">
                        💾 Salvar Alterações
                    </button>
                    <button class="btn-cancelar" onclick="fecharEditorPelada()">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Fechar editor de pelada
function fecharEditorPelada() {
    const editor = document.querySelector('.editor-pelada');
    if (editor) {
        // Adiciona animação de fade out
        editor.style.opacity = '0';
        editor.style.transform = 'scale(0.9)';
        
        // Remove o editor após a animação
        setTimeout(() => {
            if (editor && editor.parentNode) {
                editor.remove();
            }
        }, 300);
    }
}

// Buscar sugestões de jogadores
async function buscarJogadoresSugestao(input) {
    const nome = input.value.trim();
    const sugestoesContainer = input.parentElement.querySelector('.sugestoes-container');
    
    if (nome.length < 2) {
        fecharSugestoes();
        return;
    }
    
    try {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Busca jogadores por similaridade
        const { data: jogadores, error } = await client
            .from('jogadores')
            .select('id, nome, times(nome)')
            .ilike('nome', `%${nome}%`)
            .limit(8);
        
        if (error) throw error;
        
        if (jogadores && jogadores.length > 0) {
            mostrarSugestoes(input, jogadores, sugestoesContainer);
        } else {
            fecharSugestoes();
        }
        
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        fecharSugestoes();
    }
}

// Mostrar sugestões de jogadores
function mostrarSugestoes(input, jogadores, container) {
    let html = '';
    
    jogadores.forEach(jogador => {
        const timeNome = jogador.times ? jogador.times.nome : 'Sem time';
        html += `
            <div class="sugestao-item" 
                 onclick="selecionarJogadorSugestao(this, '${jogador.nome}')">
                <div class="jogador-nome">${jogador.nome}</div>
                <div class="jogador-time">${timeNome}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.style.display = 'block';
    
    // Posiciona o container de sugestões
    const inputRect = input.getBoundingClientRect();
    container.style.position = 'fixed';
    container.style.top = (inputRect.bottom + 5) + 'px';
    container.style.left = inputRect.left + 'px';
    container.style.width = (inputRect.width + 50) + 'px';
}

// Selecionar jogador da sugestão
function selecionarJogadorSugestao(elemento, nome) {
    const input = elemento.closest('.jogador-editavel').querySelector('.nome-jogador-input');
    input.value = nome;
    fecharSugestoes();
    
    // Feedback visual
    mostrarFeedbackJogador(input, 'Jogador selecionado!', 'success');
}

// Mostrar feedback visual para o jogador
function mostrarFeedbackJogador(input, mensagem, tipo) {
    const container = input.closest('.jogador-editavel');
    
    // Remove feedback anterior se existir
    const feedbackAnterior = container.querySelector('.feedback-mensagem');
    if (feedbackAnterior) {
        feedbackAnterior.remove();
    }
    
    // Cria novo feedback
    const feedback = document.createElement('div');
    feedback.className = `feedback-mensagem status-${tipo}`;
    feedback.textContent = mensagem;
    feedback.style.cssText = `
        position: absolute;
        top: -30px;
        left: 0;
        z-index: 1000;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        animation: slideIn 0.3s ease;
    `;
    
    container.style.position = 'relative';
    container.appendChild(feedback);
    
    // Remove o feedback após 3 segundos
    setTimeout(() => {
        if (feedback.parentElement) {
            feedback.remove();
        }
    }, 3000);
}

// Adicionar animação CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Fechar sugestões
function fecharSugestoes() {
    const sugestoes = document.querySelectorAll('.sugestoes-container');
    sugestoes.forEach(s => s.style.display = 'none');
}

// Adicionar jogador à pelada
function adicionarJogadorPelada() {
    const container = document.querySelector('.jogadores-editaveis');
    const novoJogador = document.createElement('div');
    novoJogador.className = 'jogador-editavel jogador-nao-cadastrado';
    novoJogador.style.cssText = 'display: flex; align-items: center; margin: 10px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #ffc107;';
    
    const index = document.querySelectorAll('.jogador-editavel').length + 1;
    
    novoJogador.innerHTML = `
        <div style="display: flex; align-items: center; margin-right: 15px; min-width: 60px;">
            <span style="background: #007bff; color: white; padding: 4px 8px; border-radius: 50%; font-size: 12px; font-weight: bold;">${index}</span>
        </div>
        <div style="flex: 1; margin-right: 15px;">
            <input type="text" 
                   value="" 
                   data-id="novo"
                   class="nome-jogador-input"
                   style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                   placeholder="Nome do jogador"
                   oninput="buscarJogadoresSugestao(this)">
            <div class="sugestoes-container" style="position: absolute; background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 150px; overflow-y: auto; display: none; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; color: #6c757d; display: flex; align-items: center; gap: 5px;">
                ⚠️ Jogador não cadastrado
            </span>
            <button onclick="this.closest('.jogador-editavel').remove()" 
                    style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background-color 0.2s;"
                    onmouseover="this.style.backgroundColor='#c82333'"
                    onmouseout="this.style.backgroundColor='#dc3545'">
                🗑️ Remover
            </button>
        </div>
    `;
    
    container.appendChild(novoJogador);
    
    // Adiciona evento para fechar sugestões ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.jogador-editavel')) {
            fecharSugestoes();
        }
    });
    
    console.log('➕ Novo jogador adicionado à interface');
}

// Remover jogador da pelada
async function removerJogadorPelada(presencaId) {
    if (presencaId === 'novo') return;
    
    if (confirm('Tem certeza que deseja remover este jogador da pelada?')) {
        try {
            const client = getSupabaseClient();
            if (!client) {
                throw new Error('Cliente Supabase não está disponível');
            }
            
            const { error } = await client
                .from('presencas')
                .delete()
                .eq('id', presencaId);
            
            if (error) throw error;
            
            // Remove o elemento da tela
            const jogadorElement = document.querySelector(`[data-id="${presencaId}"]`).closest('.jogador-editavel');
            jogadorElement.remove();
            
                                    showSuccess('Sucesso!', 'Jogador removido com sucesso!', 5000);
            
        } catch (error) {
            console.error('Erro ao remover jogador:', error);
            showError('Erro!', `Erro ao remover jogador: ${error.message}`);
        }
    }
}

// Salvar edição da pelada
async function salvarEdicaoPelada(dataAntiga) {
    try {
        console.log('🚀 Iniciando salvamento da edição da pelada...');
        
        const novaData = document.getElementById('edit-data-pelada').value;
        const observacoes = document.getElementById('edit-observacoes').value;
        
        console.log('📅 Dados da pelada:', { novaData, observacoes });
        
        // Coleta todos os jogadores
        const jogadores = [];
        document.querySelectorAll('.jogador-editavel').forEach((element, index) => {
            const input = element.querySelector('input');
            const nome = input.value.trim();
            const presencaId = input.dataset.id;
            const jogadorId = input.dataset.jogadorId || null;
            const nomeOriginal = input.dataset.originalNome || '';
            
            // Verifica se é um jogador existente ou novo
            const isJogadorExistente = presencaId !== 'novo';
            
            if (nome) {
                jogadores.push({
                    id: presencaId,
                    nome: nome,
                    isExistente: isJogadorExistente,
                    jogadorId: jogadorId,
                    nomeOriginal: nomeOriginal
                });
            }
        });
        
        console.log('🔍 Jogadores coletados com detalhes:', jogadores.map(j => ({
            id: j.id,
            nome: j.nome,
            isExistente: j.isExistente,
            tipo: j.isExistente ? 'EXISTENTE' : 'NOVO'
        })));
        
        console.log('👥 Jogadores coletados:', jogadores);
        
        if (jogadores.length === 0) {
            showWarning('Atenção!', 'Adicione pelo menos um jogador!');
            return;
        }
        
        // Mostra loading
        const btnSalvar = document.querySelector('[onclick="salvarEdicaoPelada(\'' + dataAntiga + '\')"]');
        const textoOriginal = btnSalvar.textContent;
        btnSalvar.disabled = true;
        btnSalvar.textContent = '💾 Salvando...';
        
        // Contador de progresso
        let processados = 0;
        const total = jogadores.length;
        
        // Obtém cliente Supabase uma vez para toda a operação
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Atualiza cada presença
        for (const jogador of jogadores) {
            try {
                console.log(`\n🔍 Processando jogador: ${jogador.nome} (ID: ${jogador.id}, Existente: ${jogador.isExistente})`);
                
                if (!jogador.isExistente) {
                    console.log('🆕 Jogador é NOVO - iniciando busca no banco...');
                    
                    // Novo jogador - busca no banco e insere presença
                    let jogadorEncontrado = null;
                    
                    // Estratégia 1: Busca exata
                    console.log('🔍 Estratégia 1: Busca exata por nome');
                    let { data: jogadorExato, error: errorExato } = await client
                        .from('jogadores')
                        .select('id, nome, time_id')
                        .eq('nome', jogador.nome)
                        .limit(1);
                    
                    if (errorExato) {
                        console.error('❌ Erro na busca exata:', errorExato);
                    } else {
                        console.log('📋 Resultado busca exata:', jogadorExato);
                    }
                    
                    if (!errorExato && jogadorExato && jogadorExato.length > 0) {
                        jogadorEncontrado = jogadorExato[0];
                        console.log('✅ Jogador encontrado na busca exata:', jogadorEncontrado);
                    } else {
                        console.log('❌ Jogador não encontrado na busca exata, tentando similaridade...');
                        
                        // Estratégia 2: Busca por similaridade
                        const primeirasLetras = jogador.nome.substring(0, 4);
                        console.log('🔍 Estratégia 2: Busca por similaridade (primeiras 4 letras:', primeirasLetras + ')');
                        
                        let { data: jogadorSimilar, error: errorSimilar } = await client
                            .from('jogadores')
                            .select('id, nome, time_id')
                            .ilike('nome', `${primeirasLetras}%`)
                            .limit(10);
                        
                        if (errorSimilar) {
                            console.error('❌ Erro na busca por similaridade:', errorSimilar);
                        } else {
                            console.log('📋 Resultado busca por similaridade:', jogadorSimilar);
                        }
                        
                        if (!errorSimilar && jogadorSimilar && jogadorSimilar.length > 0) {
                            // Calcula similaridade para cada resultado
                            const resultadosComSimilaridade = jogadorSimilar.map(j => ({
                                jogador: j,
                                similaridade: calcularSimilaridade(jogador.nome, j.nome)
                            }));
                            
                            console.log('📊 Resultados com similaridade:', resultadosComSimilaridade);
                            
                            // Filtra apenas resultados com alta similaridade (> 0.8)
                            const resultadosFiltrados = resultadosComSimilaridade.filter(r => r.similaridade > 0.8);
                            
                            console.log('🎯 Resultados filtrados (similaridade > 0.8):', resultadosFiltrados);
                            
                            if (resultadosFiltrados.length > 0) {
                                // Pega o resultado com maior similaridade
                                const melhorResultado = resultadosFiltrados.reduce((prev, current) => 
                                    (prev.similaridade > current.similaridade) ? prev : current
                                );
                                
                                console.log('🏆 Melhor resultado por similaridade:', melhorResultado);
                                
                                // Só aceita se a similaridade for muito alta (> 0.8) ou se for o único resultado
                                if (melhorResultado.similaridade > 0.8 || resultadosFiltrados.length === 1) {
                                    jogadorEncontrado = melhorResultado.jogador;
                                    console.log('✅ Jogador encontrado por similaridade:', jogadorEncontrado);
                                } else {
                                    console.log('❌ Similaridade insuficiente:', melhorResultado.similaridade);
                                }
                            }
                        }
                    }
                    
                    // Insere presença
                    let dadosPresenca;
                    let mensagemFeedback;
                    
                    if (jogadorEncontrado) {
                        // Jogador encontrado - presença normal
                        dadosPresenca = {
                            data_pelada: novaData,
                            observacoes: observacoes || null,
                            jogador_id: jogadorEncontrado.id
                        };
                        mensagemFeedback = `✅ Jogador encontrado e adicionado`;
                    } else {
                        // Jogador não encontrado - cadastra automaticamente
                        console.log(`🆕 Jogador "${jogador.nome}" não encontrado. Cadastrando automaticamente...`);
                        
                        try {
                            // Cadastra o jogador no sistema sem time
                            const dadosJogador = {
                                nome: jogador.nome,
                                time_id: null, // Sem time
                                data_cadastro: new Date().toISOString().split('T')[0]
                            };
                            
                            console.log(`📝 Tentando cadastrar jogador:`, dadosJogador);
                            
                            const { data: novoJogador, error: jogadorError } = await client
                                .from('jogadores')
                                .insert(dadosJogador)
                                .select('id, nome')
                                .single();
                            
                            if (jogadorError) {
                                console.error(`❌ Erro ao cadastrar jogador ${jogador.nome}:`, jogadorError);
                                throw jogadorError;
                            }
                            
                            console.log(`✅ Jogador cadastrado com sucesso:`, novoJogador);
                            
                            // Presença com o novo jogador
                            dadosPresenca = {
                                data_pelada: novaData,
                                observacoes: observacoes || null,
                                jogador_id: novoJogador.id
                            };
                            
                            mensagemFeedback = `🆕 Jogador cadastrado automaticamente (sem time)`;
                            
                        } catch (error) {
                            console.error(`❌ Erro ao cadastrar jogador automaticamente:`, error);
                            
                            // Fallback: presença sem jogador_id
                            dadosPresenca = {
                                data_pelada: novaData,
                                observacoes: `Jogador não cadastrado: ${jogador.nome} (${observacoes || 'Sem observações'})`,
                                jogador_id: null
                            };
                            
                            mensagemFeedback = `⚠️ Jogador não cadastrado, mas registrado na pelada`;
                        }
                    }
                    
                    console.log('📝 Dados da presença a serem inseridos:', dadosPresenca);
                    console.log('🔑 jogador_id será:', dadosPresenca.jogador_id);
                    
                    const { error } = await client
                        .from('presencas')
                        .insert(dadosPresenca);
                    
                    if (error) {
                        console.error('❌ Erro ao inserir presença:', error);
                        throw error;
                    }
                    
                    console.log('✅ Presença inserida com sucesso!');
                    
                    // Feedback visual
                    const input = document.querySelector(`[data-id="novo"][value="${jogador.nome}"]`);
                    if (input) {
                        mostrarFeedbackJogador(input, mensagemFeedback, dadosPresenca.jogador_id ? 'success' : 'warning');
                    }
                    
                } else {
                    console.log('🔄 Jogador é EXISTENTE - verificando alterações de nome/vínculo...');

                    // Caso a presença já tenha um jogador vinculado
                    if (jogador.jogadorId) {
                        if (jogador.nomeOriginal && jogador.nome.trim() === jogador.nomeOriginal.trim()) {
                            // Nome não mudou: apenas atualiza data/observações
                            const { error } = await client
                                .from('presencas')
                                .update({
                                    data_pelada: novaData,
                                    observacoes: observacoes || null
                                })
                                .eq('id', jogador.id);
                            if (error) throw error;
                            console.log('✅ Presença atualizada (sem mudança de nome)');
                            const input = document.querySelector(`[data-id="${jogador.id}"]`);
                            if (input) mostrarFeedbackJogador(input, '✅ Atualizado', 'success');
                        } else {
                            // Nome mudou: tentar re-vincular a um outro jogador (ou criar)
                            let novoVinculo = null;

                            // Estratégia 1: exata
                            let { data: exato, error: exatoErr } = await client
                                .from('jogadores')
                                .select('id, nome, time_id')
                                .eq('nome', jogador.nome)
                                .limit(1);
                            if (!exatoErr && exato && exato.length > 0) {
                                novoVinculo = exato[0];
                            }
                            // Estratégia 2: similaridade
                            if (!novoVinculo) {
                                const primeiras = jogador.nome.substring(0, 4);
                                let { data: similares, error: simErr } = await client
                                    .from('jogadores')
                                    .select('id, nome, time_id')
                                    .ilike('nome', `${primeiras}%`)
                                    .limit(10);
                                if (!simErr && similares && similares.length > 0) {
                                    const calc = similares.map(j => ({ j, s: calcularSimilaridade(jogador.nome, j.nome) }));
                                    const bons = calc.filter(r => r.s > 0.8);
                                    if (bons.length > 0) {
                                        novoVinculo = bons.reduce((a,b)=> a.s > b.s ? a : b).j;
                                    }
                                }
                            }
                            // Estratégia 3: criar jogador
                            if (!novoVinculo) {
                                const dadosJogadorNovo = {
                                    nome: jogador.nome,
                                    time_id: null,
                                    data_cadastro: new Date().toISOString().split('T')[0]
                                };
                                const { data: criado, error: criaErr } = await client
                                    .from('jogadores')
                                    .insert(dadosJogadorNovo)
                                    .select('id, nome')
                                    .single();
                                if (criaErr) throw criaErr;
                                novoVinculo = criado;
                            }

                            // Atualiza a presença com o novo jogador_id
                            const { error } = await client
                                .from('presencas')
                                .update({
                                    data_pelada: novaData,
                                    observacoes: observacoes || null,
                                    jogador_id: novoVinculo.id
                                })
                                .eq('id', jogador.id);
                            if (error) throw error;
                            console.log('✅ Presença re-vinculada a outro jogador');
                            const input = document.querySelector(`[data-id="${jogador.id}"]`);
                            if (input) mostrarFeedbackJogador(input, '🔗 Vinculado ao jogador atualizado', 'success');
                        }
                    } else {
                        // Presença sem vínculo anterior: tenta vincular ou criar e atualiza a mesma linha
                        let vinculo = null;
                        let { data: exato2, error: exErr2 } = await client
                            .from('jogadores')
                            .select('id, nome, time_id')
                            .eq('nome', jogador.nome)
                            .limit(1);
                        if (!exErr2 && exato2 && exato2.length > 0) {
                            vinculo = exato2[0];
                        }
                        if (!vinculo) {
                            const primeiras2 = jogador.nome.substring(0, 4);
                            let { data: similares2, error: simErr2 } = await client
                                .from('jogadores')
                                .select('id, nome, time_id')
                                .ilike('nome', `${primeiras2}%`)
                                .limit(10);
                            if (!simErr2 && similares2 && similares2.length > 0) {
                                const calc2 = similares2.map(j => ({ j, s: calcularSimilaridade(jogador.nome, j.nome) }));
                                const bons2 = calc2.filter(r => r.s > 0.8);
                                if (bons2.length > 0) vinculo = bons2.reduce((a,b)=> a.s > b.s ? a : b).j;
                            }
                        }
                        if (!vinculo) {
                            const dadosJogadorNovo2 = {
                                nome: jogador.nome,
                                time_id: null,
                                data_cadastro: new Date().toISOString().split('T')[0]
                            };
                            const { data: criado2, error: criaErr2 } = await client
                                .from('jogadores')
                                .insert(dadosJogadorNovo2)
                                .select('id, nome')
                                .single();
                            if (criaErr2) throw criaErr2;
                            vinculo = criado2;
                        }

                        const { error } = await client
                            .from('presencas')
                            .update({
                                data_pelada: novaData,
                                observacoes: observacoes || null,
                                jogador_id: vinculo.id
                            })
                            .eq('id', jogador.id);
                        if (error) throw error;
                        console.log('✅ Presença vinculada a jogador (antes sem vínculo)');
                        const input = document.querySelector(`[data-id="${jogador.id}"]`);
                        if (input) mostrarFeedbackJogador(input, '🔗 Vinculado ao jogador', 'success');
                    }
                }
                
                processados++;
                btnSalvar.textContent = `💾 Salvando... ${processados}/${total}`;
                console.log(`📊 Progresso: ${processados}/${total}`);
                
            } catch (error) {
                console.error(`❌ Erro ao processar jogador "${jogador.nome}":`, error);
                
                // Feedback visual de erro
                const input = document.querySelector(`[data-id="${jogador.id}"], [data-id="novo"][value="${jogador.nome}"]`);
                if (input) {
                    mostrarFeedbackJogador(input, `❌ Erro: ${error.message}`, 'error');
                }
                
                throw error;
            }
        }
        
        // Sucesso!
        console.log('🎉 Todos os jogadores processados com sucesso!');
        btnSalvar.textContent = '✅ Salvo com sucesso!';
        btnSalvar.style.background = '#28a745';
        
        setTimeout(() => {
            showSuccess('Sucesso!', 'Pelada atualizada com sucesso!', 5000);
            fecharEditorPelada();
            fecharGerenciadorPeladas();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao salvar edição:', error);
        showError('Erro!', `Erro ao salvar edição: ${error.message}`);
        
        // Restaura botão
        const btnSalvar = document.querySelector('[onclick="salvarEdicaoPelada(\'' + dataAntiga + '\')"]');
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Alterações';
        btnSalvar.style.background = '#28a745';
    }
}

// Excluir pelada
async function excluirPelada(dataPelada) {
    if (confirm(`Tem certeza que deseja EXCLUIR completamente a pelada de ${formatDate(dataPelada)}?\n\nEsta ação não pode ser desfeita!`)) {
        try {
            const client = getSupabaseClient();
            if (!client) {
                throw new Error('Cliente Supabase não está disponível');
            }
            
            const { error } = await client
                .from('presencas')
                .delete()
                .eq('data_pelada', dataPelada);
            
                                    if (error) throw error;
                
                        showSuccess('Sucesso!', 'Pelada excluída com sucesso!', 5000);
                        fecharGerenciadorPeladas();
            
        } catch (error) {
            console.error('Erro ao excluir pelada:', error);
            showError('Erro!', `Erro ao excluir pelada: ${error.message}`);
        }
    }
}

// Função para mostrar informações detalhadas do jogador
function mostrarInfoJogador(index, nome, jogadorId, observacoes) {
    console.log('🔍 Informações do jogador:', {
        index: index,
        nome: nome,
        jogadorId: jogadorId,
        observacoes: observacoes
    });
    
    let mensagem = `📋 Jogador ${index + 1}\n\n`;
    mensagem += `👤 Nome: ${nome}\n`;
    
    if (jogadorId && jogadorId !== 'null') {
        mensagem += `✅ Status: Jogador cadastrado (ID: ${jogadorId})\n`;
    } else {
        mensagem += `⚠️ Status: Jogador não cadastrado\n`;
    }
    
    if (observacoes && observacoes.trim()) {
        // Limpa as observações para mostrar apenas o conteúdo relevante
        let obsLimpa = observacoes;
        if (observacoes.includes('Jogador não cadastrado:')) {
            obsLimpa = observacoes
                .replace(/Jogador não cadastrado: .+? \(/, '')
                .replace(/\)$/, '')
                .trim();
        }
        
        if (obsLimpa && obsLimpa !== nome) {
            mensagem += `📝 Observações: ${obsLimpa}\n`;
        }
    }
    
    // Mostra informações no console para debug
    console.log('📋 Informações detalhadas:', mensagem);
    
    // Mostra alerta com as informações
    alert(mensagem);
}






// ============================================
// GERENCIADOR DE JOGADORES APTOS
// ============================================

let timesData = [];
let jogadoresAptosData = [];

// Abrir gerenciador de jogadores aptos
async function abrirGerenciadorAptos() {
    try {
        const modal = document.getElementById('modal-aptos-overlay');
        if (!modal) {
            console.error('Modal de aptos não encontrado');
            return;
        }
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // Carrega lista de times
        await carregarTimes();
        
    } catch (error) {
        console.error('Erro ao abrir gerenciador de aptos:', error);
        showError(`Erro ao carregar dados: ${error.message}`);
    }
}

// Fechar gerenciador de jogadores aptos
function fecharGerenciadorAptos() {
    const modal = document.getElementById('modal-aptos-overlay');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Carregar lista de times
async function carregarTimes() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        const { data: times, error } = await client
            .from('times')
            .select('id, nome')
            .order('nome');
        
        if (error) throw error;
        
        timesData = times || [];
        
        // Preenche o select de times
        const selectTime = document.getElementById('filtro-time-aptos');
        if (selectTime) {
            selectTime.innerHTML = '<option value="">Selecione um time...</option>';
            timesData.forEach(time => {
                selectTime.innerHTML += `<option value="${time.id}">${time.nome}</option>`;
            });
        }
        
    } catch (error) {
        console.error('Erro ao carregar times:', error);
        showError(`Erro ao carregar times: ${error.message}`);
    }
}

// Carregar jogadores do time selecionado
async function carregarJogadoresTime() {
    try {
        const selectTime = document.getElementById('filtro-time-aptos');
        const timeId = selectTime.value;
        
        if (!timeId) {
            const container = document.getElementById('jogadores-aptos-container');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👆</div>
                    <div class="empty-title">Selecione um time</div>
                    <div class="empty-text">
                        Escolha um time acima para visualizar e gerenciar os jogadores aptos.
                    </div>
                </div>
            `;
            document.getElementById('btn-salvar-aptos-container').style.display = 'none';
            return;
        }
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Carrega jogadores do time
        const { data: jogadores, error: jogadoresError } = await client
            .from('jogadores')
            .select('id, nome')
            .eq('time_id', timeId)
            .order('nome');
        
        if (jogadoresError) throw jogadoresError;
        
        // Carrega jogadores aptos
        const { data: aptos, error: aptosError } = await client
            .from('jogadores_aptos')
            .select('jogador_id');
        
        if (aptosError) throw aptosError;
        
        jogadoresAptosData = aptos ? aptos.map(a => a.jogador_id) : [];
        
        // Renderiza lista de jogadores
        renderizarJogadoresAptos(jogadores || []);
        
        // Mostra botão de salvar
        document.getElementById('btn-salvar-aptos-container').style.display = 'flex';
        
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        showError(`Erro ao carregar jogadores: ${error.message}`);
    }
}

// Renderizar lista de jogadores com checkboxes
function renderizarJogadoresAptos(jogadores) {
    const container = document.getElementById('jogadores-aptos-container');
    
    if (jogadores.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😔</div>
                <div class="empty-title">Nenhum jogador encontrado</div>
                <div class="empty-text">
                    Este time não possui jogadores cadastrados.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="jogadores-aptos-lista">';
    
    jogadores.forEach(jogador => {
        const isApto = jogadoresAptosData.includes(jogador.id);
        
        html += `
            <div class="jogador-apto-item">
                <label class="checkbox-container">
                    <input type="checkbox" 
                           class="checkbox-apto" 
                           data-jogador-id="${jogador.id}"
                           ${isApto ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span class="jogador-nome-apto">${jogador.nome}</span>
                </label>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Salvar alterações de jogadores aptos
async function salvarJogadoresAptos() {
    try {
        const btnSalvar = document.getElementById('btn-salvar-aptos');
        btnSalvar.disabled = true;
        btnSalvar.textContent = '💾 Salvando...';
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Coleta jogadores marcados
        const checkboxes = document.querySelectorAll('.checkbox-apto');
        const jogadoresMarcados = [];
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                jogadoresMarcados.push(parseInt(checkbox.dataset.jogadorId));
            }
        });
        
        // Remove todos os jogadores aptos do time atual
        const selectTime = document.getElementById('filtro-time-aptos');
        const timeId = selectTime.value;
        
        const { data: jogadoresTime, error: jogadoresError } = await client
            .from('jogadores')
            .select('id')
            .eq('time_id', timeId);
        
        if (jogadoresError) throw jogadoresError;
        
        const jogadoresTimeIds = jogadoresTime.map(j => j.id);
        
        // Remove registros antigos
        const { error: deleteError } = await client
            .from('jogadores_aptos')
            .delete()
            .in('jogador_id', jogadoresTimeIds);
        
        if (deleteError) throw deleteError;
        
        // Insere novos registros
        if (jogadoresMarcados.length > 0) {
            const registros = jogadoresMarcados.map(jogadorId => ({
                jogador_id: jogadorId
            }));
            
            const { error: insertError } = await client
                .from('jogadores_aptos')
                .insert(registros);
            
            if (insertError) throw insertError;
        }
        
        showSuccess('Sucesso!', `${jogadoresMarcados.length} jogador(es) marcado(s) como apto(s).`);
        
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Alterações';
        
    } catch (error) {
        console.error('Erro ao salvar jogadores aptos:', error);
        showError(`Erro ao salvar: ${error.message}`);
        
        const btnSalvar = document.getElementById('btn-salvar-aptos');
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Alterações';
    }
}

// Event listener para o botão de salvar
document.addEventListener('DOMContentLoaded', function() {
    const btnSalvar = document.getElementById('btn-salvar-aptos');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarJogadoresAptos);
    }
});
