// js/gerador-times.js
import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const auth = getAuth(app);

// Supabase via CDN global
const SUPABASE_URL = 'https://yaapgjkvkhsfsskkbmso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYXBnamt2a2hzZnNza2tibXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTQ3MjUsImV4cCI6MjA3MDY3MDcyNX0.RiPWRX__AjuioaLVU5gkJFuOpVdBYwCN0HuD2gd0laM';
let db = null;

// Estado da aplicação
const state = {
  jogadores: [],          // [{ id, nome, nivel, selecionado, goleiro }]
  config: {
    numTimes: 2,
    jogadoresPorTime: 5,
    separarGoleiros: false,
  },
  times: [],              // [{ id, nome, jogadores[], forca }]
  historicoDeTrocas: [],  // snapshots para desfazer
};

// ─── AUTENTICAÇÃO (Tarefa 2) ───────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'admin.html';
    return;
  }
  inicializarSupabase();
  inicializar();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'admin.html';
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    mostrarMensagem('Erro ao fazer logout. Tente novamente.');
  }
});

document.getElementById('voltar-button').addEventListener('click', () => {
  window.location.href = 'painel.html';
});

// ─── SUPABASE ──────────────────────────────────────────────────────────────

function inicializarSupabase() {
  if (typeof supabase !== 'undefined' && !db) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase inicializado');
  }
}

// ─── CARREGAMENTO DE JOGADORES (Tarefa 3) ─────────────────────────────────

async function carregarJogadores() {
  const container = document.getElementById('lista-jogadores-container');
  container.innerHTML = '<p class="loading-text">Carregando jogadores...</p>';

  try {
    const { data, error } = await db
      .from('jogadores')
      .select('id, nome, nivel')
      .order('nome');

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading-text">Nenhum jogador cadastrado. Adicione jogadores pelo painel de administração.</p>';
      return;
    }

    // Preservar seleção/goleiro existentes ao recarregar
    const selecaoAnterior = new Map(state.jogadores.map(j => [j.id, { selecionado: j.selecionado, goleiro: j.goleiro }]));

    state.jogadores = data.map(j => {
      const anterior = selecaoAnterior.get(j.id) || {};
      return {
        id: j.id,
        nome: j.nome,
        nivel: j.nivel ?? 1,
        selecionado: anterior.selecionado ?? false,
        goleiro: anterior.goleiro ?? false,
      };
    });

    renderizarLista(state.jogadores);
    atualizarContador();
    atualizarTotalNecessario();
  } catch (err) {
    console.error('Erro ao carregar jogadores:', err);
    container.innerHTML = '<p class="loading-text">Erro ao carregar jogadores. Verifique sua conexão e recarregue a página.</p>';
  }
}

function renderizarEstrelas(nivel) {
  const n = Math.max(1, Math.min(5, nivel));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function renderizarLista(jogadores) {
  const container = document.getElementById('lista-jogadores-container');
  if (!jogadores.length) {
    container.innerHTML = '<p class="loading-text">Nenhum jogador cadastrado. Adicione jogadores pelo painel de administração.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'lista-jogadores';
  ul.id = 'lista-jogadores';

  jogadores.forEach(j => {
    ul.appendChild(criarItemJogador(j));
  });

  container.innerHTML = '';
  container.appendChild(ul);
}

function criarItemJogador(j) {
  const li = document.createElement('li');
  li.className = 'jogador-item' + (j.selecionado ? ' selecionado' : '');
  li.dataset.id = j.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'jogador-checkbox';
  checkbox.checked = j.selecionado;
  checkbox.addEventListener('change', () => toggleSelecao(j.id));

  const estrelas = document.createElement('span');
  estrelas.className = 'jogador-estrelas';
  estrelas.textContent = renderizarEstrelas(j.nivel);
  estrelas.title = 'Clique para editar o nível';
  estrelas.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirEdicaoNivel(j.id);
  });

  const nome = document.createElement('span');
  nome.className = 'jogador-nome';
  nome.textContent = j.nome;

  li.addEventListener('click', (e) => {
    if (e.target === checkbox || e.target === estrelas) return;
    toggleSelecao(j.id);
  });

  li.appendChild(checkbox);
  li.appendChild(estrelas);
  li.appendChild(nome);

  // Botão goleiro (visível apenas quando separarGoleiros está ativo)
  if (state.config.separarGoleiros) {
    const btnGoleiro = document.createElement('button');
    btnGoleiro.className = 'btn-goleiro' + (j.goleiro ? ' ativo' : '');
    btnGoleiro.textContent = j.goleiro ? '🧤 Goleiro' : '🧤';
    btnGoleiro.title = 'Marcar como goleiro';
    btnGoleiro.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGoleiro(j.id);
    });
    li.appendChild(btnGoleiro);
  }

  return li;
}

