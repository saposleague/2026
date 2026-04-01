// js/painel.js
import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'admin.html';
    return;
  }
  document.getElementById('user-email').textContent = user.email;
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'admin.html';
});
