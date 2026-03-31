# Plano de Implementação: Gerador de Times da Pelada

## Visão Geral

Implementar a página `gerador-times.html` com CSS e JS dedicados, seguindo o padrão visual de `gerador-rodadas.html`. A autenticação usa Firebase Auth, os dados de jogadores vêm do Supabase (tabela `jogadores` com coluna `nivel`), e não há persistência de histórico de peladas.

## Tarefas

- [x] 1. Criar estrutura de arquivos e configuração base
  - Criar `gerador-times.html` com estrutura HTML completa (header, seções, modais), seguindo o padrão de `gerador-rodadas.html`
  - Criar `css/gerador-times.css` com estilos base (header, cards, botões, lista de jogadores, cards de times, drag-and-drop highlight, responsividade)
  - Criar `js/gerador-times.js` como ES module com imports de Firebase Auth e Supabase JS (CDN), e o objeto `state` inicial
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implementar autenticação e navegação
  - [x] 2.1 Implementar `inicializarAuth()` com `onAuthStateChanged` do Firebase: redirecionar para `admin.html` se não autenticado, salvar URL em `sessionStorage`
    - Seguir exatamente o padrão de `gerador-rodadas.js` (sem usar `auth-manager.js`)
    - Adicionar listener no botão "Sair" para `signOut` + redirect
    - Adicionar listener no botão "← Voltar ao Painel" para redirect para `painel.html`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Implementar carregamento e exibição de jogadores
  - [x] 3.1 Implementar `carregarJogadores()`: SELECT `id, nome, nivel` FROM `jogadores` ORDER BY `nome` via Supabase JS; tratar `nivel` null como 1; exibir mensagem se lista vazia ou erro de conexão
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.2 Implementar `renderizarEstrelas(nivel)`: retorna string com N `★` e (5-N) `☆`
    - _Requirements: 1.5, 1A.4_
  - [ ]* 3.3 Escrever property test para `renderizarEstrelas` (Property 1)
    - **Property 1: Renderização de estrelas**
    - **Validates: Requirements 1.5, 1A.4**
  - [x] 3.4 Implementar `renderizarLista(jogadores)`: renderiza `<ul>` com checkboxes, estrelas antes do nome, botão de edição de nível inline
    - _Requirements: 1.2, 1.5, 2.1_

- [x] 4. Implementar seleção de jogadores
  - [x] 4.1 Implementar `toggleSelecao(id)`, `selecionarTodos()`, `limparSelecao()` e `atualizarContador()`: atualizar `state.jogadores`, exibir contador "X jogadores selecionados", habilitar/desabilitar botão gerar quando selecionados < 2
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ]* 4.2 Escrever property tests para seleção (Properties 3, 4, 5, 6)
    - **Property 3: Contador de seleção reflete o conjunto**
    - **Property 4: Toggle de seleção é round-trip**
    - **Property 5: Selecionar todos então limpar retorna ao estado vazio**
    - **Property 6: Botão gerar desabilitado para seleção insuficiente**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

- [x] 5. Implementar edição de nível inline
  - [x] 5.1 Implementar `abrirEdicaoNivel(id)` e `salvarEdicaoNivel(id, novoNivel)`: validar intervalo [1,5], chamar `atualizarNivelJogador(id, nivel)` no Supabase, atualizar visual imediatamente sem reload; rejeitar e exibir "O nível deve ser entre 1 e 5." se inválido; reverter visual se falha no Supabase
    - _Requirements: 1A.3, 1A.4, 1A.5_
  - [ ]* 5.2 Escrever property test para validação de nível (Property 2)
    - **Property 2: Validação de nível fora do intervalo**
    - **Validates: Requirements 1A.5**

- [x] 6. Implementar configuração da pelada
  - [x] 6.1 Implementar `atualizarTotalNecessario()` e `validarConfiguracao()`: calcular `numTimes × jogadoresPorTime`, exibir alerta de diferença em tempo real, habilitar botão gerar apenas quando configuração válida e selecionados === total necessário
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 6.2 Escrever property tests para configuração (Properties 7, 8)
    - **Property 7: Cálculo de total necessário**
    - **Property 8: Alerta de configuração é bidirecional**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  - [x] 6.3 Implementar `toggleSepararGoleiros()` e `renderizarSeletorGoleiros()`: exibir controles de marcação de goleiro por sessão na lista; bloquear sorteio e exibir aviso se número de goleiros marcados ≠ número de times
    - _Requirements: 3.6, 3.7, 3.8_

- [ ] 7. Checkpoint — Garantir que a UI base funciona
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas antes de continuar.