// ─── SELEÇÃO DE JOGADORES (Tarefa 4) ──────────────────────────────────────

function toggleSelecao(id) {
  const j = state.jogadores.find(x => x.id === id);
  if (!j) return;
  j.selecionado = !j.selecionado;

  // Atualizar item na lista sem re-renderizar tudo
  const li = document.querySelector(`.jogador-item[data-id="${id}"]`);
  if (li) {
    li.classList.toggle('selecionado', j.selecionado);
    const cb = li.querySelector('.jogador-checkbox');
    if (cb) cb.checked = j.selecionado;
  }

  atualizarContador();
  atualizarTotalNecessario();
}

function selecionarTodos() {
  state.jogadores.forEach(j => { j.selecionado = true; });
  renderizarLista(state.jogadores);
  aplicarFiltroAtual();
  atualizarContador();
  atualizarTotalNecessario();
}

function limparSelecao() {
  state.jogadores.forEach(j => { j.selecionado = false; });
  renderizarLista(state.jogadores);
  aplicarFiltroAtual();
  atualizarContador();
  atualizarTotalNecessario();
}

function aplicarFiltroAtual() {
  const input = document.getElementById('busca-jogador-input');
  if (!input) return;
  const termo = input.value.toLowerCase().trim();
  if (!termo) return;
  document.querySelectorAll('.jogador-item').forEach(li => {
    const nome = li.querySelector('.jogador-nome')?.textContent.toLowerCase() || '';
    li.style.display = nome.includes(termo) ? '' : 'none';
  });
}

function atualizarContador() {
  const selecionados = state.jogadores.filter(j => j.selecionado).length;
  document.getElementById('contador-selecionados').textContent =
    `${selecionados} jogador${selecionados !== 1 ? 'es' : ''} selecionado${selecionados !== 1 ? 's' : ''}`;
  validarBotaoGerar();
}

// ─── EDIÇÃO DE NÍVEL INLINE (Tarefa 5) ────────────────────────────────────

function abrirEdicaoNivel(id) {
  const j = state.jogadores.find(x => x.id === id);
  if (!j) return;

  const li = document.querySelector(`.jogador-item[data-id="${id}"]`);
  if (!li) return;

  const estrelasEl = li.querySelector('.jogador-estrelas');
  if (!estrelasEl || estrelasEl.querySelector('select')) return; // já aberto

  const select = document.createElement('select');
  select.className = 'nivel-select-inline';
  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = renderizarEstrelas(i);
    if (i === j.nivel) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', async () => {
    await salvarEdicaoNivel(id, parseInt(select.value));
  });

  select.addEventListener('blur', () => {
    // Fechar sem salvar se perder foco sem mudança
    estrelasEl.textContent = renderizarEstrelas(j.nivel);
    if (estrelasEl.contains(select)) estrelasEl.removeChild(select);
  });

  estrelasEl.textContent = '';
  estrelasEl.appendChild(select);
  select.focus();
}

