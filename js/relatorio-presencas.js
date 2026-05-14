/**
 * relatorio-presencas.js
 * Lógica da página de relatório de presenças.
 * Depende de: config.js (SUPABASE_URL, SUPABASE_ANON_KEY)
 */

// Cores para os gráficos
const CORES = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'
];

let state = {
  conectado: false,
  dados: [],
  loading: false,
  erro: ''
};

// ----------------------------------------------------------------
// Exportação PDF
// ----------------------------------------------------------------
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Relatório de Presenças', 14, 20);

  doc.setFontSize(10);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    14, 28
  );

  const totalPresencas = state.dados.reduce((sum, d) => sum + d.total_presencas, 0);
  const mediaPresencas = state.dados.length > 0
    ? (totalPresencas / state.dados.length).toFixed(1)
    : 0;

  doc.setFontSize(12);
  doc.text(`Total de Jogadores: ${state.dados.length}`, 14, 38);
  doc.text(`Total de Presenças: ${totalPresencas}`, 14, 45);
  doc.text(`Média por Jogador: ${mediaPresencas}`, 14, 52);

  const tableData = state.dados.map((jogador, idx) => [
    idx + 1,
    jogador.nome,
    jogador.total_presencas,
    jogador.primeira_presenca,
    jogador.ultima_presenca
  ]);

  doc.autoTable({
    startY: 60,
    head: [['#', 'Jogador', 'Presenças', 'Primeira', 'Última']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 }
  });

  doc.save(`relatorio-presencas-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ----------------------------------------------------------------
// Exportação Excel
// ----------------------------------------------------------------
function exportarExcel() {
  const totalPresencas = state.dados.reduce((sum, d) => sum + d.total_presencas, 0);
  const mediaPresencas = state.dados.length > 0
    ? (totalPresencas / state.dados.length).toFixed(1)
    : 0;

  const resumo = [
    ['RELATÓRIO DE PRESENÇAS'],
    [],
    ['Gerado em:', new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR')],
    [],
    ['ESTATÍSTICAS'],
    ['Total de Jogadores:', state.dados.length],
    ['Total de Presenças:', totalPresencas],
    ['Média por Jogador:', mediaPresencas],
    [],
    ['RANKING DE JOGADORES'],
    ['#', 'Jogador', 'Presenças', 'Primeira Presença', 'Última Presença']
  ];

  const jogadoresData = state.dados.map((jogador, idx) => [
    idx + 1,
    jogador.nome,
    jogador.total_presencas,
    jogador.primeira_presenca,
    jogador.ultima_presenca
  ]);

  const wsData = [...resumo, ...jogadoresData];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Presenças');
  XLSX.writeFile(wb, `relatorio-presencas-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ----------------------------------------------------------------
// Busca de dados no Supabase
// ----------------------------------------------------------------
async function buscarDados() {
  state.loading = true;
  state.erro = '';
  render();

  try {
    let urlNormalizada = SUPABASE_URL.trim();
    if (!urlNormalizada.startsWith('http://') && !urlNormalizada.startsWith('https://')) {
      urlNormalizada = 'https://' + urlNormalizada;
    }

    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const [jogadoresRes, presencasRes] = await Promise.all([
      fetch(`${urlNormalizada}/rest/v1/jogadores?select=*`, { method: 'GET', headers }),
      fetch(`${urlNormalizada}/rest/v1/presencas?select=*`, { method: 'GET', headers })
    ]);

    if (!jogadoresRes.ok) throw new Error(`Erro ao buscar jogadores: ${jogadoresRes.status}`);
    if (!presencasRes.ok) throw new Error(`Erro ao buscar presenças: ${presencasRes.status}`);

    const jogadores = await jogadoresRes.json();
    const presencas = await presencasRes.json();

    const relatorio = jogadores.map(j => {
      const presencasJogador = presencas.filter(p => p.jogador_id === j.id);
      const datas = presencasJogador
        .map(p => p.data_pelada ? new Date(p.data_pelada) : null)
        .filter(d => d !== null);

      return {
        id: j.id,
        nome: j.nome || 'Sem nome',
        total_presencas: presencasJogador.length,
        primeira_presenca: datas.length > 0
          ? new Date(Math.min(...datas)).toLocaleDateString('pt-BR')
          : '-',
        ultima_presenca: datas.length > 0
          ? new Date(Math.max(...datas)).toLocaleDateString('pt-BR')
          : '-'
      };
    });

    relatorio.sort((a, b) => b.total_presencas - a.total_presencas);
    state.dados = relatorio;
    state.conectado = true;
    state.loading = false;

    render();
    criarGraficos();

  } catch (err) {
    console.error('Erro:', err);
    state.erro = err.message;
    state.loading = false;
    render();
  }
}

// ----------------------------------------------------------------
// Gráficos
// ----------------------------------------------------------------
function criarGraficos() {
  if (state.dados.length === 0) return;

  setTimeout(() => {
    const ctxBar = document.getElementById('chartBar');
    if (ctxBar) {
      const top10 = state.dados.slice(0, 10);
      new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: top10.map(d => d.nome),
          datasets: [{
            label: 'Presenças',
            data: top10.map(d => d.total_presencas),
            backgroundColor: '#3b82f6',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#e2e8f0'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#9CA3AF' },
              grid: { color: '#374151' }
            },
            x: {
              ticks: { color: '#9CA3AF' },
              grid: { display: false }
            }
          }
        }
      });
    }

    const ctxPie = document.getElementById('chartPie');
    if (ctxPie) {
      const top8 = state.dados.slice(0, 8);
      new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: top8.map(d => d.nome),
          datasets: [{
            data: top8.map(d => d.total_presencas),
            backgroundColor: CORES,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#e2e8f0', padding: 15 }
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#e2e8f0'
            }
          }
        }
      });
    }
  }, 100);
}

