// index.js
import { app } from './firebase-config.js'; // Importa o app do arquivo de configuração
import { getFirestore, collection, onSnapshot, doc, getDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const db = getFirestore(app);

// SISTEMA DE FASES
let faseAtual = 'fase1'; // 'fase1', 'fase2', 'final'
let campeoes = {
  fase1: null,
  fase2: null
};

let rodadas = [];
let rodadaAtual = 0;
let times = [];
const tabelaContainer = document.querySelector("#tabela tbody");

// Variáveis para armazenar as funções de "unsubscribe" dos listeners
let unsubscribeTimes = null;
let unsubscribeRodadas = null;

// NAVEGAÇÃO DE FASES
window.faseAnterior = function() {
  console.log("Fase anterior clicada. Fase atual:", faseAtual);
  if (faseAtual === 'fase2') {
    faseAtual = 'fase1';
    carregarFase();
  } else if (faseAtual === 'final') {
    faseAtual = 'fase2';
    carregarFase();
  }
}

window.proximaFase = function() {
  console.log("Próxima fase clicada. Fase atual:", faseAtual);
  if (faseAtual === 'fase1') {
    faseAtual = 'fase2';
    carregarFase();
  } else if (faseAtual === 'fase2') {
    faseAtual = 'final';
    carregarFase();
  }
}

// NAVEGAÇÃO DE RODADAS
window.anteriorRodada = function() {
  console.log("anteriorRodada clicado. Rodada atual:", rodadaAtual);
  if (rodadaAtual > 0) {
    rodadaAtual--;
    mostrarRodada();
  }
}

window.proximaRodada = function() {
  console.log("proximaRodada clicado. Rodada atual:", rodadaAtual);
  if (rodadaAtual < rodadas.length - 1) {
    rodadaAtual++;
    mostrarRodada();
  }
}

// --- CARREGAR CAMPEÕES ---
async function carregarCampeoes() {
  try {
    const docRef = doc(db, "configuracoes", "campeoes");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      campeoes = docSnap.data();
      console.log("Campeões carregados:", campeoes);
    }
  } catch (error) {
    console.error("Erro ao carregar campeões:", error);
  }
}

// --- CARREGAR FASE ---
async function carregarFase() {
  console.log("Carregando fase:", faseAtual);
  
  // Atualiza o título da fase
  atualizarTituloFase();
  
  // Carrega os dados da fase
  await carregarRodadasEmTempoReal();
  
  // Se for a final, mostra visualização especial
  if (faseAtual === 'final') {
    console.log("Chamando mostrarFinal()...");
    mostrarFinal();
  } else {
    console.log("Chamando mostrarRodada()...");
  }
}

// --- ATUALIZAR TÍTULO DA FASE ---
function atualizarTituloFase() {
  const tituloFase = document.getElementById('titulo-fase');
  if (!tituloFase) return;
  
  let titulo = '';
  switch(faseAtual) {
    case 'fase1':
      titulo = 'PRIMEIRA FASE';
      break;
    case 'fase2':
      titulo = 'SEGUNDA FASE';
      break;
    case 'final':
      titulo = 'FINAL';
      break;
  }
  
  tituloFase.textContent = titulo;
  
  // Atualiza visibilidade dos botões de navegação de fase
  const btnAnteriorFase = document.getElementById('btn-fase-anterior');
  const btnProximaFase = document.getElementById('btn-fase-proxima');
  
  if (btnAnteriorFase) {
    btnAnteriorFase.style.visibility = faseAtual === 'fase1' ? 'hidden' : 'visible';
  }
  
  if (btnProximaFase) {
    btnProximaFase.style.visibility = faseAtual === 'final' ? 'hidden' : 'visible';
  }
  
  // Atualiza layout do container
  const container = document.querySelector('.container');
  const tabelaDiv = document.querySelector('.tabela');
  const jogosDiv = document.querySelector('.jogos');
  const rodadaHeader = document.querySelector('.rodada-header');
  const faseNav = document.querySelector('.fase-navigation');
  
  if (faseAtual === 'final') {
    // Layout da final
    container.classList.add('final-layout');
    if (tabelaDiv) tabelaDiv.style.display = 'none';
    if (jogosDiv) {
      jogosDiv.style.flex = '1';
      jogosDiv.style.maxWidth = '800px';
      jogosDiv.style.margin = '0 auto';
    }
    if (rodadaHeader) rodadaHeader.style.display = 'none';
  } else {
    // Layout normal (fases 1 e 2)
    container.classList.remove('final-layout');
    if (tabelaDiv) tabelaDiv.style.display = 'block';
    if (jogosDiv) {
      jogosDiv.style.flex = '1';
      jogosDiv.style.maxWidth = 'none';
      jogosDiv.style.margin = '0';
    }
    if (rodadaHeader) rodadaHeader.style.display = 'flex';
  }
}