async function salvarEdicaoNivel(id, novoNivel) {
  if (novoNivel < 1 || novoNivel > 5) {
    mostrarMensagem('O nível deve ser entre 1 e 5.');
    return;
  }

  const j = state.jogadores.find(x => x.id === id);
  if (!j) return;

  const nivelAnterior = j.nivel;
  j.nivel = novoNivel; // atualização otimista

  // Atualizar visual imediatamente
  const li = document.querySelector(`.jogador-item[data-id="${id}"]`);
  if (li) {
    const estrelasEl = li.querySelector('.jogador-estrelas');
    if (estrelasEl) estrelasEl.textContent = renderizarEstrelas(novoNivel);
  }

  try {
    const { error } = await db
      .from('jogadores')
      .update({ nivel: novoNivel })
      .eq('id', id);

    if (error) throw error;
    console.log(`Nível do jogador ${j.nome} atualizado para ${novoNivel}`);
  } catch (err) {
    console.error('Erro ao atualizar nível:', err);
    // Reverter
    j.nivel = nivelAnterior;
    const li2 = document.querySelector(`.jogador-item[data-id="${id}"]`);
    if (li2) {
      const estrelasEl = li2.querySelector('.jogador-estrelas');
      if (estrelasEl) estrelasEl.textContent = renderizarEstrelas(nivelAnterior);
    }
    mostrarMensagem('Erro ao salvar o nível. Tente novamente.');
  }
}

// ─── CONFIGURAÇÃO DA PELADA (Tarefa 6) ────────────────────────────────────

function atualizarTotalNecessario() {
  const { numTimes, jogadoresPorTime } = state.config;
  const total = numTimes * jogadoresPorTime;
  document.getElementById('total-necessario').textContent = `${total} jogadores`;

  const selecionados = state.jogadores.filter(j => j.selecionado).length;
  const alertaEl = document.getElementById('alerta-diferenca');

  if (selecionados !== total) {
    const diff = total - selecionados;
    if (diff > 0) {
      alertaEl.textContent = `Você selecionou ${selecionados} jogadores, mas a configuração exige ${total}. Faltam ${diff} vagas.`;
    } else {
      alertaEl.textContent = `Você selecionou ${selecionados} jogadores, mas a configuração exige ${total}. Há ${Math.abs(diff)} jogadores a mais.`;
    }
    alertaEl.style.display = 'block';
  } else {
    alertaEl.style.display = 'none';
  }

  validarBotaoGerar();
}

function validarConfiguracao() {
  const { numTimes, jogadoresPorTime } = state.config;
  const total = numTimes * jogadoresPorTime;
  const selecionados = state.jogadores.filter(j => j.selecionado).length;
  return selecionados === total;
}

function validarBotaoGerar() {
  const btn = document.getElementById('gerar-times-button');
  const selecionados = state.jogadores.filter(j => j.selecionado).length;

  if (selecionados < 2) {
    btn.disabled = true;
    return;
  }

  btn.disabled = !validarConfiguracao();
  atualizarAvisoGoleiros();
}

function toggleSepararGoleiros() {
  state.config.separarGoleiros = document.getElementById('separar-goleiros-toggle').checked;

  if (!state.config.separarGoleiros) {
    // Limpar marcações de goleiro ao desativar
    state.jogadores.forEach(j => { j.goleiro = false; });
    document.getElementById('aviso-goleiros').style.display = 'none';
  }

  renderizarLista(state.jogadores);
  atualizarContador();
  atualizarTotalNecessario();
}

function toggleGoleiro(id) {
  const j = state.jogadores.find(x => x.id === id);
  if (!j) return;
  j.goleiro = !j.goleiro;

  const li = document.querySelector(`.jogador-item[data-id="${id}"]`);
  if (li) {
    const btn = li.querySelector('.btn-goleiro');
    if (btn) {
      btn.classList.toggle('ativo', j.goleiro);
      btn.textContent = j.goleiro ? '🧤 Goleiro' : '🧤';
    }
  }

  atualizarAvisoGoleiros();
  validarBotaoGerar();
}

function atualizarAvisoGoleiros() {
  if (!state.config.separarGoleiros) return;
  const goleiros = state.jogadores.filter(j => j.selecionado && j.goleiro).length;
  const avisoEl = document.getElementById('aviso-goleiros');
  if (goleiros === 0) {
    avisoEl.textContent = '⚠️ Nenhum jogador marcado como goleiro. Marque ao menos um para separar.';
    avisoEl.style.display = 'block';
  } else {
    avisoEl.style.display = 'none';
  }
}

function renderizarSeletorGoleiros() {
  // Já integrado em criarItemJogador via state.config.separarGoleiros
  renderizarLista(state.jogadores);
}

