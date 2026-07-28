const FASES_POR_NOME = new Map([
  ['ponta do leste', new Set(['fase2'])],
  ['meteoros', new Set(['fase1'])]
]);

function normalizarNomeTime(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function timeParticipaDaFase(time, fase) {
  if (!time || !['fase1', 'fase2'].includes(fase)) {
    return true;
  }

  if (Array.isArray(time.fases) && time.fases.length > 0) {
    return time.fases.includes(fase);
  }

  const fasesConfiguradas = FASES_POR_NOME.get(normalizarNomeTime(time.nome));
  return fasesConfiguradas ? fasesConfiguradas.has(fase) : true;
}

export function filtrarTimesPorFase(times, fase) {
  return times.filter(time => timeParticipaDaFase(time, fase));
}