// --- FUNÇÃO DE CARREGAMENTO DE TIMES EM TEMPO REAL ---
async function carregarTimesEmTempoReal() {
  console.log("Configurando listener para times...");
  // Cancela o listener anterior se existir
  if (unsubscribeTimes) {
    unsubscribeTimes();
  }

  // Configura o novo listener
  unsubscribeTimes = onSnapshot(collection(db, "times"), (snapshot) => {
    times = snapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome,
      iconeURL: doc.data().iconeURL
    }));
    console.log("Times atualizados (tempo real):", times.length);
    // Após atualizar os times, recarrega as rodadas para garantir a consistência
    // e recalcula a tabela (se já houver rodadas carregadas)
    if (rodadas.length > 0) {
      atualizarTabela();
      mostrarRodada(); // Re-renderiza a rodada atual com os novos dados de times
    }
  }, (error) => {
    console.error("Erro ao carregar times em tempo real:", error);
  });
}

// --- FUNÇÃO DE CARREGAMENTO DE RODADAS EM TEMPO REAL ---
async function carregarRodadasEmTempoReal() {
  console.log("Configurando listener para rodadas da", faseAtual);
  // Cancela o listener anterior se existir
  if (unsubscribeRodadas) {
    unsubscribeRodadas();
  }

  // Define a coleção baseada na fase
  const colecaoRodadas = faseAtual === 'fase1' ? 'rodadas2026_fase1' : 
                         faseAtual === 'fase2' ? 'rodadas2026_fase2' : 
                         'rodadas2026_final';

  // Configura o novo listener
  unsubscribeRodadas = onSnapshot(collection(db, colecaoRodadas), (snapshot) => {
    rodadas = snapshot.docs.map(doc => ({
      numero: parseInt(doc.id.replace("rodada", "")),
      jogos: doc.data().jogos
    })).sort((a, b) => a.numero - b.numero);
    console.log("Rodadas atualizadas (tempo real):", rodadas.length);

    // Encontra a rodada com o próximo jogo mais próximo (prioriza jogos futuros)
    let rodadaMaisProxima = 0;
    let menorDiferencaFutura = Infinity;
    let menorDiferencaPassada = Infinity;
    let rodadaFutura = -1;
    let rodadaPassada = -1;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas

    for (let i = 0; i < rodadas.length; i++) {
        const rodada = rodadas[i];
        
        // Para cada rodada, encontra a data mais próxima entre todos os jogos
        let menorDiferencaRodadaFutura = Infinity;
        let menorDiferencaRodadaPassada = Infinity;
        
        rodada.jogos.forEach(jogo => {
            if (jogo.data) {
                const dataJogo = new Date(jogo.data);
                dataJogo.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas
                
                const diferenca = dataJogo.getTime() - hoje.getTime();
                
                if (diferenca >= 0) { // Jogo futuro ou hoje
                    if (diferenca < menorDiferencaRodadaFutura) {
                        menorDiferencaRodadaFutura = diferenca;
                    }
                } else { // Jogo passado
                    const diferencaAbsoluta = Math.abs(diferenca);
                    if (diferencaAbsoluta < menorDiferencaRodadaPassada) {
                        menorDiferencaRodadaPassada = diferencaAbsoluta;
                    }
                }
            }
        });
        
        // Verifica se esta rodada tem o melhor jogo futuro
        if (menorDiferencaRodadaFutura < menorDiferencaFutura) {
            menorDiferencaFutura = menorDiferencaRodadaFutura;
            rodadaFutura = i;
        }
        
        // Verifica se esta rodada tem o melhor jogo passado
        if (menorDiferencaRodadaPassada < menorDiferencaPassada) {
            menorDiferencaPassada = menorDiferencaRodadaPassada;
            rodadaPassada = i;
        }
    }
    
    // Prioriza jogos futuros, se não houver, usa o mais recente do passado
    if (rodadaFutura !== -1) {
        rodadaAtual = rodadaFutura;
    } else if (rodadaPassada !== -1) {
        rodadaAtual = rodadaPassada;
    } else {
        rodadaAtual = 0; // Fallback para primeira rodada
    }

    atualizarTabela();
    
    // Só chama mostrarRodada se NÃO estiver na final
    if (faseAtual !== 'final') {
      mostrarRodada();
    } else {
      mostrarFinal();
    }
  }, (error) => {
    console.error("Erro ao carregar rodadas em tempo real:", error);
  });
}

