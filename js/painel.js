// js/painel.js
import { app } from './firebase-config.js'; // Importa o app do arquivo de configuração
import { getFirestore, collection, getDocs, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// SISTEMA DE FASES
let faseAtual = 'fase1'; // 'fase1', 'fase2', 'final'

// --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Salvar a URL atual para redirecionar de volta após o login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = "admin.html";
  }
});
// --- FIM DA VERIFICAÇÃO DE AUTENTICAÇÃO ---

let nomesTimes = {};
let rodadasCarregadas = [];
let paginaAtual = 1;
const porPagina = 5;

const salvarJogoBtn = document.getElementById("salvar-jogo-button");
const logoutButton = document.getElementById("logout-button");

// Função de logout existente
if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "admin.html";
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            mostrarMensagem("Erro ao fazer logout. Tente novamente.");
        }
    });
}

// ----------------------------------------------------
// Lógica de logout ao fechar a janela/aba (já existente)
// ----------------------------------------------------
window.addEventListener('beforeunload', async (event) => {
    try {
        if (auth.currentUser) { // Verifica se há um usuário logado
            await signOut(auth);
            console.log("Usuário deslogado automaticamente ao fechar a janela/aba.");
        }
    } catch (error) {
        console.error("Erro ao deslogar automaticamente no fechamento:", error);
    }
});
// ----------------------------------------------------
// FIM DO BLOCO
// ----------------------------------------------------

async function carregarTimes() {
  const snap = await getDocs(collection(db, "times"));
  const selectA = document.getElementById("timeA");
  const selectB = document.getElementById("timeB");
  const selectCampeao1 = document.getElementById("campeao-fase1");
  const selectCampeao2 = document.getElementById("campeao-fase2");
  
  selectA.innerHTML = '<option value="">Selecione um time</option>';
  selectB.innerHTML = '<option value="">Selecione um time</option>';
  selectCampeao1.innerHTML = '<option value="">Selecione o campeão</option>';
  selectCampeao2.innerHTML = '<option value="">Selecione o campeão</option>';

  snap.forEach(doc => {
    nomesTimes[doc.id] = doc.data().nome;
    
    const optA = document.createElement("option");
    optA.value = doc.id;
    optA.textContent = doc.data().nome;
    selectA.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = doc.id;
    optB.textContent = doc.data().nome;
    selectB.appendChild(optB);
    
    const optC1 = document.createElement("option");
    optC1.value = doc.id;
    optC1.textContent = doc.data().nome;
    selectCampeao1.appendChild(optC1);
    
    const optC2 = document.createElement("option");
    optC2.value = doc.id;
    optC2.textContent = doc.data().nome;
    selectCampeao2.appendChild(optC2);
  });
  
  // Carrega os campeões já definidos
  await carregarCampeoesDefinidos();
}

async function carregarCampeoesDefinidos() {
  try {
    const docRef = doc(db, "configuracoes", "campeoes");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const campeoes = docSnap.data();
      
      if (campeoes.fase1) {
        document.getElementById("campeao-fase1").value = campeoes.fase1;
      }
      
      if (campeoes.fase2) {
        document.getElementById("campeao-fase2").value = campeoes.fase2;
      }
      
      console.log("Campeões carregados:", campeoes);
    }
  } catch (error) {
    console.error("Erro ao carregar campeões:", error);
  }
}

async function salvarCampeoes() {
  const campeaoFase1 = document.getElementById("campeao-fase1").value;
  const campeaoFase2 = document.getElementById("campeao-fase2").value;
  
  if (!campeaoFase1 && !campeaoFase2) {
    mostrarMensagem("Selecione pelo menos um campeão para salvar.");
    return;
  }
  
  try {
    const docRef = doc(db, "configuracoes", "campeoes");
    const dados = {};
    
    if (campeaoFase1) {
      dados.fase1 = campeaoFase1;
    }
    
    if (campeaoFase2) {
      dados.fase2 = campeaoFase2;
    }
    
    await setDoc(docRef, dados, { merge: true });
    
    let mensagem = "Campeões salvos com sucesso!\n\n";
    if (campeaoFase1) {
      mensagem += `Fase 1: ${nomesTimes[campeaoFase1]}\n`;
    }
    if (campeaoFase2) {
      mensagem += `Fase 2: ${nomesTimes[campeaoFase2]}`;
    }
    
    mostrarMensagem(mensagem);
    console.log("Campeões salvos:", dados);
    
  } catch (error) {
    console.error("Erro ao salvar campeões:", error);
    mostrarMensagem("Erro ao salvar campeões. Verifique o console para mais detalhes.");
  }
}

