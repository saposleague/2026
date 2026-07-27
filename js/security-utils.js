/**
 * Utilitários compartilhados para renderização segura de dados externos.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function safeHttpUrl(value, fallback = '') {
  const candidates = [value, fallback];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(String(candidate), window.location.href);
      if (['http:', 'https:'].includes(url.protocol)) {
        return escapeHtml(url.href);
      }
    } catch {
      // Tenta o próximo candidato.
    }
  }

  return '';
}