function inicializarTabela() {
  let tabela = {};
  times.forEach(time => {
    tabela[time.id] = {
      nome: time.nome,
      iconeURL: time.iconeURL,
      PTS: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0
    };
  });
  return tabela;
}

function atualizarTabela() {
  console.log("Atualizando tabela...");
  let tabelaCalculada = inicializarTabela();
  rodadas.forEach(rod => {
    rod.jogos.forEach(jogo => {
      if (jogo.golsA !== undefined && jogo.golsA !== null &&
          jogo.golsB !== undefined && jogo.golsB !== null) {

        const golsA = parseInt(jogo.golsA);
        const golsB = parseInt(jogo.golsB);

        if (!isNaN(golsA) && !isNaN(golsB)) {
          const timeA = tabelaCalculada[jogo.timeA];
          const timeB = tabelaCalculada[jogo.timeB];

          if (!timeA || !timeB) {
              console.warn(`Time não encontrado para jogo: ${jogo.timeA} ou ${jogo.timeB}`);
              return;
          }

          timeA.J++; timeB.J++;
          timeA.GP += golsA;
          timeA.GC += golsB;
          timeB.GP += golsB;
          timeB.GC += golsA;

          if (golsA > golsB) {
            timeA.V++; timeB.D++; timeA.PTS += 3;
          } else if (golsA < golsB) {
            timeB.V++; timeA.D++; timeB.PTS += 3;
          } else {
            timeA.E++; timeB.E++; timeA.PTS += 1; timeB.PTS += 1;
          }
        } else {
            console.warn(`Gols inválidos (não numéricos) para jogo: ${jogo.timeA} x ${jogo.timeB}. Não computado na tabela.`);
        }
      }
    });
  });
  renderizarTabela(tabelaCalculada);
  console.log("Tabela atualizada.");
}

function renderizarTabela(tabelaData) {
  console.log("Renderizando tabela...");
  const lista = Object.values(tabelaData);
  lista.forEach(t => {
    t.SG = t.GP - t.GC;
    let percentual = (t.J && t.PTS !== undefined && t.J !== 0) ? ((t.PTS / (t.J * 3)) * 100) : 0;
    t['%'] = Math.round(percentual).toString();
  });
  lista.sort((a, b) => b.PTS - a.PTS || b.V - a.V || b.SG - a.SG);

  tabelaContainer.innerHTML = "";
  if (lista.length === 0) {
    tabelaContainer.innerHTML = `<tr><td colspan="11">Nenhum dado de tabela disponível.</td></tr>`;
    return;
  }

  lista.forEach((time, index) => {
    const posClass = `pos-${index + 1}`;
    tabelaContainer.innerHTML += `
      <tr>
        <td class='posicao ${posClass}'>${index + 1}</td>
        <td><div class="tabela-time"><img src="${time.iconeURL || `img/icones/${time.nome}.png`}" class="icone-time">${time.nome}</div></td>
        <td>${time.PTS}</td><td>${time.J}</td><td>${time.V}</td><td>${time.E}</td><td>${time.D}</td><td>${time.GP}</td><td>${time.GC}</td><td>${time.SG}</td><td>${time['%']}%</td>
      </tr>`;
  });
  console.log("Tabela renderizada.");
}

