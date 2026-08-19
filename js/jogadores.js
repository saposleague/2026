// js/jogadores.js
// Credenciais Supabase vêm de js/config.js (carregado antes via <script> no HTML)
import { requireAuth, setupLogout } from './auth-guard.js';

let db = null;
let jogadores = [];
let nivelAdd = 3;
let nivelEdit = 3;
let excluirId = null;

// ─── AUTH ──────────────────────────────────────────────────────────────────

requireAuth().then(() => {
  db = getSupabaseClient();
  carregarJogadores();
});

setupLogout('logout-button');

document.getElementById('voltar-button').addEventListener('click', () => {
  window.location.href = 'painel.html';
});

// ─── ESTRELAS ──────────────────────────────────────────────────────────────

function initStars(containerId, getNivel, setNivel) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.sp-star').forEach(star => {
    star.addEventListener('click', () => {
      setNivel(parseInt(star.dataset.v));
      renderStars(containerId, getNivel());
    });
    star.addEventListener('mouseover', () => renderStars(containerId, parseInt(star.dataset.v)));
    star.addEventListener('mouseleave', () => renderStars(containerId, getNivel()));
  });
}

function renderStars(containerId, nivel) {
  document.getElementById(containerId).querySelectorAll('.sp-star').forEach(s => {
    s.classList.toggle('on', parseInt(s.dataset.v) <= nivel);
  });
}

initStars('star-add', () => nivelAdd, (v) => { nivelAdd = v; });
initStars('star-edit', () => nivelEdit, (v) => { nivelEdit = v; });
renderStars('star-add', nivelAdd);

// ─── ADICIONAR ─────────────────────────────────────────────────────────────

const inputNome = document.getElementById('input-nome');
const btnAdicionar = document.getElementById('btn-adicionar');

inputNome.addEventListener('input', () => {
  atualizarEstadoAdicionar();
});

inputNome.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !btnAdicionar.disabled) btnAdicionar.click();
});

btnAdicionar.addEventListener('click', async () => {
  const nome = formatarNome(inputNome.value);
  if (nome.length < 2) return;

  const duplicado = encontrarJogadorDuplicado(nome);
  if (duplicado) {
    mostrarMsg('msg-add', mensagemJogadorDuplicado(duplicado), 'warn', 'duplicate');
    atualizarEstadoAdicionar();
    return;
  }

  btnAdicionar.disabled = true;
  btnAdicionar.textContent = 'Salvando...';
  ocultarMsg('msg-add');

  const { error } = await db.from('jogadores').insert({ nome, nivel: nivelAdd });

  if (error) {
    mostrarMsg('msg-add', mensagemErroGravacao(error, 'Erro ao adicionar jogador. Tente novamente.'), 'warn', error.code);
    if (error.code === 'duplicate_player_name') await carregarJogadores();
  } else {
    mostrarMsg('msg-add', `✅ ${nome} adicionado com sucesso!`, 'ok');
    inputNome.value = '';
    nivelAdd = 3;
    renderStars('star-add', nivelAdd);
    await carregarJogadores();
  }

  btnAdicionar.textContent = '➕ Adicionar Jogador';
  atualizarEstadoAdicionar();
});

// ─── CARREGAR ──────────────────────────────────────────────────────────────

async function carregarJogadores() {
  const lista = document.getElementById('lista-jogadores');
  lista.innerHTML = '<p class="sp-empty">Carregando...</p>';

  const { data, error } = await db
    .from('jogadores')
    .select('id, nome, nivel')
    .order('nome');

  if (error) {
    lista.innerHTML = '<p class="sp-empty">Erro ao carregar jogadores.</p>';
    return;
  }

  jogadores = data || [];
  document.getElementById('total-count').textContent = `${jogadores.length} jogador${jogadores.length !== 1 ? 'es' : ''}`;
  renderizarLista(jogadores);
  atualizarEstadoAdicionar();
}

function renderizarLista(lista) {
  const container = document.getElementById('lista-jogadores');
  if (!lista.length) {
    container.innerHTML = '<p class="sp-empty">Nenhum jogador encontrado.</p>';
    return;
  }
  container.innerHTML = '';
  lista.forEach(j => container.appendChild(criarItem(j)));
}

function criarItem(j) {
  const div = document.createElement('div');
  div.className = 'jog-item';
  div.innerHTML = `
    <span class="jog-estrelas">${renderEstrelas(j.nivel)}</span>
    <span class="jog-nome">${escapeHtml(j.nome)}</span>
    <div class="jog-actions">
      <button class="sp-btn sp-btn-ghost" style="padding:4px 10px;font-size:11px;" data-edit="${j.id}">✏️ Editar</button>
      <button class="sp-btn sp-btn-danger" style="padding:4px 10px;font-size:11px;" data-del="${j.id}">🗑️</button>
    </div>
  `;
  div.querySelector('[data-edit]').addEventListener('click', () => abrirEditar(j));
  div.querySelector('[data-del]').addEventListener('click', () => abrirExcluir(j));
  return div;
}