async function sugerirRodada() {
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
  document.getElementById("rodada").value = maior + 1;
}

async function salvarJogo() {
  const rodadaNumForm = parseInt(document.getElementById("rodada").value);
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;
  const timeA = document.getElementById("timeA").value;
  const golsAInput = document.getElementById("golsA").value;
  const timeB = document.getElementById("timeB").value;
  const golsBInput = document.getElementById("golsB").value;

  // Validações
  if (isNaN(rodadaNumForm) || rodadaNumForm < 1) {
      mostrarMensagem("Por favor, insira um número de rodada válido (maior ou igual a 1).");
      return;
  }
  if (!hora) {
      mostrarMensagem("Por favor, preencha a hora do jogo.");
      return;
  }
  if (!timeA || timeA === "" || !timeB || timeB === "") {
      mostrarMensagem("Por favor, selecione ambos os times.");
      return;
  }
  if (timeA === timeB) {
      mostrarMensagem("Os times não podem ser iguais.");
      return;
  }

  const novoJogo = { hora, timeA, timeB };

  // Adiciona data apenas se foi preenchida
  if (data && data.trim() !== '') {
      novoJogo.data = data;
  }

  if (golsAInput.trim() !== '') {
      const golsA = parseInt(golsAInput);
      if (isNaN(golsA)) {
          mostrarMensagem("Por favor, insira um valor numérico válido para os gols do Time A ou deixe em branco.");
          return;
      }
      novoJogo.golsA = golsA;
  }

  if (golsBInput.trim() !== '') {
      const golsB = parseInt(golsBInput);
      if (isNaN(golsB)) {
          mostrarMensagem("Por favor, insira um valor numérico válido para os gols do Time B ou deixe em branco.");
          return;
      }
      novoJogo.golsB = golsB;
  }

  // Define a coleção baseada na fase
  const colecaoRodadas = faseAtual === 'fase1' ? 'rodadas2026_fase1' : 
                         faseAtual === 'fase2' ? 'rodadas2026_fase2' : 
                         'rodadas2026_final';

  const salvarJogoBtn = document.getElementById("salvar-jogo-button");
  const editRodadaNum = salvarJogoBtn.dataset.editRodadaNum;
  const editJogoIndex = salvarJogoBtn.dataset.editJogoIndex;

  // --- LÓGICA DE EDIÇÃO ---
  if (editRodadaNum && editJogoIndex !== undefined && editJogoIndex !== null && editJogoIndex !== "") {
      const rodadaIdOriginal = `rodada${String(parseInt(editRodadaNum)).padStart(2, '0')}`;
      const docRefOriginal = doc(db, colecaoRodadas, rodadaIdOriginal);

      const rodadaIdDestino = `rodada${String(rodadaNumForm).padStart(2, '0')}`;
      const docRefDestino = doc(db, colecaoRodadas, rodadaIdDestino);

      try {
          if (rodadaIdOriginal === rodadaIdDestino) {
              const snap = await getDoc(docRefOriginal);
              if (snap.exists()) {
                  let jogos = snap.data().jogos || [];
                  const index = parseInt(editJogoIndex);

                  if (index >= 0 && index < jogos.length) {
                      jogos[index] = novoJogo;
                      await setDoc(docRefOriginal, { jogos: jogos });
                      mostrarMensagem("Jogo atualizado com sucesso!");
                  } else {
                      mostrarMensagem("Erro ao encontrar o jogo para atualização.");
                  }
              } else {
                  mostrarMensagem("Erro: Rodada de origem não encontrada.");
              }
          } else {
              const snapOriginal = await getDoc(docRefOriginal);
              if (snapOriginal.exists()) {
                  let jogosOriginal = snapOriginal.data().jogos || [];
                  const indexParaRemover = parseInt(editJogoIndex);
                  if (indexParaRemover >= 0 && indexParaRemover < jogosOriginal.length) {
                      jogosOriginal.splice(indexParaRemover, 1);
                      await setDoc(docRefOriginal, { jogos: jogosOriginal });
                  }
              }

              const snapDestino = await getDoc(docRefDestino);
              let jogosDestino = [];
              if (snapDestino.exists()) {
                  jogosDestino = snapDestino.data().jogos || [];
              }
              jogosDestino.push(novoJogo);
              await setDoc(docRefDestino, { jogos: jogosDestino });
              mostrarMensagem("Jogo movido e atualizado com sucesso!");
          }

      } catch (error) {
          console.error("Erro ao atualizar/mover o jogo:", error);
          mostrarMensagem("Ocorreu um erro ao atualizar/mover o jogo. Verifique o console para mais detalhes.");
      }

  } else { // --- LÓGICA DE ADIÇÃO DE NOVO JOGO ---
      const rodadaId = `rodada${String(rodadaNumForm).padStart(2, '0')}`;
      const docRef = doc(db, colecaoRodadas, rodadaId);

      try {
          const docSnap = await getDoc(docRef);
          let jogos = [];
          if (docSnap.exists()) {
              jogos = docSnap.data().jogos || [];
          }
          jogos.push(novoJogo);
          await setDoc(docRef, { jogos });
          mostrarMensagem("Jogo salvo com sucesso!");

      } catch (error) {
          console.error("Erro ao salvar o novo jogo:", error);
          mostrarMensagem("Ocorreu um erro ao salvar o novo jogo. Verifique o console para mais detalhes.");
      }
  }

  // Resetar o estado de edição e o texto do botão
  delete salvarJogoBtn.dataset.editRodadaNum;
  delete salvarJogoBtn.dataset.editJogoIndex;
  salvarJogoBtn.textContent = "Salvar Jogo";

  // Limpar o formulário e sugerir a próxima rodada
  document.getElementById("data").value = '';
  document.getElementById("hora").value = '';
  document.getElementById("timeA").value = '';
  document.getElementById("golsA").value = '';
  document.getElementById("timeB").value = '';
  document.getElementById("golsB").value = '';
  sugerirRodada();

  // Recarregar rodadas no popup, caso esteja aberto
  if (document.getElementById("rodadas-popup").style.display === "flex") {
      abrirPopup();
  }
}