function mostrarRodada() {
  const container = document.getElementById("lista-jogos");
  
  container.innerHTML = "";
  if (rodadaAtual === -1 || !rodadas[rodadaAtual]) {
    document.getElementById("rodada-titulo").textContent = "Nenhuma Rodada Encontrada";
    console.warn("Nenhuma rodada para mostrar ou rodadaAtual inválida.");
    return;
  }

  const rodada = rodadas[rodadaAtual];
  document.getElementById("rodada-titulo").textContent = `${rodada.numero}ª RODADA`;
  console.log(`Mostrando ${rodada.numero}ª Rodada...`);

  rodada.jogos.forEach(jogo => {
    const div = document.createElement("div");
    div.className = "jogo-novo";

    const dataOriginal = new Date(jogo.data);
    const ano = dataOriginal.getUTCFullYear();
    const mes = dataOriginal.getUTCMonth();
    const dia = dataOriginal.getUTCDate();
    const dataParaExibir = new Date(ano, mes, dia);
    const dataFormatada = jogo.data ? dataParaExibir.toLocaleDateString('pt-BR') : 'Data não definida';

    const timeA = times.find(t => t.id === jogo.timeA) || { nome: jogo.timeA, iconeURL: `img/icones/default.png` };
    const timeB = times.find(t => t.id === jogo.timeB) || { nome: jogo.timeB, iconeURL: `img/icones/default.png` };
    const iconeA = timeA.iconeURL || `img/icones/${timeA.nome}.png`;
    const iconeB = timeB.iconeURL || `img/icones/${timeB.nome}.png`;

    div.innerHTML = `
      <div class="jogo-cabecalho">${dataFormatada} • ${jogo.hora}</div>
      <div class="jogo-conteudo alinhado">
        <div class="time">
          <img src="${iconeA}" alt="${timeA.nome}" class="icone-time">
          <span class="nome-time">${timeA.nome}</span>
        </div>
        <div class="placar">
          <span class="gols">${jogo.golsA ?? "-"}</span>
          <span>x</span>
          <span class="gols">${jogo.golsB ?? "-"}</span>
        </div>
        <div class="time">
          <img src="${iconeB}" alt="${timeB.nome}" class="icone-time">
          <span class="nome-time">${timeB.nome}</span>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  console.log(`Rodada ${rodada.numero} renderizada.`);
}

// --- MOSTRAR FINAL ---
function mostrarFinal() {
  console.log("Mostrando final...");
  console.log("Rodadas disponíveis:", rodadas.length);
  console.log("Campeões:", campeoes);
  
  const container = document.getElementById("lista-jogos");
  
  if (!container) {
    console.error("Container 'lista-jogos' não encontrado!");
    return;
  }
  
  // Verifica se há jogo cadastrado na final
  const temJogoCadastrado = rodadas.length > 0 && rodadas[0].jogos.length > 0;
  
  console.log("Tem jogo cadastrado?", temJogoCadastrado);
  
  if (temJogoCadastrado) {
    // CASO 1: Jogo já cadastrado com times definidos
    const jogo = rodadas[0].jogos[0];
    
    const dataOriginal = new Date(jogo.data);
    const ano = dataOriginal.getUTCFullYear();
    const mes = dataOriginal.getUTCMonth();
    const dia = dataOriginal.getUTCDate();
    const dataParaExibir = new Date(ano, mes, dia);
    const dataFormatada = jogo.data ? dataParaExibir.toLocaleDateString('pt-BR') : 'Data não definida';
    
    const timeA = times.find(t => t.id === jogo.timeA) || { nome: jogo.timeA, iconeURL: `img/icones/default.png` };
    const timeB = times.find(t => t.id === jogo.timeB) || { nome: jogo.timeB, iconeURL: `img/icones/default.png` };
    const iconeA = timeA.iconeURL || `img/icones/${timeA.nome}.png`;
    const iconeB = timeB.iconeURL || `img/icones/${timeB.nome}.png`;
    
    container.innerHTML = `
      <div class="final-wrapper">
        <div class="jogo-final">
          <div class="final-badge">GRANDE FINAL</div>
          <div class="jogo-cabecalho">${dataFormatada} • ${jogo.hora}</div>
          <div class="jogo-conteudo alinhado">
            <div class="time">
              <img src="${iconeA}" alt="${timeA.nome}" class="icone-time">
              <span class="nome-time">${timeA.nome}</span>
            </div>
            <div class="placar">
              <span class="gols">${jogo.golsA ?? "-"}</span>
              <span>x</span>
              <span class="gols">${jogo.golsB ?? "-"}</span>
            </div>
            <div class="time">
              <img src="${iconeB}" alt="${timeB.nome}" class="icone-time">
              <span class="nome-time">${timeB.nome}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // CASO 2: Jogo ainda não cadastrado - mostra preview com campeões (se houver)
    
    console.log("Entrando no CASO 2 - preview da final");
    
    // Busca informações dos campeões (se definidos)
    let timeFase1 = null;
    let timeFase2 = null;
    
    if (campeoes.fase1) {
      timeFase1 = times.find(t => t.id === campeoes.fase1);
      console.log("Campeão Fase 1:", timeFase1);
    }
    
    if (campeoes.fase2) {
      timeFase2 = times.find(t => t.id === campeoes.fase2);
      console.log("Campeão Fase 2:", timeFase2);
    }
    
    // Monta HTML para Time A (Fase 1)
    const htmlTimeA = timeFase1 ? `
      <div class="time">
        <img src="${timeFase1.iconeURL || 'img/icones/default.png'}" alt="${timeFase1.nome}" class="icone-time">
        <span class="nome-time">${timeFase1.nome}</span>
      </div>
    ` : `
      <div class="time">
        <div class="placeholder-time">
          <div class="placeholder-icon">?</div>
          <span class="nome-time-placeholder">Venc. Primeira Fase</span>
        </div>
      </div>
    `;
    
    // Monta HTML para Time B (Fase 2)
    const htmlTimeB = timeFase2 ? `
      <div class="time">
        <img src="${timeFase2.iconeURL || 'img/icones/default.png'}" alt="${timeFase2.nome}" class="icone-time">
        <span class="nome-time">${timeFase2.nome}</span>
      </div>
    ` : `
      <div class="time">
        <div class="placeholder-time">
          <div class="placeholder-icon">?</div>
          <span class="nome-time-placeholder">Venc. Segunda Fase</span>
        </div>
      </div>
    `;
    
    const htmlFinal = `
      <div class="final-wrapper">
        <div class="jogo-final-preview">
          <div class="final-badge">GRANDE FINAL</div>
          <div class="jogo-conteudo alinhado">
            ${htmlTimeA}
            <div class="placar-preview">
              <span class="vs-text">VS</span>
            </div>
            ${htmlTimeB}
          </div>
        </div>
      </div>
    `;
    
    console.log("HTML gerado:", htmlFinal.substring(0, 100) + "...");
    container.innerHTML = htmlFinal;
    console.log("HTML inserido no container");
  }
}

// --- DETERMINAR FASE INICIAL BASEADA EM DATAS ---
async function determinarFaseInicial() {
  console.log("Determinando fase inicial baseada em datas...");
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const fases = ['fase1', 'fase2', 'final'];
  let melhorFase = 'fase1'; // Fallback padrão
  let menorDiferencaFutura = Infinity;
  let menorDiferencaPassada = Infinity;
  let faseFutura = null;
  let fasePassada = null;
  
  for (const fase of fases) {
    const colecaoRodadas = fase === 'fase1' ? 'rodadas2026_fase1' : 
                           fase === 'fase2' ? 'rodadas2026_fase2' : 
                           'rodadas2026_final';
    
    try {
      const snap = await getDocs(collection(db, colecaoRodadas));
      
      if (snap.empty) {
        console.log(`Fase ${fase}: sem rodadas cadastradas`);
        continue;
      }
      
      // Procura a data mais próxima nesta fase
      let menorDiferencaFuturaFase = Infinity;
      let menorDiferencaPassadaFase = Infinity;
      
      snap.forEach(doc => {
        const jogos = doc.data().jogos || [];
        jogos.forEach(jogo => {
          if (jogo.data) {
            const dataJogo = new Date(jogo.data);
            dataJogo.setHours(0, 0, 0, 0);
            
            const diferenca = dataJogo.getTime() - hoje.getTime();
            
            if (diferenca >= 0) { // Jogo futuro ou hoje
              if (diferenca < menorDiferencaFuturaFase) {
                menorDiferencaFuturaFase = diferenca;
              }
            } else { // Jogo passado
              const diferencaAbsoluta = Math.abs(diferenca);
              if (diferencaAbsoluta < menorDiferencaPassadaFase) {
                menorDiferencaPassadaFase = diferencaAbsoluta;
              }
            }
          }
        });
      });
      
      // Verifica se esta fase tem o melhor jogo futuro
      if (menorDiferencaFuturaFase < menorDiferencaFutura) {
        menorDiferencaFutura = menorDiferencaFuturaFase;
        faseFutura = fase;
      }
      
      // Verifica se esta fase tem o melhor jogo passado
      if (menorDiferencaPassadaFase < menorDiferencaPassada) {
        menorDiferencaPassada = menorDiferencaPassadaFase;
        fasePassada = fase;
      }
      
    } catch (error) {
      console.error(`Erro ao verificar fase ${fase}:`, error);
    }
  }
  
  // Prioriza jogos futuros, se não houver, usa o mais recente do passado
  if (faseFutura) {
    melhorFase = faseFutura;
    console.log(`Fase inicial determinada: ${melhorFase} (próximo jogo em ${Math.ceil(menorDiferencaFutura / (1000 * 60 * 60 * 24))} dias)`);
  } else if (fasePassada) {
    melhorFase = fasePassada;
    console.log(`Fase inicial determinada: ${melhorFase} (último jogo há ${Math.ceil(menorDiferencaPassada / (1000 * 60 * 60 * 24))} dias)`);
  } else {
    console.log(`Nenhuma fase com datas encontrada. Usando fase padrão: ${melhorFase}`);
  }
  
  return melhorFase;
}

// --- FUNÇÃO DE INICIALIZAÇÃO QUE AGORA ATIVA OS LISTENERS ---
(async () => {
  // Carrega os campeões primeiro
  await carregarCampeoes();
  
  // Primeiramente, configura o listener para times
  await carregarTimesEmTempoReal();
  
  // Determina qual fase deve ser exibida inicialmente
  faseAtual = await determinarFaseInicial();
  
  // Carrega a fase determinada
  await carregarFase();
  
  console.log("Inicialização de listeners completa.");
  console.log("Funções de navegação acessíveis:", typeof window.anteriorRodada === 'function', typeof window.proximaRodada === 'function');
})();

// Opcional: Para limpar os listeners quando o usuário sai da página (boa prática)
window.addEventListener('beforeunload', () => {
    if (unsubscribeTimes) {
        unsubscribeTimes();
        console.log("Listener de times desinscrito.");
    }
    if (unsubscribeRodadas) {
        unsubscribeRodadas();
        console.log("Listener de rodadas desinscrito.");
    }
});