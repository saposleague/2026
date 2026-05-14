// offline.js
// Lógica da página offline: detecção de conexão e tentativa de reconexão

let isOnline = navigator.onLine;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function updateConnectionStatus() {
    const indicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');

    if (isOnline) {
        indicator.classList.add('online');
        statusText.textContent = 'Conexão restaurada! Redirecionando...';

        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } else {
        indicator.classList.remove('online');
        statusText.textContent = 'Sem conexão com a internet';
    }
}

function tryReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        alert('Muitas tentativas de reconexão. Verifique sua internet e recarregue a página.');
        return;
    }

    reconnectAttempts++;
    const statusText = document.getElementById('statusText');
    statusText.textContent = `Tentando reconectar... (${reconnectAttempts}/${maxReconnectAttempts})`;

    fetch('/', {
        method: 'HEAD',
        cache: 'no-cache'
    })
    .then(response => {
        if (response.ok) {
            isOnline = true;
            updateConnectionStatus();
        } else {
            throw new Error('Sem conexão');
        }
    })
    .catch(() => {
        setTimeout(() => {
            statusText.textContent = 'Falha na reconexão. Tente novamente.';
        }, 1000);
    });
}

function goHome() {
    window.location.href = '/';
}

// Expor funções chamadas via onclick no HTML
window.tryReconnect = tryReconnect;
window.goHome = goHome;

// Listeners de conexão
window.addEventListener('online', () => {
    isOnline = true;
    updateConnectionStatus();
});

window.addEventListener('offline', () => {
    isOnline = false;
    updateConnectionStatus();
});

// Verificação inicial
updateConnectionStatus();

// Verificar conexão periodicamente
setInterval(() => {
    if (!isOnline) {
        fetch('/', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000)
        })
        .then(response => {
            if (response.ok) {
                isOnline = true;
                updateConnectionStatus();
            }
        })
        .catch(() => {
            // Continua offline
        });
    }
}, 10000);

console.log('📱 Página offline carregada');
