/**
 * auth-guard.js
 * Módulo centralizado de proteção de rotas autenticadas.
 *
 * Uso em qualquer página protegida:
 *
 *   import { requireAuth, setupLogout } from './auth-guard.js';
 *
 *   const user = await requireAuth();          // redireciona para login se não autenticado
 *   setupLogout('logout-button');              // configura o botão de sair
 *
 * Substitui o bloco onAuthStateChanged repetido em rodadas.js,
 * jogadores.js, gerador-times.js, gerador-rodadas.js e painel.js.
 */

import { app } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

const auth = getAuth(app);

/**
 * Garante que o usuário está autenticado.
 * Se não estiver, salva a URL atual e redireciona para o login.
 *
 * @param {string} [loginPath] - Caminho para a página de login.
 *                               Padrão: detectado automaticamente conforme profundidade da URL.
 * @returns {Promise<import('firebase/auth').User>} O usuário autenticado.
 */
export function requireAuth(loginPath) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = loginPath || _detectLoginPath();
        return;
      }
      resolve(user);
    });
  });
}

/**
 * Configura o botão de logout.
 *
 * @param {string} buttonId - ID do elemento HTML do botão.
 * @param {string} [loginPath] - Para onde redirecionar após o logout.
 */
export function setupLogout(buttonId, loginPath) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[auth-guard] Erro ao fazer logout:', err);
    } finally {
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.href = loginPath || _detectLoginPath();
    }
  });
}

/**
 * Retorna o objeto auth do Firebase (para casos onde outros módulos precisam).
 * @returns {import('firebase/auth').Auth}
 */
export function getFirebaseAuth() {
  return auth;
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Detecta automaticamente o caminho para admin.html com base
 * na profundidade atual da URL (raiz vs subpasta /pelada/).
 */
function _detectLoginPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  // Se estiver em /pelada/ (ou qualquer subpasta), sobe um nível
  const isSubfolder = window.location.pathname.includes('/pelada/');
  return isSubfolder ? '../admin.html' : 'admin.html';
}