// ─── EVENT LISTENERS DE CONFIGURAÇÃO ──────────────────────────────────────

document.getElementById('selecionar-todos-button').addEventListener('click', selecionarTodos);
document.getElementById('limpar-selecao-button').addEventListener('click', limparSelecao);

document.getElementById('busca-jogador-input').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  const items = document.querySelectorAll('.jogador-item');
  items.forEach(li => {
    const nome = li.querySelector('.jogador-nome')?.textContent.toLowerCase() || '';
    li.style.display = nome.includes(termo) ? '' : 'none';
  });
});

document.getElementById('num-times-select').addEventListener('change', (e) => {
  state.config.numTimes = parseInt(e.target.value);
  atualizarTotalNecessario();
  if (state.config.separarGoleiros) atualizarAvisoGoleiros();
});

document.getElementById('jogadores-por-time-select').addEventListener('change', (e) => {
  state.config.jogadoresPorTime = parseInt(e.target.value);
  atualizarTotalNecessario();
});

document.getElementById('separar-goleiros-toggle').addEventListener('change', toggleSepararGoleiros);

document.getElementById('gerar-times-button').addEventListener('click', gerarTimes);
document.getElementById('gerar-novamente-button').addEventListener('click', gerarTimes);
document.getElementById('copiar-times-button').addEventListener('click', () => copiarTimes(state.times));
document.getElementById('exportar-imagem-button').addEventListener('click', () => exportarImagem());
document.getElementById('desfazer-troca-button').addEventListener('click', desfazerTroca);

// ─── ALGORITMO DE BALANCEAMENTO (Tarefa 8) ────────────────────────────────

function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calcularForca(time) {
  return time.jogadores.reduce((s, j) => s + (j.nivel || 1), 0);
}

function calcularDiferenca(times) {
  if (!times.length) return 0;
  const forcas = times.map(t => calcularForca(t));
  return Math.max(...forcas) - Math.min(...forcas);
}

function criarJogadorGenerico(nivel, index) {
  return {
    id: `generico-${index}-${Date.now()}`,
    nome: `Jogador ${nivel}⭐`,
    nivel: Math.max(1, Math.min(5, nivel)),
    selecionado: true,
    goleiro: false,
    generico: true,
  };
}

function gerarTimes() {
  const { numTimes, jogadoresPorTime, separarGoleiros } = state.config;
  const jogadoresSelecionados = state.jogadores.filter(j => j.selecionado);

  // Inicializar times
  const times = Array.from({ length: numTimes }, (_, i) => ({
    id: `time-${i + 1}`,
    nome: `Time ${i + 1}`,
    jogadores: [],
    forca: 0,
  }));

  let restantes = [...jogadoresSelecionados];

  // Passo 1: Separar goleiros — distribuir um por time (sem obrigar quantidade exata)
  if (separarGoleiros) {
    const goleiros = embaralhar(restantes.filter(j => j.goleiro));
    restantes = restantes.filter(j => !j.goleiro);
    // Distribui goleiros garantindo que não fiquem dois no mesmo time
    goleiros.forEach((g) => {
      // Prefere times sem goleiro; se todos já tiverem, usa o greedy normal
      const semGoleiro = times.filter(t => !t.jogadores.some(j => j.goleiro));
      const candidatos = semGoleiro.length > 0 ? semGoleiro : times;
      candidatos.forEach(t => { t.forca = calcularForca(t); });
      const minForca = Math.min(...candidatos.map(t => t.forca));
      const alvo = candidatos.filter(t => t.forca === minForca)[0];
      alvo.jogadores.push({ ...g });
    });
  }

  // Passo 2: Ordenar por nível DESC, embaralhando iguais
  const grupos = {};
  restantes.forEach(j => {
    if (!grupos[j.nivel]) grupos[j.nivel] = [];
    grupos[j.nivel].push(j);
  });
  Object.values(grupos).forEach(g => embaralhar(g));
  const ordenados = Object.keys(grupos)
    .map(Number)
    .sort((a, b) => b - a)
    .flatMap(n => grupos[n]);

  // Passo 3: Distribuição greedy
  ordenados.forEach(jogador => {
    // Recalcular forças
    times.forEach(t => { t.forca = calcularForca(t); });
    const minForca = Math.min(...times.map(t => t.forca));
    const candidatos = times.filter(t => t.forca === minForca);
    const minQtd = Math.min(...candidatos.map(t => t.jogadores.length));
    const finalCandidatos = candidatos.filter(t => t.jogadores.length === minQtd);
    const alvo = finalCandidatos[Math.floor(Math.random() * finalCandidatos.length)];
    alvo.jogadores.push({ ...jogador });
  });

  // Passo 4: Preencher vagas com genéricos
  const totalNecessario = numTimes * jogadoresPorTime;
  const totalReal = jogadoresSelecionados.length;
  const vagas = totalNecessario - totalReal;

  if (vagas > 0) {
    const mediaGeral = jogadoresSelecionados.reduce((s, j) => s + j.nivel, 0) / (jogadoresSelecionados.length || 1);
    const nivelIdeal = Math.round(Math.max(1, Math.min(5, mediaGeral)));

    for (let i = 0; i < vagas; i++) {
      times.forEach(t => { t.forca = calcularForca(t); });
      const minForca = Math.min(...times.map(t => t.forca));
      const alvo = times.filter(t => t.forca === minForca)[0];
      alvo.jogadores.push(criarJogadorGenerico(nivelIdeal, i));
    }
  }

  // Passo 5: Embaralhar ordem interna
  times.forEach(t => {
    embaralhar(t.jogadores);
    t.forca = calcularForca(t);
  });

  state.times = times;
  state.historicoDeTrocas = [];
  renderizarTimes(times);
}

