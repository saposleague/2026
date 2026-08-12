/**
 * Relatório de presenças por jogador e por time.
 * Depende de config.js e das bibliotecas Chart.js, jsPDF e SheetJS.
 */

const CORES = [
  '#22c55e', '#38bdf8', '#f59e0b', '#a78bfa',
  '#fb7185', '#2dd4bf', '#60a5fa', '#f97316'
];

const state = {
  conectado: false,
  loading: false,
  erro: '',
  visualizacao: 'jogadores',
  jogadores: [],
  times: [],
  presencas: [],
  dadosJogadores: [],
  dadosTimes: [],
  totalPeladas: 0,
  totalPresencasSemTime: 0
};

let chartBar = null;
let chartPie = null;

function chaveId(valor) {
  return valor === null || valor === undefined ? '' : String(valor);
}

function formatarDecimal(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatarData(dataISO) {
  if (!dataISO || typeof dataISO !== 'string') return '-';
  const partes = dataISO.slice(0, 10).split('-');
  if (partes.length !== 3) return '-';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function urlImagemSegura(url) {
  if (!url) return './images/favicon.png';

  try {
    const resolvida = new URL(url, window.location.href);
    return ['http:', 'https:'].includes(resolvida.protocol)
      ? resolvida.href
      : './images/favicon.png';
  } catch (_) {
    return './images/favicon.png';
  }
}

function prepararDados(jogadores, times, presencas) {
  const presencasPorJogador = new Map();

  presencas.forEach(presenca => {
    const jogadorId = chaveId(presenca.jogador_id);
    if (!jogadorId) return;

    if (!presencasPorJogador.has(jogadorId)) {
      presencasPorJogador.set(jogadorId, []);
    }
    presencasPorJogador.get(jogadorId).push(presenca);
  });

  const timesPorId = new Map(times.map(time => [chaveId(time.id), time]));

  state.dadosJogadores = jogadores.map(jogador => {
    const registros = presencasPorJogador.get(chaveId(jogador.id)) || [];
    const datas = registros
      .map(registro => registro.data_pelada)
      .filter(Boolean)
      .sort();
    const time = timesPorId.get(chaveId(jogador.time_id));

    return {
      id: jogador.id,
      nome: jogador.nome || 'Sem nome',
      time_nome: time?.nome || 'Sem time',
      total_presencas: registros.length,
      primeira_presenca: datas.length ? formatarData(datas[0]) : '-',
      ultima_presenca: datas.length ? formatarData(datas[datas.length - 1]) : '-'
    };
  }).sort((a, b) =>
    b.total_presencas - a.total_presencas || a.nome.localeCompare(b.nome, 'pt-BR')
  );

  const jogadoresPorTime = new Map();
  jogadores.forEach(jogador => {
    const timeId = chaveId(jogador.time_id) || 'sem-time';
    if (!jogadoresPorTime.has(timeId)) jogadoresPorTime.set(timeId, []);
    jogadoresPorTime.get(timeId).push(jogador);
  });

  const timesParaRelatorio = times.map(time => ({
    ...time,
    chave: chaveId(time.id)
  }));

  state.totalPresencasSemTime = (jogadoresPorTime.get('sem-time') || [])
    .reduce((total, jogador) => {
      return total + (presencasPorJogador.get(chaveId(jogador.id)) || []).length;
    }, 0);

  state.totalPeladas = new Set(
    presencas.map(presenca => presenca.data_pelada).filter(Boolean)
  ).size;

  state.dadosTimes = timesParaRelatorio.map(time => {
    const jogadoresDoTime = jogadoresPorTime.get(time.chave) || [];
    const totalPresencas = jogadoresDoTime.reduce((total, jogador) => {
      return total + (presencasPorJogador.get(chaveId(jogador.id)) || []).length;
    }, 0);

    return {
      id: time.id,
      nome: time.nome || 'Sem nome',
      logo_url: time.logo_url,
      total_jogadores: jogadoresDoTime.length,
      total_presencas: totalPresencas,
      media_por_jogador: jogadoresDoTime.length
        ? totalPresencas / jogadoresDoTime.length
        : 0,
      media_por_pelada: state.totalPeladas
        ? totalPresencas / state.totalPeladas
        : 0
    };
  }).sort((a, b) =>
    b.total_presencas - a.total_presencas || a.nome.localeCompare(b.nome, 'pt-BR')
  );
}

async function buscarJson(url, headers, descricao) {
  const todos = [];
  const tamanhoPagina = 1000;
  let inicio = 0;
  let totalEsperado = null;

  do {
    const resposta = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        Prefer: 'count=exact',
        Range: `${inicio}-${inicio + tamanhoPagina - 1}`
      },
      cache: 'no-store'
    });

    if (!resposta.ok) throw new Error(`Erro ao buscar ${descricao}: ${resposta.status}`);

    const pagina = await resposta.json();
    const contentRange = resposta.headers.get('content-range');
    const totalInformado = contentRange?.split('/')[1];
    if (totalInformado && totalInformado !== '*') totalEsperado = Number(totalInformado);

    todos.push(...pagina);
    inicio += pagina.length;

    if (pagina.length === 0) break;
  } while (totalEsperado !== null ? todos.length < totalEsperado : inicio % tamanhoPagina === 0);

  return todos;
}

