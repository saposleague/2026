// js/gerador-rodadas.js
import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// SISTEMA DE FASES
let faseAtual = 'fase1'; // 'fase1', 'fase2', 'final'

// --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = "admin.html";
  }
});

// Variáveis globais
let times = [];
let ultimaRodada = 0;
let rodadasGeradas = [];

// Elementos DOM
const timesCountEl = document.getElementById('times-count');
const ultimaRodadaEl = document.getElementById('ultima-rodada');
const proximasRodadasEl = document.getElementById('proximas-rodadas');
const gerarButton = document.getElementById('gerar-button');
const previaCard = document.getElementById('previa-card');
const rodadasPreview = document.getElementById('rodadas-preview');
const salvarButton = document.getElementById('salvar-rodadas-button');
const cancelarButton = document.getElementById('cancelar-button');
const voltarButton = document.getElementById('voltar-button');
const logoutButton = document.getElementById('logout-button');

// --- EVENT LISTENERS ---
gerarButton.addEventListener('click', gerarRodadas);
salvarButton.addEventListener('click', confirmarSalvarRodadas);
cancelarButton.addEventListener('click', cancelarGeracao);
voltarButton.addEventListener('click', () => window.location.href = 'painel.html');

// Logout
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = "admin.html";
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        mostrarMensagem("Erro ao fazer logout. Tente novamente.");
    }
});

