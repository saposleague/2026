// auth-manager.js - Gerenciador de autenticação para pelada/admin.html
// Usa auth-guard.js como base para evitar duplicação de lógica.
import { requireAuth, setupLogout } from './auth-guard.js';

class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        // requireAuth() redireciona para ../admin.html se não autenticado
        this.user = await requireAuth('../admin.html');
        this.showUserInfo();
        // O botão de logout em pelada/admin.html tem id="logout-btn" (diferente dos outros)
        setupLogout('logout-btn', '../admin.html');
    }

    showUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && this.user) {
            userEmailElement.textContent = `👤 ${this.user.email}`;
        }
    }

    isAuthenticated() {
        return !!this.user;
    }

    getUser() {
        return this.user;
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

export { AuthManager };
