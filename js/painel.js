// js/painel.js
// Credenciais Supabase vêm de js/config.js — não redeclare aqui.
// painel.js usa fetch direto (não usa o cliente Supabase), então só precisa
// das variáveis SUPABASE_URL e SUPABASE_ANON_KEY do escopo global (config.js).
import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { requireAuth, setupLogout } from './auth-guard.js';

const db = getFirestore(app);

// Garante autenticação e exibe dados do usuário
requireAuth().then((user) => {
  const email = user.email || '';
  const iniciais = email.substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').textContent = iniciais;
  document.getElementById('user-name').textContent = email.split('@')[0];
  carregarStats();
});

setupLogout('logout-button');

async function carregarStats() {
  try {
    // Times e rodadas do Firebase (soma fase1 + fase2 + final)
    const [timesSnap, fase1Snap, fase2Snap] = await Promise.all([
      getDocs(collection(db, 'times')),
      getDocs(collection(db, 'rodadas2026_fase1')),
      getDocs(collection(db, 'rodadas2026_fase2')),
    ]);

    document.getElementById('stat-times').textContent = timesSnap.size;
    const totalRodadas = fase1Snap.size + fase2Snap.size + 1; // +1 pela grande final
    document.getElementById('stat-rodadas').textContent = totalRodadas;

    // Rodadas pendentes (sem resultado) — fase1 + fase2
    let pendentes = 0;
    [fase1Snap, fase2Snap].forEach(snap => {
      snap.forEach(doc => {
        const jogos = doc.data().jogos || [];
        const semResultado = jogos.some(j => j.golsA == null && j.golsB == null);
        if (semResultado) pendentes++;
      });
    });
    document.getElementById('stat-pendentes').textContent = pendentes;

    // Jogadores do Supabase — usa variáveis globais de config.js
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jogadores?select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('stat-jogadores').textContent = data.length;
    }
  } catch (e) {
    console.error('Erro ao carregar stats:', e);
  }
}