// ----------------------------------------------------------------
// Renderização
// ----------------------------------------------------------------
function render() {
  const app = document.getElementById('app');

  if (!state.conectado) {
    app.innerHTML = `
      <div style="min-height:100vh;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);padding:2rem;">
        <div style="max-width:42rem;margin:0 auto;">
          <div style="background:#1e293b;border-radius:1rem;box-shadow:0 25px 50px rgba(0,0,0,0.5);padding:2rem;border:1px solid #334155;">
            <div style="text-align:center;margin-bottom:2rem;">
              <h1 style="font-size:2.25rem;font-weight:bold;color:white;margin-bottom:0.5rem;">⚽ Relatório de Presenças</h1>
              <p style="color:#94a3b8;">Sistema de controle de jogadores</p>
            </div>

            ${state.erro ? `
              <div style="background:rgba(127,29,29,0.5);border:1px solid #b91c1c;border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem;">
                <p style="color:#fca5a5;font-size:0.875rem;font-weight:500;margin-bottom:0.5rem;">Erro na conexão:</p>
                <p style="color:#fca5a5;font-size:0.75rem;">${state.erro}</p>
              </div>
            ` : ''}

            <button
              onclick="buscarDados()"
              ${state.loading ? 'disabled' : ''}
              style="width:100%;background:linear-gradient(to right,#2563eb,#1d4ed8);color:white;font-weight:600;padding:1rem 1.5rem;border-radius:0.5rem;border:none;cursor:pointer;font-size:1.125rem;"
            >
              ${state.loading ? '🔄 Carregando...' : '🚀 Carregar Relatório'}
            </button>

            <div style="margin-top:1.5rem;padding:1rem;background:rgba(51,65,85,0.5);border-radius:0.5rem;">
              <p style="font-size:0.75rem;color:#94a3b8;text-align:center;">
                Clique no botão acima para visualizar o relatório de presenças
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const totalPresencas = state.dados.reduce((sum, d) => sum + d.total_presencas, 0);
  const mediaPresencas = state.dados.length > 0
    ? (totalPresencas / state.dados.length).toFixed(1)
    : 0;

  app.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);padding:2rem;">
      <div style="max-width:80rem;margin:0 auto;">

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
          <div>
            <h1 style="font-size:2.25rem;font-weight:bold;color:white;margin-bottom:0.5rem;">⚽ Relatório de Presenças</h1>
            <p style="color:#94a3b8;">Acompanhe a participação de cada jogador</p>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button onclick="exportarPDF()"
              style="padding:0.5rem 1rem;background:#dc2626;color:white;border-radius:0.5rem;border:none;cursor:pointer;font-weight:500;"
              onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
              📄 Exportar PDF
            </button>
            <button onclick="exportarExcel()"
              style="padding:0.5rem 1rem;background:#16a34a;color:white;border-radius:0.5rem;border:none;cursor:pointer;font-weight:500;"
              onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
              📊 Exportar Excel
            </button>
            <button onclick="location.reload()"
              style="padding:0.5rem 1rem;background:#334155;color:white;border-radius:0.5rem;border:none;cursor:pointer;"
              onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem;">
          <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:0.75rem;padding:1.5rem;box-shadow:0 10px 15px rgba(0,0,0,0.3);">
            <div style="color:#bfdbfe;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">Total de Jogadores</div>
            <div style="font-size:2.25rem;font-weight:bold;color:white;">${state.dados.length}</div>
          </div>
          <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:0.75rem;padding:1.5rem;box-shadow:0 10px 15px rgba(0,0,0,0.3);">
            <div style="color:#bbf7d0;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">Total de Presenças</div>
            <div style="font-size:2.25rem;font-weight:bold;color:white;">${totalPresencas}</div>
          </div>
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:0.75rem;padding:1.5rem;box-shadow:0 10px 15px rgba(0,0,0,0.3);">
            <div style="color:#ddd6fe;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">Média por Jogador</div>
            <div style="font-size:2.25rem;font-weight:bold;color:white;">${mediaPresencas}</div>
          </div>
        </div>

        ${state.dados.length > 0 ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;margin-bottom:2rem;">
            <div style="background:#1e293b;border-radius:1rem;padding:1.5rem;border:1px solid #334155;box-shadow:0 20px 25px rgba(0,0,0,0.5);">
              <h2 style="font-size:1.25rem;font-weight:bold;color:white;margin-bottom:1rem;">📊 Top 10 Jogadores</h2>
              <div style="height:300px;"><canvas id="chartBar"></canvas></div>
            </div>
            <div style="background:#1e293b;border-radius:1rem;padding:1.5rem;border:1px solid #334155;box-shadow:0 20px 25px rgba(0,0,0,0.5);">
              <h2 style="font-size:1.25rem;font-weight:bold;color:white;margin-bottom:1rem;">🥧 Distribuição Top 8</h2>
              <div style="height:300px;"><canvas id="chartPie"></canvas></div>
            </div>
          </div>
        ` : ''}

        <div style="background:#1e293b;border-radius:1rem;box-shadow:0 20px 25px rgba(0,0,0,0.5);border:1px solid #334155;overflow:hidden;">
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#334155;">
                  <th style="padding:1rem 1.5rem;text-align:left;font-size:0.875rem;font-weight:600;color:#e2e8f0;">#</th>
                  <th style="padding:1rem 1.5rem;text-align:left;font-size:0.875rem;font-weight:600;color:#e2e8f0;">Jogador</th>
                  <th style="padding:1rem 1.5rem;text-align:center;font-size:0.875rem;font-weight:600;color:#e2e8f0;">Presenças</th>
                  <th style="padding:1rem 1.5rem;text-align:center;font-size:0.875rem;font-weight:600;color:#e2e8f0;">Primeira</th>
                  <th style="padding:1rem 1.5rem;text-align:center;font-size:0.875rem;font-weight:600;color:#e2e8f0;">Última</th>
                </tr>
              </thead>
              <tbody>
                ${state.dados.map((jogador, idx) => `
                  <tr style="border-bottom:1px solid #334155;">
                    <td style="padding:1rem 1.5rem;color:#94a3b8;font-weight:500;">${idx + 1}</td>
                    <td style="padding:1rem 1.5rem;">
                      <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:2.5rem;height:2.5rem;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;flex-shrink:0;">
                          ${jogador.nome.charAt(0).toUpperCase()}
                        </div>
                        <span style="color:white;font-weight:500;">${jogador.nome}</span>
                      </div>
                    </td>
                    <td style="padding:1rem 1.5rem;text-align:center;">
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:3rem;height:3rem;border-radius:50%;background:#2563eb;color:white;font-weight:bold;font-size:1.125rem;">
                        ${jogador.total_presencas}
                      </span>
                    </td>
                    <td style="padding:1rem 1.5rem;text-align:center;color:#cbd5e1;">${jogador.primeira_presenca}</td>
                    <td style="padding:1rem 1.5rem;text-align:center;color:#cbd5e1;">${jogador.ultima_presenca}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${state.dados.length === 0 ? `
          <div style="background:#1e293b;border-radius:1rem;padding:3rem;text-align:center;border:1px solid #334155;">
            <p style="color:#94a3b8;font-size:1.125rem;">Conectado! Mas não há dados para exibir.</p>
            <p style="color:#64748b;font-size:0.875rem;margin-top:0.5rem;">Adicione jogadores e presenças no banco de dados.</p>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
render();