- [x] 8. Implementar algoritmo de balanceamento (Greedy)
  - [x] 8.1 Implementar `gerarTimes(jogadores, config)`: separar goleiros (se ativo), ordenar por nível DESC com embaralhamento entre iguais, distribuição greedy por menor força acumulada (desempate: menor quantidade, depois aleatório), embaralhamento interno de cada time
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 8.2 Escrever property tests para balanceamento (Properties 9, 10, 11, 12, 13)
    - **Property 9: Distribuição de goleiros — um por time**
    - **Property 10: Balanceamento greedy minimiza diferença de força**
    - **Property 11: Força do time é a soma dos níveis**
    - **Property 12: Diferença de força é o valor absoluto correto**
    - **Property 13: Aviso de desequilíbrio é consistente**
    - **Validates: Requirements 3.7, 4.2, 4.3, 4.4, 4.5, 4.6**
  - [x] 8.3 Implementar `criarJogadorGenerico(nivel, index)` e preenchimento de vagas restantes: calcular nível ideal para minimizar diferença, nomear `"Jogador N⭐"`, atribuir ao time mais fraco
    - _Requirements: 4A.1, 4A.2, 4A.3, 4A.4_
  - [ ]* 8.4 Escrever property tests para jogadores genéricos (Properties 14, 15)
    - **Property 14: Número de jogadores genéricos é exato**
    - **Property 15: Nome do jogador genérico segue o padrão**
    - **Validates: Requirements 4A.1, 4A.4**

- [x] 9. Implementar exibição dos times gerados
  - [x] 9.1 Implementar `renderizarTimes(times)` e `renderizarCard(time)`: exibir cards com nome do time, lista de jogadores (genéricos visualmente diferenciados), força do time discreta, nota informativa de genéricos
    - _Requirements: 5.1, 5.2, 4A.5, 4A.6, 4A.8_
  - [x] 9.2 Implementar `atualizarResumo(times)`: exibir Diferença_de_Força entre o mais forte e o mais fraco; exibir aviso visual se diferença > nível médio
    - _Requirements: 5.3, 4.5, 4.6_

- [x] 10. Implementar drag-and-drop e troca de jogadores
  - [x] 10.1 Implementar `inicializarDragAndDrop()`: atributo `draggable="true"` nos `<li>` de jogadores, listeners `dragstart/dragend` nos jogadores, listeners `dragover/drop` nos cards de time, classe CSS `.drop-target` durante o drag
    - _Requirements: 4B.1, 4B.6_
  - [x] 10.2 Implementar `trocarJogadores(jogadorId, timeOrigemId, timeDestinoId)`: mover jogador entre times, recalcular `calcularForca(time)` e `calcularDiferenca(times)` em tempo real, empilhar snapshot em `state.historicoDeTrocas`
    - _Requirements: 4B.1, 4B.2, 4B.3, 4B.4_
  - [ ]* 10.3 Escrever property tests para troca e desfazer (Properties 16, 17)
    - **Property 16: Recálculo de força após troca**
    - **Property 17: Desfazer troca é round-trip**
    - **Validates: Requirements 4B.2, 4B.3, 4B.5**
  - [x] 10.4 Implementar `desfazerTroca()`: pop do histórico e restauração do snapshot anterior
    - _Requirements: 4B.5_

- [ ] 11. Checkpoint — Garantir que geração e troca de jogadores funcionam
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas antes de continuar.

- [x] 12. Implementar exportação de texto e imagem
  - [x] 12.1 Implementar `formatarTextoTimes(times)` e `copiarTimes(times)`: formatar texto no padrão `"⚽ Times da Pelada\n\nTime N: nome1, nome2..."` incluindo genéricos, usar Clipboard API com fallback modal para cópia manual, exibir confirmação "Times copiados!" por 2 segundos
    - _Requirements: 5.4, 5.5, 5.6, 4A.7_
  - [ ]* 12.2 Escrever property test para formatação de texto (Property 18)
    - **Property 18: Formatação do texto de cópia**
    - **Validates: Requirements 5.5, 4A.7**
  - [x] 12.3 Implementar `exportarImagem(times)`: lazy load de `html2canvas` via CDN, capturar `#times-resultado`, escala 2×, download automático como `"times-pelada.png"`, tratar erro com mensagem "Erro ao gerar imagem. Tente novamente."
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
  - [ ]* 12.4 Escrever property test para grid de imagem (Property 20)
    - **Property 20: Grid de imagem segue a tabela especificada**
    - **Validates: Requirements 8.2**

- [ ] 13. Checkpoint final — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas antes de finalizar.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Os testes de propriedade usam a biblioteca `fast-check` (sem dependência de framework)
- Jogadores genéricos são visualmente diferenciados (cor diferente ou estilo itálico) dos jogadores reais
- Não há persistência de histórico de peladas (tabela `peladas` removida do escopo)
- A autenticação segue o padrão de `gerador-rodadas.js` (Firebase Auth direto, sem `auth-manager.js`)