// ─── EXIBIÇÃO DOS TIMES (Tarefa 9) ────────────────────────────────────────

function renderizarTimes(times) {
  const resultadoCard = document.getElementById('resultado-card');
  const grid = document.getElementById('times-resultado');
  const resumo = document.getElementById('resumo-forcas');
  const notaGenericos = document.getElementById('nota-genericos');

  grid.innerHTML = '';
  times.forEach(t => grid.appendChild(renderizarCard(t)));

  atualizarResumo(times);
  inicializarDragAndDrop();

  // Nota de genéricos
  const totalGenericos = times.flatMap(t => t.jogadores).filter(j => j.generico).length;
  if (totalGenericos > 0) {
    notaGenericos.textContent = `ℹ️ ${totalGenericos} jogador(es) genérico(s) foram adicionados para completar os times. Eles representam jogadores a serem "pegos emprestados" de outro time na hora do jogo.`;
    notaGenericos.style.display = 'block';
  } else {
    notaGenericos.style.display = 'none';
  }

  document.getElementById('desfazer-troca-button').disabled = state.historicoDeTrocas.length === 0;
  resultadoCard.style.display = 'block';
  resultadoCard.scrollIntoView({ behavior: 'smooth' });
}

function renderizarCard(time) {
  const card = document.createElement('div');
  card.className = 'time-card';
  card.dataset.timeId = time.id;

  const header = document.createElement('div');
  header.className = 'time-card-header';

  const nomeEl = document.createElement('span');
  nomeEl.className = 'time-nome';
  nomeEl.textContent = time.nome;

  const forcaEl = document.createElement('span');
  forcaEl.className = 'time-forca';
  forcaEl.textContent = `Força: ${calcularForca(time)}`;

  header.appendChild(nomeEl);
  header.appendChild(forcaEl);

  const ul = document.createElement('ul');
  ul.className = 'time-jogadores-lista';

  time.jogadores.forEach(j => {
    ul.appendChild(criarItemJogadorTime(j, time.id));
  });

  card.appendChild(header);
  card.appendChild(ul);
  return card;
}

function criarItemJogadorTime(jogador, timeId) {
  const li = document.createElement('li');
  li.className = 'time-jogador-item' +
    (jogador.generico ? ' generico' : '') +
    (jogador.goleiro ? ' goleiro' : '');
  li.draggable = true;
  li.dataset.jogadorId = jogador.id;
  li.dataset.timeId = timeId;

  const nivelEl = document.createElement('span');
  nivelEl.className = 'jogador-nivel-mini';
  nivelEl.textContent = renderizarEstrelas(jogador.nivel);

  const nomeEl = document.createElement('span');
  nomeEl.className = 'jogador-nome-time';
  nomeEl.textContent = (jogador.goleiro ? '🧤 ' : '') + jogador.nome;

  li.appendChild(nivelEl);
  li.appendChild(nomeEl);
  return li;
}