async function buscarDados() {
  state.loading = true;
  state.erro = '';
  render();

  try {
    let urlNormalizada = SUPABASE_URL.trim();
    if (!/^https?:\/\//i.test(urlNormalizada)) urlNormalizada = `https://${urlNormalizada}`;

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const base = `${urlNormalizada}/rest/v1`;
    const [jogadores, times, presencas] = await Promise.all([
      buscarJson(`${base}/jogadores?select=id,nome,time_id`, headers, 'jogadores'),
      buscarJson(`${base}/times?select=id,nome,logo_url`, headers, 'times'),
      buscarJson(`${base}/presencas?select=jogador_id,data_pelada`, headers, 'presenças')
    ]);

    state.jogadores = jogadores;
    state.times = times;
    state.presencas = presencas;
    prepararDados(jogadores, times, presencas);
    state.conectado = true;
  } catch (erro) {
    console.error('Erro ao carregar relatório:', erro);
    state.erro = erro.message || 'Não foi possível carregar o relatório.';
  } finally {
    state.loading = false;
    render();
    if (state.conectado) criarGraficos();
  }
}

function alterarVisualizacao(tipo) {
  if (!['jogadores', 'times'].includes(tipo) || state.visualizacao === tipo) return;
  state.visualizacao = tipo;
  render();
  criarGraficos();
}

function destruirGraficos() {
  if (chartBar) chartBar.destroy();
  if (chartPie) chartPie.destroy();
  chartBar = null;
  chartPie = null;
}

function criarGraficos() {
  destruirGraficos();

  const dados = state.visualizacao === 'times'
    ? state.dadosTimes
    : state.dadosJogadores.slice(0, 10);
  if (!dados.length || typeof Chart === 'undefined') return;

  requestAnimationFrame(() => {
    const canvasBar = document.getElementById('chartBar');
    const canvasPie = document.getElementById('chartPie');
    if (!canvasBar || !canvasPie) return;

    const rotulo = state.visualizacao === 'times' ? 'Time' : 'Jogador';
    const labels = dados.map(item => item.nome);
    const totais = dados.map(item => item.total_presencas);

    chartBar = new Chart(canvasBar, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Idas à pelada',
          data: totais,
          backgroundColor: '#22c55e',
          borderRadius: 7,
          maxBarThickness: 44
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: itens => `${rotulo}: ${itens[0].label}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, color: '#94a3b8' }, grid: { color: '#243449' } },
          x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
        }
      }
    });

    chartPie = new Chart(canvasPie, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: totais, backgroundColor: CORES, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#cbd5e1', padding: 14, usePointStyle: true }
          }
        }
      }
    });
  });
}

function exportarPDF() {
  if (!window.jspdf?.jsPDF) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const porTimes = state.visualizacao === 'times';
  const totalPresencas = state.dadosJogadores.reduce((soma, item) => soma + item.total_presencas, 0);
  const totalPresencasTimes = state.dadosTimes.reduce((soma, item) => soma + item.total_presencas, 0);

  doc.setFontSize(18);
  doc.text(`Relatorio de Presencas por ${porTimes ? 'Time' : 'Jogador'}`, 14, 18);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 25);
  doc.text(
    porTimes
      ? `Peladas: ${state.totalPeladas} | Times: ${state.dadosTimes.length} | Idas com time: ${totalPresencasTimes}`
      : `Peladas: ${state.totalPeladas} | Jogadores: ${state.dadosJogadores.length} | Presencas: ${totalPresencas}`,
    14,
    31
  );

  const cabecalho = porTimes
    ? [['#', 'Time', 'Jogadores', 'Total de idas', 'Media/jogador', 'Media/pelada']]
    : [['#', 'Jogador', 'Time', 'Presencas', 'Primeira', 'Ultima']];
  const corpo = porTimes
    ? state.dadosTimes.map((time, indice) => [
        indice + 1, time.nome, time.total_jogadores, time.total_presencas,
        formatarDecimal(time.media_por_jogador), formatarDecimal(time.media_por_pelada)
      ])
    : state.dadosJogadores.map((jogador, indice) => [
        indice + 1, jogador.nome, jogador.time_nome, jogador.total_presencas,
        jogador.primeira_presenca, jogador.ultima_presenca
      ]);

  doc.autoTable({
    startY: 38,
    head: cabecalho,
    body: corpo,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] },
    styles: { fontSize: 8 }
  });

  doc.save(`relatorio-${porTimes ? 'times' : 'jogadores'}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportarExcel() {
  if (typeof XLSX === 'undefined') return;

  const totalPresencas = state.dadosJogadores.reduce((soma, item) => soma + item.total_presencas, 0);
  const workbook = XLSX.utils.book_new();
  const resumo = XLSX.utils.aoa_to_sheet([
    ['RELATÓRIO DE PRESENÇAS'],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    ['Peladas registradas', state.totalPeladas],
    ['Jogadores', state.dadosJogadores.length],
    ['Times', state.dadosTimes.filter(time => time.id !== null).length],
    ['Total de presenças', totalPresencas],
    ['Presenças de jogadores sem time', state.totalPresencasSemTime]
  ]);
  const jogadores = XLSX.utils.json_to_sheet(state.dadosJogadores.map((item, indice) => ({
    '#': indice + 1,
    Jogador: item.nome,
    Time: item.time_nome,
    Presenças: item.total_presencas,
    'Primeira presença': item.primeira_presenca,
    'Última presença': item.ultima_presenca
  })));
  const times = XLSX.utils.json_to_sheet(state.dadosTimes.map((item, indice) => ({
    '#': indice + 1,
    Time: item.nome,
    Jogadores: item.total_jogadores,
    'Total de idas': item.total_presencas,
    'Média por jogador': Number(item.media_por_jogador.toFixed(1)),
    'Média por pelada': Number(item.media_por_pelada.toFixed(1))
  })));

  resumo['!cols'] = [{ wch: 24 }, { wch: 22 }];
  jogadores['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  times['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(workbook, resumo, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, jogadores, 'Jogadores');
  XLSX.utils.book_append_sheet(workbook, times, 'Times');
  XLSX.writeFile(workbook, `relatorio-presencas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function avatarJogador(nome) {
  return `<span class="avatar-jogador">${escapeHtml((nome || '?').charAt(0).toUpperCase())}</span>`;
}

function avatarTime(time) {
  const nome = escapeHtml(time.nome);
  const logo = escapeHtml(urlImagemSegura(time.logo_url));
  return `
    <span class="avatar-time">
      <img src="${logo}" alt="Escudo do ${nome}" onerror="this.src='./images/favicon.png'">
    </span>
  `;
}

function renderTabelaJogadores() {
  if (!state.dadosJogadores.length) return renderVazio('Nenhum jogador cadastrado.');

  return `
    <div class="tabela-scroll">
      <table class="relatorio-tabela">
        <thead><tr>
          <th>#</th><th>Jogador</th><th>Time</th><th class="centro">Presenças</th>
          <th class="centro coluna-data">Primeira</th><th class="centro coluna-data">Última</th>
        </tr></thead>
        <tbody>
          ${state.dadosJogadores.map((jogador, indice) => `
            <tr>
              <td class="ranking">${indice + 1}</td>
              <td><div class="identidade">${avatarJogador(jogador.nome)}<strong>${escapeHtml(jogador.nome)}</strong></div></td>
              <td><span class="time-tag">${escapeHtml(jogador.time_nome)}</span></td>
              <td class="centro"><span class="numero-destaque">${jogador.total_presencas}</span></td>
              <td class="centro coluna-data">${escapeHtml(jogador.primeira_presenca)}</td>
              <td class="centro coluna-data">${escapeHtml(jogador.ultima_presenca)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTabelaTimes() {
  if (!state.dadosTimes.length) return renderVazio('Nenhum time cadastrado.');

  const totalGeral = state.dadosTimes.reduce((soma, time) => soma + time.total_presencas, 0);

  return `
    <div class="tabela-scroll">
      <table class="relatorio-tabela tabela-times">
        <thead><tr>
          <th>#</th><th>Time</th><th class="centro">Jogadores</th><th class="centro">Total de idas</th>
          <th class="centro">Média/jogador</th><th class="centro">Média/pelada</th><th>Participação</th>
        </tr></thead>
        <tbody>
          ${state.dadosTimes.map((time, indice) => {
            const percentual = totalGeral ? (time.total_presencas / totalGeral) * 100 : 0;
            return `
              <tr>
                <td class="ranking">${indice + 1}</td>
                <td><div class="identidade">${avatarTime(time)}<strong>${escapeHtml(time.nome)}</strong></div></td>
                <td class="centro">${time.total_jogadores}</td>
                <td class="centro"><span class="numero-destaque verde">${time.total_presencas}</span></td>
                <td class="centro"><strong>${formatarDecimal(time.media_por_jogador)}</strong></td>
                <td class="centro"><strong>${formatarDecimal(time.media_por_pelada)}</strong></td>
                <td>
                  <div class="participacao"><span style="width:${percentual.toFixed(1)}%"></span></div>
                  <small>${formatarDecimal(percentual)}%</small>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p class="nota-relatorio">
      As presenças são agrupadas de acordo com o time atual de cada jogador.
      ${state.totalPresencasSemTime > 0
        ? `${state.totalPresencasSemTime} presenças de jogadores sem time não entram neste comparativo.`
        : ''}
    </p>
  `;
}

function renderVazio(mensagem) {
  return `<div class="estado-vazio"><span>📋</span><p>${escapeHtml(mensagem)}</p></div>`;
}

function renderCarregamento() {
  return `
    <main class="pagina-relatorio estado-centralizado">
      <div class="loading-card"><span class="spinner"></span><h1>Carregando relatório</h1><p>Buscando jogadores, times e presenças...</p></div>
    </main>
  `;
}

function renderErro() {
  return `
    <main class="pagina-relatorio estado-centralizado">
      <div class="erro-card">
        <span class="erro-icone">!</span>
        <h1>Não foi possível carregar</h1>
        <p>${escapeHtml(state.erro)}</p>
        <button class="botao primario" onclick="buscarDados()">Tentar novamente</button>
      </div>
    </main>
  `;
}

function render() {
  const app = document.getElementById('app');
  destruirGraficos();

  if (state.loading && !state.conectado) {
    app.innerHTML = renderCarregamento();
    return;
  }

  if (state.erro && !state.conectado) {
    app.innerHTML = renderErro();
    return;
  }

  if (!state.conectado) {
    app.innerHTML = renderCarregamento();
    return;
  }

  const porTimes = state.visualizacao === 'times';
  const totalPresencas = state.dadosJogadores.reduce((soma, item) => soma + item.total_presencas, 0);
  const totalTimes = state.dadosTimes.length;
  const totalPresencasTimes = state.dadosTimes.reduce((soma, time) => soma + time.total_presencas, 0);
  const mediaPrincipal = porTimes
    ? (totalTimes ? totalPresencasTimes / totalTimes : 0)
    : (state.dadosJogadores.length ? totalPresencas / state.dadosJogadores.length : 0);

  app.innerHTML = `
    <div class="fundo-campo" aria-hidden="true"></div>
    <main class="pagina-relatorio">
      <header class="topo-relatorio">
        <a class="voltar" href="painel.html" aria-label="Voltar ao painel">←</a>
        <div class="marca"><img src="./images/favicon.png" alt=""><span>SAPOS <b>LEAGUE</b></span></div>
        <div class="acoes-topo">
          <button class="botao secundario" onclick="exportarPDF()">PDF</button>
          <button class="botao secundario" onclick="exportarExcel()">Excel</button>
          <button class="botao primario" onclick="buscarDados()" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
      </header>

      <section class="cabecalho-relatorio">
        <span class="temporada"><i></i> Temporada 2026</span>
        <h1>Relatório de <em>Presenças</em></h1>
        <p>Acompanhe a participação nas peladas por jogador ou por time.</p>
      </section>

      <nav class="abas" aria-label="Tipo de relatório">
        <button class="aba ${!porTimes ? 'ativa' : ''}" onclick="alterarVisualizacao('jogadores')" aria-selected="${!porTimes}">Por jogador</button>
        <button class="aba ${porTimes ? 'ativa' : ''}" onclick="alterarVisualizacao('times')" aria-selected="${porTimes}">Por time</button>
      </nav>

      <section class="cards-resumo">
        <article class="card-resumo"><span>${porTimes ? 'Times' : 'Jogadores'}</span><strong>${porTimes ? totalTimes : state.dadosJogadores.length}</strong><small>cadastrados</small></article>
        <article class="card-resumo destaque-verde"><span>Total de idas</span><strong>${porTimes ? totalPresencasTimes : totalPresencas}</strong><small>${porTimes ? 'de jogadores com time' : 'presenças registradas'}</small></article>
        <article class="card-resumo"><span>${porTimes ? 'Média por time' : 'Média por jogador'}</span><strong>${formatarDecimal(mediaPrincipal)}</strong><small>idas à pelada</small></article>
        <article class="card-resumo"><span>Peladas</span><strong>${state.totalPeladas}</strong><small>datas registradas</small></article>
      </section>

      <section class="graficos">
        <article class="painel-card">
          <div class="titulo-card"><div><span>DESEMPENHO</span><h2>${porTimes ? 'Idas por time' : 'Top 10 jogadores'}</h2></div><b>Total de presenças</b></div>
          <div class="grafico-container"><canvas id="chartBar"></canvas></div>
        </article>
        <article class="painel-card">
          <div class="titulo-card"><div><span>DISTRIBUIÇÃO</span><h2>Participação ${porTimes ? 'dos times' : 'dos líderes'}</h2></div></div>
          <div class="grafico-container"><canvas id="chartPie"></canvas></div>
        </article>
      </section>

      <section class="painel-card tabela-card">
        <div class="titulo-card tabela-titulo">
          <div><span>RANKING</span><h2>${porTimes ? 'Participação por time' : 'Participação por jogador'}</h2></div>
          <span class="contador">${porTimes ? state.dadosTimes.length + ' times' : state.dadosJogadores.length + ' jogadores'}</span>
        </div>
        ${porTimes ? renderTabelaTimes() : renderTabelaJogadores()}
      </section>
    </main>
  `;
}

window.buscarDados = buscarDados;
window.alterarVisualizacao = alterarVisualizacao;
window.exportarPDF = exportarPDF;
window.exportarExcel = exportarExcel;

render();
buscarDados();