function renderEstrelas(nivel) {
  const n = Math.max(1, Math.min(5, nivel || 1));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ─── BUSCA ─────────────────────────────────────────────────────────────────

document.getElementById('busca-input').addEventListener('input', (e) => {
  const termo = normalizar(e.target.value.trim());
  const filtrados = termo
    ? jogadores.filter(j => normalizar(j.nome).includes(termo))
    : jogadores;
  renderizarLista(filtrados);
});

function formatarNome(str) {
  return String(str || '').trim().replace(/\s+/g, ' ');
}

function normalizar(str) {
  return formatarNome(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function encontrarJogadorDuplicado(nome, idIgnorado = null) {
  const chave = normalizar(nome);
  if (!chave) return null;

  return jogadores.find(jogador => (
    String(jogador.id) !== String(idIgnorado ?? '') &&
    normalizar(jogador.nome) === chave
  )) || null;
}

function mensagemJogadorDuplicado(jogador) {
  return `⚠️ O jogador "${jogador.nome}" já está cadastrado.`;
}

function atualizarEstadoAdicionar() {
  const nome = formatarNome(inputNome.value);
  const duplicado = nome.length >= 2 ? encontrarJogadorDuplicado(nome) : null;
  btnAdicionar.disabled = nome.length < 2 || Boolean(duplicado);

  const mensagem = document.getElementById('msg-add');
  if (duplicado) {
    mostrarMsg('msg-add', mensagemJogadorDuplicado(duplicado), 'warn', 'duplicate');
  } else if (mensagem.dataset.code === 'duplicate') {
    ocultarMsg('msg-add');
  }
}

function mensagemErroGravacao(error, fallback) {
  if (error?.code === 'duplicate_player_name') {
    return `⚠️ ${error.message || 'Já existe um jogador cadastrado com esse nome.'}`;
  }
  return fallback;
}

// ─── EDITAR ────────────────────────────────────────────────────────────────

function abrirEditar(j) {
  document.getElementById('edit-id').value = j.id;
  document.getElementById('edit-nome').value = j.nome;
  nivelEdit = j.nivel || 3;
  renderStars('star-edit', nivelEdit);
  ocultarMsg('msg-edit');
  document.getElementById('modal-editar').style.display = 'flex';
  document.getElementById('edit-nome').focus();
}

document.getElementById('btn-cancelar-edit').addEventListener('click', () => {
  document.getElementById('modal-editar').style.display = 'none';
});

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const id = document.getElementById('edit-id').value;
  const nome = formatarNome(document.getElementById('edit-nome').value);
  if (nome.length < 2) return;

  const duplicado = encontrarJogadorDuplicado(nome, id);
  if (duplicado) {
    mostrarMsg('msg-edit', mensagemJogadorDuplicado(duplicado), 'warn', 'duplicate');
    return;
  }

  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  ocultarMsg('msg-edit');

  const { error } = await db.from('jogadores').update({ nome, nivel: nivelEdit }).eq('id', id);

  if (error) {
    mostrarMsg('msg-edit', mensagemErroGravacao(error, 'Erro ao salvar. Tente novamente.'), 'warn', error.code);
  } else {
    document.getElementById('modal-editar').style.display = 'none';
    await carregarJogadores();
  }

  btn.disabled = false;
  btn.textContent = '💾 Salvar';
});

// ─── EXCLUIR ───────────────────────────────────────────────────────────────

function abrirExcluir(j) {
  excluirId = j.id;
  document.getElementById('excluir-texto').textContent = `Tem certeza que deseja remover "${j.nome}"? Esta ação não pode ser desfeita.`;
  document.getElementById('modal-excluir').style.display = 'flex';
}

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  document.getElementById('modal-excluir').style.display = 'none';
  excluirId = null;
});

document.getElementById('btn-confirmar-excluir').addEventListener('click', async () => {
  if (!excluirId) return;
  const btn = document.getElementById('btn-confirmar-excluir');
  btn.disabled = true;
  btn.textContent = 'Removendo...';

  const { error } = await db.from('jogadores').delete().eq('id', excluirId);

  document.getElementById('modal-excluir').style.display = 'none';
  excluirId = null;
  btn.disabled = false;
  btn.textContent = 'Remover';

  if (!error) await carregarJogadores();
});

// Fechar modais clicando fora
document.getElementById('modal-editar').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});
document.getElementById('modal-excluir').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

// ─── UTILS ─────────────────────────────────────────────────────────────────

function mostrarMsg(id, texto, tipo, code = '') {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = `sp-alert sp-alert-${tipo === 'ok' ? 'ok' : 'warn'}`;
  el.dataset.code = code;
  el.style.display = 'block';
}

function ocultarMsg(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
  delete el.dataset.code;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