// Logout automático ao fechar
window.addEventListener('beforeunload', async (event) => {
    try {
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch (error) {
        console.error("Erro ao deslogar automaticamente:", error);
    }
});

// --- FUNÇÕES PRINCIPAIS ---

async function carregarTimes() {
    try {
        console.log("Carregando times...");
        const snap = await getDocs(collection(db, "times"));
        times = [];
        
        snap.forEach(doc => {
            times.push({
                id: doc.id,
                nome: doc.data().nome,
                iconeURL: doc.data().iconeURL
            });
        });
        
        console.log("Times carregados:", times);
        timesCountEl.textContent = `${times.length} times`;
        
        if (times.length !== 4) {
            mostrarMensagem(`Atenção: O sistema está configurado para 4 times, mas foram encontrados ${times.length} times no banco de dados.`);
        }
        
        return times.length > 0;
    } catch (error) {
        console.error("Erro ao carregar times:", error);
        mostrarMensagem("Erro ao carregar times do banco de dados.");
        return false;
    }
}

async function verificarUltimaRodada() {
    try {
        console.log("Verificando última rodada...");
        
        // Define a coleção baseada na fase
        const colecaoRodadas = faseAtual === 'fase1' ? 'rodadas2026_fase1' : 
                               faseAtual === 'fase2' ? 'rodadas2026_fase2' : 
                               'rodadas2026_final';
        
        const snap = await getDocs(collection(db, colecaoRodadas));
        let maior = 0;
        
        snap.forEach(doc => {
            const numero = parseInt(doc.id.replace("rodada", ""));
            if (numero > maior) maior = numero;
        });
        
        ultimaRodada = maior;
        ultimaRodadaEl.textContent = maior > 0 ? `${maior}ª rodada` : "Nenhuma rodada";
        proximasRodadasEl.textContent = `${maior + 1}ª até ${maior + 6}ª rodada`;
        
        console.log("Última rodada encontrada:", ultimaRodada);
        return true;
    } catch (error) {
        console.error("Erro ao verificar rodadas:", error);
        mostrarMensagem("Erro ao verificar rodadas existentes.");
        return false;
    }
}

function organizarRodadasTurnoReturno() {
    // Para 4 times, vamos criar um padrão fixo e determinístico
    if (times.length !== 4) {
        console.error("Sistema configurado para exatamente 4 times");
        return [];
    }
    
    // Embaralha os times para aleatorizar a ordem
    const timesEmbaralhados = [...times].sort(() => Math.random() - 0.5);
    console.log("Times embaralhados:", timesEmbaralhados.map(t => t.nome));
    
    const rodadas = [];
    
    // PRIMEIRO TURNO - cada dupla se enfrenta uma vez
    // Vamos criar todas as combinações possíveis primeiro
    const combinacoesPrimeiroTurno = [
        [timesEmbaralhados[0], timesEmbaralhados[1]], // A vs B
        [timesEmbaralhados[2], timesEmbaralhados[3]], // C vs D
        [timesEmbaralhados[0], timesEmbaralhados[2]], // A vs C  
        [timesEmbaralhados[1], timesEmbaralhados[3]], // B vs D
        [timesEmbaralhados[0], timesEmbaralhados[3]], // A vs D
        [timesEmbaralhados[1], timesEmbaralhados[2]]  // B vs C
    ];
    
    // Organiza o primeiro turno em 3 rodadas (2 jogos cada)
    const primeiroTurno = [
        // Rodada 1
        [
            { timeA: combinacoesPrimeiroTurno[0][0], timeB: combinacoesPrimeiroTurno[0][1] }, // A × B
            { timeA: combinacoesPrimeiroTurno[1][0], timeB: combinacoesPrimeiroTurno[1][1] }  // C × D
        ],
        // Rodada 2
        [
            { timeA: combinacoesPrimeiroTurno[2][0], timeB: combinacoesPrimeiroTurno[2][1] }, // A × C
            { timeA: combinacoesPrimeiroTurno[3][0], timeB: combinacoesPrimeiroTurno[3][1] }  // B × D
        ],
        // Rodada 3
        [
            { timeA: combinacoesPrimeiroTurno[4][0], timeB: combinacoesPrimeiroTurno[4][1] }, // A × D
            { timeA: combinacoesPrimeiroTurno[5][0], timeB: combinacoesPrimeiroTurno[5][1] }  // B × C
        ]
    ];
    
    // SEGUNDO TURNO - returno exato com mando invertido
    const segundoTurno = [
        // Rodada 4 (returno da rodada 1)
        [
            { timeA: combinacoesPrimeiroTurno[0][1], timeB: combinacoesPrimeiroTurno[0][0] }, // B × A (returno)
            { timeA: combinacoesPrimeiroTurno[1][1], timeB: combinacoesPrimeiroTurno[1][0] }  // D × C (returno)
        ],
        // Rodada 5 (returno da rodada 2)
        [
            { timeA: combinacoesPrimeiroTurno[2][1], timeB: combinacoesPrimeiroTurno[2][0] }, // C × A (returno)
            { timeA: combinacoesPrimeiroTurno[3][1], timeB: combinacoesPrimeiroTurno[3][0] }  // D × B (returno)
        ],
        // Rodada 6 (returno da rodada 3)
        [
            { timeA: combinacoesPrimeiroTurno[4][1], timeB: combinacoesPrimeiroTurno[4][0] }, // D × A (returno)
            { timeA: combinacoesPrimeiroTurno[5][1], timeB: combinacoesPrimeiroTurno[5][0] }  // C × B (returno)
        ]
    ];
    
    // Combina primeiro turno e segundo turno
    const todasRodadas = [...primeiroTurno, ...segundoTurno];
    
    // Converte para o formato esperado
    todasRodadas.forEach((rodada, index) => {
        const jogosFormatados = rodada.map(jogo => ({
            timeA: jogo.timeA.id,
            timeB: jogo.timeB.id,
            timeANome: jogo.timeA.nome,
            timeBNome: jogo.timeB.nome,
            timeAIcone: jogo.timeA.iconeURL,
            timeBIcone: jogo.timeB.iconeURL,
            hora: "21:00"
        }));
        
        // Embaralha a ordem dos jogos dentro da rodada
        const jogosEmbaralhados = jogosFormatados.sort(() => Math.random() - 0.5);
        
        rodadas.push({
            numero: ultimaRodada + index + 1,
            jogos: jogosEmbaralhados
        });
    });
    
    // Log para verificar o turno/returno
    console.log("Verificação Turno/Returno:");
    const confrontos = new Map();
    
    rodadas.forEach((rodada, rodadaIndex) => {
        console.log(`Rodada ${rodada.numero}:`);
        rodada.jogos.forEach(jogo => {
            const confronto = `${jogo.timeANome} × ${jogo.timeBNome}`;
            const confrontoInverso = `${jogo.timeBNome} × ${jogo.timeANome}`;
            
            if (!confrontos.has(confronto) && !confrontos.has(confrontoInverso)) {
                confrontos.set(confronto, rodadaIndex + 1);
            } else {
                const rodadaAnterior = confrontos.get(confronto) || confrontos.get(confrontoInverso);
                console.log(`  ${confronto} - Returno da rodada ${rodadaAnterior}`);
            }
            
            console.log(`  ${confronto}`);
        });
    });
    
    // Log para verificar o balanceamento
    console.log("Análise de mando de campo:");
    timesEmbaralhados.forEach(time => {
        let mandante = 0;
        let visitante = 0;
        
        rodadas.forEach(rodada => {
            rodada.jogos.forEach(jogo => {
                if (jogo.timeA === time.id) mandante++;
                if (jogo.timeB === time.id) visitante++;
            });
        });
        
        console.log(`${time.nome}: ${mandante} mandante, ${visitante} visitante`);
    });
    
    console.log("Rodadas organizadas (turno/returno correto):", rodadas);
    return rodadas;
}

async function gerarRodadas() {
    try {
        gerarButton.disabled = true;
        gerarButton.innerHTML = "🎲 Gerando... <div class='spinner'></div>";
        gerarButton.classList.add('loading');
        
        console.log("Iniciando geração de rodadas...");
        
        // Gera as rodadas com sistema de turno e returno
        rodadasGeradas = organizarRodadasTurnoReturno();
        
        if (rodadasGeradas.length === 6) {
            mostrarPrevia();
        } else {
            mostrarMensagem("Erro ao gerar rodadas. Verifique se há times suficientes.");
        }
        
    } catch (error) {
        console.error("Erro ao gerar rodadas:", error);
        mostrarMensagem("Erro ao gerar rodadas. Tente novamente.");
    } finally {
        gerarButton.disabled = false;
        gerarButton.innerHTML = "🎲 Gerar Turno/Returno (6 Rodadas)";
        gerarButton.classList.remove('loading');
    }
}

function mostrarPrevia() {
    console.log("Mostrando prévia das rodadas...");
    
    rodadasPreview.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'rodadas-container';
    
    rodadasGeradas.forEach((rodada, rodadaIndex) => {
        const rodadaDiv = document.createElement('div');
        rodadaDiv.className = 'rodada-preview';
        rodadaDiv.setAttribute('data-rodada-index', rodadaIndex);
        
        rodadaDiv.innerHTML = `
            <div class="rodada-header">
                <h3 class="rodada-titulo">${rodada.numero}ª RODADA</h3>
                <button class="btn-inverter-rodada" onclick="inverterJogosRodada(${rodadaIndex})">
                    🔄 Inverter Ordem
                </button>
            </div>
            <div class="jogos-list">
                ${rodada.jogos.map((jogo, jogoIndex) => `
                    <div class="jogo-preview" data-jogo-index="${jogoIndex}">
                        <div class="jogo-hora">${jogo.hora}</div>
                        <div class="jogo-times">
                            <div class="time-info">
                                <img src="${jogo.timeAIcone || 'images/favicon.png'}" alt="${jogo.timeANome}" class="icone-time">
                                <span class="nome-time">${jogo.timeANome}</span>
                            </div>
                            <span class="vs-separator">×</span>
                            <div class="time-info">
                                <img src="${jogo.timeBIcone || 'images/favicon.png'}" alt="${jogo.timeBNome}" class="icone-time">
                                <span class="nome-time">${jogo.timeBNome}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(rodadaDiv);
    });
    
    rodadasPreview.appendChild(container);
    previaCard.style.display = 'block';
    
    // Scroll suave para a prévia
    previaCard.scrollIntoView({ behavior: 'smooth' });
}

function cancelarGeracao() {
    previaCard.style.display = 'none';
    rodadasGeradas = [];
    console.log("Geração cancelada");
}

function confirmarSalvarRodadas() {
    const texto = `Tem certeza que deseja salvar as ${rodadasGeradas.length} rodadas geradas (${ultimaRodada + 1}ª até ${ultimaRodada + 6}ª)?`;
    mostrarConfirmacao(texto, salvarRodadas);
}

async function salvarRodadas() {
    try {
        salvarButton.disabled = true;
        salvarButton.textContent = "💾 Salvando...";
        
        console.log("Salvando rodadas no Firebase...");
        
        // Define a coleção baseada na fase
        const colecaoRodadas = faseAtual === 'fase1' ? 'rodadas2026_fase1' : 
                               faseAtual === 'fase2' ? 'rodadas2026_fase2' : 
                               'rodadas2026_final';
        
        for (const rodada of rodadasGeradas) {
            const rodadaId = `rodada${String(rodada.numero).padStart(2, '0')}`;
            const docRef = doc(db, colecaoRodadas, rodadaId);
            
            // Prepara os jogos sem as informações extras de nome e ícone
            const jogosSalvar = rodada.jogos.map(jogo => ({
                timeA: jogo.timeA,
                timeB: jogo.timeB,
                hora: jogo.hora
            }));
            
            await setDoc(docRef, { jogos: jogosSalvar });
            console.log(`Rodada ${rodada.numero} salva com sucesso`);
        }
        
        mostrarMensagem(`✅ Todas as ${rodadasGeradas.length} rodadas foram salvas com sucesso!`);
        
        // Limpa a prévia e atualiza as informações
        cancelarGeracao();
        await verificarUltimaRodada();
        
    } catch (error) {
        console.error("Erro ao salvar rodadas:", error);
        mostrarMensagem("Erro ao salvar rodadas. Tente novamente.");
    } finally {
        salvarButton.disabled = false;
        salvarButton.textContent = "💾 Salvar Todas as Rodadas";
    }
}

// --- FUNÇÕES DE POPUP ---

function inverterJogosRodada(rodadaIndex) {
    console.log(`Invertendo jogos da rodada ${rodadaIndex + 1}`);
    
    // Inverte a ordem dos jogos na rodada
    if (rodadasGeradas[rodadaIndex] && rodadasGeradas[rodadaIndex].jogos.length === 2) {
        const jogos = rodadasGeradas[rodadaIndex].jogos;
        rodadasGeradas[rodadaIndex].jogos = [jogos[1], jogos[0]];
        
        // Atualiza a visualização apenas desta rodada
        atualizarVisualizacaoRodada(rodadaIndex);
        
        console.log(`Rodada ${rodadaIndex + 1} invertida com sucesso`);
    }
}

function atualizarVisualizacaoRodada(rodadaIndex) {
    const rodadaDiv = document.querySelector(`[data-rodada-index="${rodadaIndex}"]`);
    if (!rodadaDiv) return;
    
    const rodada = rodadasGeradas[rodadaIndex];
    const jogosListDiv = rodadaDiv.querySelector('.jogos-list');
    
    jogosListDiv.innerHTML = rodada.jogos.map((jogo, jogoIndex) => `
        <div class="jogo-preview" data-jogo-index="${jogoIndex}">
            <div class="jogo-hora">${jogo.hora}</div>
            <div class="jogo-times">
                <div class="time-info">
                    <img src="${jogo.timeAIcone || 'images/favicon.png'}" alt="${jogo.timeANome}" class="icone-time">
                    <span class="nome-time">${jogo.timeANome}</span>
                </div>
                <span class="vs-separator">×</span>
                <div class="time-info">
                    <img src="${jogo.timeBIcone || 'images/favicon.png'}" alt="${jogo.timeBNome}" class="icone-time">
                    <span class="nome-time">${jogo.timeBNome}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Adiciona uma animação sutil para indicar a mudança
    rodadaDiv.style.transform = 'scale(1.02)';
    setTimeout(() => {
        rodadaDiv.style.transform = 'scale(1)';
    }, 200);
}

// Torna a função global para ser acessível pelo onclick
window.inverterJogosRodada = inverterJogosRodada;

function mostrarMensagem(mensagem) {
    document.getElementById('mensagem-texto').textContent = mensagem;
    document.getElementById('mensagem-popup').style.display = 'flex';
}

function mostrarConfirmacao(texto, callback) {
    document.getElementById('confirmacao-texto').textContent = texto;
    document.getElementById('confirmacao-popup').style.display = 'flex';
    
    // Remove listeners anteriores
    const simBtn = document.getElementById('confirmar-sim-button');
    const naoBtn = document.getElementById('confirmar-nao-button');
    
    const novoSimBtn = simBtn.cloneNode(true);
    const novoNaoBtn = naoBtn.cloneNode(true);
    
    simBtn.parentNode.replaceChild(novoSimBtn, simBtn);
    naoBtn.parentNode.replaceChild(novoNaoBtn, naoBtn);
    
    novoSimBtn.addEventListener('click', () => {
        fecharPopup('confirmacao-popup');
        callback();
    });
    
    novoNaoBtn.addEventListener('click', () => {
        fecharPopup('confirmacao-popup');
    });
}

function fecharPopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

// Event listeners para fechar popups
document.getElementById('mensagem-ok-button').addEventListener('click', () => {
    fecharPopup('mensagem-popup');
});

// Fechar popup clicando no overlay
document.querySelectorAll('.popup-overlay').forEach(popup => {
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            fecharPopup(popup.id);
        }
    });
});

// Fechar popup com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharPopup('mensagem-popup');
        fecharPopup('confirmacao-popup');
    }
});

// --- INICIALIZAÇÃO ---

async function inicializar() {
    console.log("Inicializando gerador de rodadas...");
    
    try {
        const timesCarregados = await carregarTimes();
        const rodadasVerificadas = await verificarUltimaRodada();
        
        if (timesCarregados && rodadasVerificadas) {
            gerarButton.disabled = false;
            console.log("Inicialização concluída com sucesso");
        } else {
            mostrarMensagem("Erro na inicialização. Verifique a conexão com o banco de dados.");
        }
    } catch (error) {
        console.error("Erro na inicialização:", error);
        mostrarMensagem("Erro ao inicializar o sistema. Recarregue a página.");
    }
}

// Event listener para mudança de fase
document.getElementById("fase-select-gerador").addEventListener("change", async (e) => {
    faseAtual = e.target.value;
    console.log("Fase alterada para:", faseAtual);
    await verificarUltimaRodada();
});

// Inicia quando a página carrega
inicializar();