// --- FUNÇÕES DE POPUP PERSONALIZADAS ---
function mostrarMensagem(mensagem) {
  document.getElementById('mensagem-texto').textContent = mensagem;
  // Bloquear interação com a página de fundo
  document.body.classList.add('modal-open');
  document.getElementById('mensagem-popup').style.display = 'flex';
}

function fecharPopup(popupId) {
  // Desbloquear interação com a página de fundo
  document.body.classList.remove('modal-open');
  document.getElementById(popupId).style.display = 'none';
}

window.alert = function(mensagem) {
  mostrarMensagem(mensagem);
};

async function abrirPopup() {
  if (Object.keys(nomesTimes).length === 0) await carregarTimes();

  // Define a coleção baseada na fase
  const colecaoRodadas = faseAtual === 'fase1' ? 'rodadas2026_fase1' : 
                         faseAtual === 'fase2' ? 'rodadas2026_fase2' : 
                         'rodadas2026_final';

  const snap = await getDocs(collection(db, colecaoRodadas));
  rodadasCarregadas = [];
  snap.forEach(doc => {
    const numero = parseInt(doc.id.replace("rodada", ""));
    rodadasCarregadas.push({ numero, jogos: doc.data().jogos });
  });
  rodadasCarregadas.sort((a, b) => a.numero - b.numero);
  paginaAtual = 1;
  atualizarPopup();
  
  // Bloquear interação com a página de fundo
  document.body.classList.add('modal-open');
  document.getElementById("rodadas-popup").style.display = "flex";
}

