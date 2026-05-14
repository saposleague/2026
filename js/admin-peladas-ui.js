// admin-peladas-ui.js
// Lógica de UI da página pelada/admin.html (partículas, animações, validação de formulário)

// Adicionar partículas dinamicamente ao container .floating-particles
function createParticles() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 15 + 10) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 6 + 's';
        container.appendChild(particle);
    }
}

// Animação suave para os campos de input
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });

    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Validação básica do formulário
const peladaForm = document.getElementById('pelada-form');
if (peladaForm) {
    peladaForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const data = document.getElementById('data-pelada').value;
        const jogadores = document.getElementById('lista-jogadores').value.trim();

        if (!data || !jogadores) {
            showWarning('Atenção!', 'Por favor, preencha a data e a lista de jogadores!');
            return;
        }

        showSuccess('Formulário válido!', 'Agora clique em "Visualizar Lista" para continuar.');
    });
}

// Criar partículas ao carregar a página
createParticles();
