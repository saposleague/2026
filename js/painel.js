// js/painel.js
import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const auth = getAuth(app);
const db = getFirestore(app);

const SUPABASE_URL = 'https://yaapgjkvkhsfsskkbmso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYXBnamt2a2hzZnNza2tibXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTQ3MjUsImV4cCI6MjA3MDY3MDcyNX0.RiPWRX__AjuioaLVU5gkJFuOpVdBYwCN0HuD2gd0laM';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'admin.html';
    return;
  }

  // Preenche nome e avatar com as iniciais do email
  const email = user.email || '';
  const iniciais = email.substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').textContent = iniciais;
  document.getElementById('user-name').textContent = email.split('@')[0];

  carregarStats();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'admin.html';
});

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

    // Jogadores do Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jogadores?select=id`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('stat-jogadores').textContent = data.length;
    }
  } catch (e) {
    console.error('Erro ao carregar stats:', e);
  }
}