function atualizarPopup() {
  const container = document.getElementById("lista-rodadas");
  container.innerHTML = "";
  const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
  document.getElementById("total-paginas").textContent = totalPaginas;
  document.getElementById("numero-pagina").value = paginaAtual;

  const inicio = (paginaAtual - 1) * porPagina;
  const fim = inicio + porPagina;
  const rodadasPag = rodadasCarregadas.slice(inicio, fim);

  if (rodadasPag.length === 0) {
      container.innerHTML = "<p style='text-align: center; color: #6c757d; font-size: 1.1rem; padding: 2rem;'>📭 Nenhuma rodada para exibir nesta página.</p>";
      return;
  }

  rodadasPag.forEach(r => {
    const div = document.createElement("div");
    div.className = "rodada";
    
    const rodadaHeader = document.createElement("div");
    rodadaHeader.className = "rodada-header";
    rodadaHeader.innerHTML = `<h2>🏆 Rodada ${String(r.numero).padStart(2, '0')}</h2>`;
    
    const rodadaBody = document.createElement("div");
    rodadaBody.className = "rodada-body";

    r.jogos.forEach((j, jogoIndex) => {
      const nomeA = nomesTimes[j.timeA] || j.timeA;
      const nomeB = nomesTimes[j.timeB] || j.timeB;

      const dataOriginal = new Date(j.data);
      const ano = dataOriginal.getUTCFullYear();
      const mes = dataOriginal.getUTCMonth();
      const dia = dataOriginal.getUTCDate();
      const dataParaExibir = new Date(ano, mes, dia);
      const dataFormatada = j.data ? dataParaExibir.toLocaleDateString('pt-BR') : 'Data não definida';

      const golsAExibir = (j.golsA !== undefined && j.golsA !== null) ? j.golsA : '-';
      const golsBExibir = (j.golsB !== undefined && j.golsB !== null) ? j.golsB : '-';

      const jogoDiv = document.createElement("div");
      jogoDiv.className = "jogo";
      jogoDiv.innerHTML = `
        <div class="jogo-info">
          <strong>${nomeA}</strong> ${golsAExibir} x ${golsBExibir} <strong>${nomeB}</strong>
          <br>
          <small style="color: #6c757d;">📅 ${dataFormatada} • ⏰ ${j.hora}</small>
        </div>
        <button class="botao-editar-jogo"
                            data-rodada-num="${r.numero}"
                            data-jogo-index="${jogoIndex}"
                            data-data="${j.data}"
                            data-hora="${j.hora}"
                            data-time-a-id="${j.timeA}"
                            data-gols-a="${j.golsA === undefined || j.golsA === null ? '' : j.golsA}"
                            data-time-b-id="${j.timeB}"
                            data-gols-b="${j.golsB === undefined || j.golsB === null ? '' : j.golsB}">
                          ✏️ Editar
                        </button>
      `;
      
      rodadaBody.appendChild(jogoDiv);
    });
    
    div.appendChild(rodadaHeader);
    div.appendChild(rodadaBody);
    container.appendChild(div);
  });

  document.querySelectorAll('.botao-editar-jogo').forEach(button => {
      button.addEventListener('click', preencherFormularioParaEdicao);
  });
  
  // Reconfigurar event listeners da paginação imediatamente
  if (typeof window.configurarPaginacao === 'function') {
      window.configurarPaginacao();
  }
}

function preencherFormularioParaEdicao(event) {
    const btn = event.currentTarget;
    const rodadaNum = btn.dataset.rodadaNum;
    const jogoIndex = btn.dataset.jogoIndex;
    const data = btn.dataset.data;
    const hora = btn.dataset.hora;
    const timeA = btn.dataset.timeAId;
    const golsA = btn.dataset.golsA;
    const timeB = btn.dataset.timeBId;
    const golsB = btn.dataset.golsB;

    document.getElementById("rodada").value = rodadaNum;
    document.getElementById("data").value = data;
    document.getElementById("hora").value = hora;
    document.getElementById("timeA").value = timeA;
    document.getElementById("golsA").value = golsA;
    document.getElementById("timeB").value = timeB;
    document.getElementById("golsB").value = golsB;

    salvarJogoBtn.dataset.editRodadaNum = rodadaNum;
    salvarJogoBtn.dataset.editJogoIndex = jogoIndex;
    salvarJogoBtn.textContent = "Atualizar Jogo";

    fecharPopup('rodadas-popup');
    mostrarMensagem("Partida selecionada! Faça suas alterações e clique em 'Atualizar Jogo'.");
}

// Função removida - agora a lógica está nos event listeners diretos

// Função removida - agora a lógica está no event listener direto

document.getElementById("salvar-jogo-button").addEventListener("click", salvarJogo);
document.getElementById("botaoRodadas").addEventListener("click", abrirPopup);
document.getElementById("gerador-rodadas-button").addEventListener("click", () => {
    window.location.href = "gerador-rodadas.html";
});
document.getElementById("salvar-campeoes-button").addEventListener("click", salvarCampeoes);

const mensagemOkButton = document.getElementById("mensagem-ok-button");
if (mensagemOkButton) {
    mensagemOkButton.addEventListener("click", () => {
        fecharPopup('mensagem-popup');
    });
}

carregarTimes();
sugerirRodada();