function atualizarResumo(times) {
  const resumo = document.getElementById('resumo-forcas');
  const forcas = times.map(t => calcularForca(t));
  const diferenca = Math.max(...forcas) - Math.min(...forcas);
  const selecionados = state.jogadores.filter(j => j.selecionado);
  const media = selecionados.length
    ? selecionados.reduce((s, j) => s + j.nivel, 0) / selecionados.length
    : 0;

  const avisoDesequilibrio = diferenca > media;

  resumo.innerHTML = `
    <div class="resumo-item">
      <span class="resumo-label">Diferença de Força</span>
      <span class="resumo-valor ${avisoDesequilibrio ? 'aviso' : ''}">${diferenca}</span>
    </div>
    ${avisoDesequilibrio ? '<div class="resumo-item"><span class="resumo-label" style="color:#dc3545">⚠️ Balanceamento pode não ser ideal</span></div>' : ''}
  `;
}

// ─── DRAG AND DROP (Tarefa 10) ────────────────────────────────────────────

let dragJogadorId = null;
let dragTimeOrigemId = null;

function inicializarDragAndDrop() {
  // Apenas dragstart/dragend nos itens de jogador
  document.querySelectorAll('.time-jogador-item').forEach(li => {
    li.addEventListener('dragstart', (e) => {
      dragJogadorId = li.dataset.jogadorId;
      dragTimeOrigemId = li.dataset.timeId;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Sem stopPropagation — deixa o evento chegar ao card
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.time-card').forEach(c => c.classList.remove('drop-target'));
      document.querySelectorAll('.time-jogador-item').forEach(i => i.classList.remove('drop-target-jogador'));
    });
  });

  // Todo dragover/drop é tratado no card
  document.querySelectorAll('.time-card').forEach(card => {
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Limpa highlights anteriores
      document.querySelectorAll('.time-card').forEach(c => c.classList.remove('drop-target'));
      document.querySelectorAll('.time-jogador-item').forEach(i => i.classList.remove('drop-target-jogador'));

      // Verifica se está sobre um jogador específico
      const jogadorAlvo = e.target.closest('.time-jogador-item');
      if (jogadorAlvo && jogadorAlvo.dataset.jogadorId !== dragJogadorId && jogadorAlvo.dataset.timeId !== dragTimeOrigemId) {
        jogadorAlvo.classList.add('drop-target-jogador');
      } else {
        card.classList.add('drop-target');
      }
    });

    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drop-target');
        document.querySelectorAll('.time-jogador-item').forEach(i => i.classList.remove('drop-target-jogador'));
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drop-target');
      document.querySelectorAll('.time-jogador-item').forEach(i => i.classList.remove('drop-target-jogador'));

      if (!dragJogadorId || !dragTimeOrigemId) return;

      const timeDestinoId = card.dataset.timeId;
      const jogadorAlvo = e.target.closest('.time-jogador-item');

      if (
        jogadorAlvo &&
        jogadorAlvo.dataset.jogadorId !== dragJogadorId &&
        jogadorAlvo.dataset.timeId !== dragTimeOrigemId
      ) {
        // Soltou sobre jogador de outro time → troca direta
        trocarJogadoresDireto(dragJogadorId, dragTimeOrigemId, jogadorAlvo.dataset.jogadorId, jogadorAlvo.dataset.timeId);
      } else if (timeDestinoId !== dragTimeOrigemId) {
        // Soltou na área do card → move
        moverJogador(dragJogadorId, dragTimeOrigemId, timeDestinoId);
      }

      dragJogadorId = null;
      dragTimeOrigemId = null;
    });
  });
}