// --- NOVAS ATRIBUIÇÕES DE EVENT LISTENERS PARA PAGINAÇÃO NO POPUP ---
// --- NOVAS ATRIBUIÇÕES DE EVENT LISTENERS PARA PAGINAÇÃO NO POPUP ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado - configurando event listeners');
    
    // Event listener para mudança de fase
    const faseSelect = document.getElementById("fase-select");
    if (faseSelect) {
        faseSelect.addEventListener("change", (e) => {
            faseAtual = e.target.value;
            console.log("Fase alterada para:", faseAtual);
            
            // Alterna entre formulário de partida e formulário de campeões
            const formPartida = document.getElementById("form-partida");
            const formCampeoes = document.getElementById("form-campeoes");
            const cardHeader = document.querySelector(".card-header h2");
            
            if (faseAtual === 'campeoes') {
                formPartida.style.display = 'none';
                formCampeoes.style.display = 'block';
                cardHeader.textContent = '🏆 Definir Campeões das Fases';
            } else {
                formPartida.style.display = 'block';
                formCampeoes.style.display = 'none';
                cardHeader.textContent = '📝 Cadastrar Nova Partida';
                sugerirRodada();
            }
        });
    }
    
    // Event listeners para paginação - configurados apenas uma vez
    function configurarPaginacao() {
        const btnAnterior = document.getElementById('btn-anterior');
        const btnProximo = document.getElementById('btn-proximo');
        const inputPagina = document.getElementById('numero-pagina');
        
        if (btnAnterior) {
            // Remove listeners existentes
            btnAnterior.replaceWith(btnAnterior.cloneNode(true));
            const novoBtnAnterior = document.getElementById('btn-anterior');
            novoBtnAnterior.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clique no botão ANTERIOR - página atual:', paginaAtual);
                if (paginaAtual > 1) {
                    paginaAtual--;
                    console.log('Nova página:', paginaAtual);
                    atualizarPopup();
                }
            });
        }
        
        if (btnProximo) {
            // Remove listeners existentes
            btnProximo.replaceWith(btnProximo.cloneNode(true));
            const novoBtnProximo = document.getElementById('btn-proximo');
            novoBtnProximo.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clique no botão PRÓXIMO - página atual:', paginaAtual);
                const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
                if (paginaAtual < totalPaginas) {
                    paginaAtual++;
                    console.log('Nova página:', paginaAtual);
                    atualizarPopup();
                }
            });
        }
        
        if (inputPagina) {
            // Remove listeners existentes
            inputPagina.replaceWith(inputPagina.cloneNode(true));
            const novoInputPagina = document.getElementById('numero-pagina');
            novoInputPagina.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
                let novaPagina = parseInt(this.value);
                if (isNaN(novaPagina) || novaPagina < 1) novaPagina = 1;
                if (novaPagina > totalPaginas) novaPagina = totalPaginas;
                paginaAtual = novaPagina;
                console.log('Input mudou para página:', paginaAtual);
                atualizarPopup();
            });
        }
    }
    
    // Configurar paginação quando o DOM estiver pronto
    configurarPaginacao();
    
    // Reconfigurar paginação sempre que o popup for atualizado
    window.configurarPaginacao = configurarPaginacao;

    // ADICIONANDO LISTENER PARA O BOTÃO DE FECHAR DO POPUP DE RODADAS
    const closeButtonRodadas = document.querySelector('#rodadas-popup .close-button');
    if (closeButtonRodadas) {
        closeButtonRodadas.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão X clicado - fechando popup');
            fecharPopup('rodadas-popup');
        });
    }
    
    // ADICIONANDO LISTENER PARA FECHAR MODAL CLICANDO NO OVERLAY
    const rodadasPopup = document.getElementById('rodadas-popup');
    if (rodadasPopup) {
        rodadasPopup.addEventListener('click', function(e) {
            if (e.target === rodadasPopup) {
                console.log('Clique no overlay - fechando popup');
                fecharPopup('rodadas-popup');
            }
        });
    }
    
    // ADICIONANDO LISTENER PARA FECHAR MODAL COM ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const rodadasPopup = document.getElementById('rodadas-popup');
            const mensagemPopup = document.getElementById('mensagem-popup');
            
            if (rodadasPopup && rodadasPopup.style.display === 'flex') {
                console.log('ESC pressionado - fechando popup de rodadas');
                fecharPopup('rodadas-popup');
            }
            if (mensagemPopup && mensagemPopup.style.display === 'flex') {
                console.log('ESC pressionado - fechando popup de mensagem');
                fecharPopup('mensagem-popup');
            }
        }
    });
});
// --- FIM DAS NOVAS ATRIBUIÇÕES ---