// Move jogador de um time para outro (sem troca)
function moverJogador(jogadorId, timeOrigemId, timeDestinoId) {
  const snapshot = state.times.map(t => ({ ...t, jogadores: t.jogadores.map(j => ({ ...j })) }));
  state.historicoDeTrocas.push(snapshot);

  const timeOrigem = state.times.find(t => t.id === timeOrigemId);
  const timeDestino = state.times.find(t => t.id === timeDestinoId);
  if (!timeOrigem || !timeDestino) return;

  const idx = timeOrigem.jogadores.findIndex(j => j.id === jogadorId);
  if (idx === -1) return;

  const [jogador] = timeOrigem.jogadores.splice(idx, 1);
  timeDestino.jogadores.push(jogador);

  timeOrigem.forca = calcularForca(timeOrigem);
  timeDestino.forca = calcularForca(timeDestino);
  renderizarTimes(state.times);
}

// Troca dois jogadores de times diferentes entre si
function trocarJogadoresDireto(jogadorAId, timeAId, jogadorBId, timeBId) {
  const snapshot = state.times.map(t => ({ ...t, jogadores: t.jogadores.map(j => ({ ...j })) }));
  state.historicoDeTrocas.push(snapshot);

  const timeA = state.times.find(t => t.id === timeAId);
  const timeB = state.times.find(t => t.id === timeBId);
  if (!timeA || !timeB) return;

  const idxA = timeA.jogadores.findIndex(j => j.id === jogadorAId);
  const idxB = timeB.jogadores.findIndex(j => j.id === jogadorBId);
  if (idxA === -1 || idxB === -1) return;

  // Troca direta nas posições
  const temp = { ...timeA.jogadores[idxA] };
  timeA.jogadores[idxA] = { ...timeB.jogadores[idxB] };
  timeB.jogadores[idxB] = temp;

  timeA.forca = calcularForca(timeA);
  timeB.forca = calcularForca(timeB);
  renderizarTimes(state.times);
}

// Mantém compatibilidade com chamadas antigas
function trocarJogadores(jogadorId, timeOrigemId, timeDestinoId) {
  moverJogador(jogadorId, timeOrigemId, timeDestinoId);
}

function desfazerTroca() {
  if (!state.historicoDeTrocas.length) return;
  state.times = state.historicoDeTrocas.pop();
  renderizarTimes(state.times);
}

// ─── EXPORTAÇÃO (Tarefa 12) ───────────────────────────────────────────────

function formatarTextoTimes(times) {
  let texto = '⚽ Times da Pelada\n\n';
  times.forEach(t => {
    const nomes = t.jogadores.map(j => j.nome).join(', ');
    texto += `${t.nome}: ${nomes}\n`;
  });
  return texto.trim();
}

async function copiarTimes(times) {
  const texto = formatarTextoTimes(times);
  const btn = document.getElementById('copiar-times-button');

  try {
    await navigator.clipboard.writeText(texto);
    const original = btn.textContent;
    btn.textContent = '✅ Times copiados!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch {
    // Fallback: modal com texto para cópia manual
    document.getElementById('copia-manual-texto').value = texto;
    document.getElementById('copia-manual-popup').style.display = 'flex';
  }
}

async function exportarImagem() {
  try {
    if (!window.html2canvas) {
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    const el = document.getElementById('times-resultado');
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = 'times-pelada.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Erro ao gerar imagem:', err);
    mostrarMensagem('Erro ao gerar imagem. Tente novamente.');
  }
}

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── POPUPS ───────────────────────────────────────────────────────────────

function mostrarMensagem(mensagem) {
  document.getElementById('mensagem-texto').textContent = mensagem;
  document.getElementById('mensagem-popup').style.display = 'flex';
}

document.getElementById('mensagem-ok-button').addEventListener('click', () => {
  document.getElementById('mensagem-popup').style.display = 'none';
});

document.getElementById('copia-manual-fechar').addEventListener('click', () => {
  document.getElementById('copia-manual-popup').style.display = 'none';
});

document.querySelectorAll('.popup-overlay').forEach(popup => {
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.style.display = 'none';
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.popup-overlay').forEach(p => { p.style.display = 'none'; });
  }
});

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────

async function inicializar() {
  console.log('Inicializando Gerador de Times...');
  await carregarJogadores();
}
