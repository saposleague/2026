# Documento de Requisitos

## Introdução

Esta feature adiciona uma página dedicada ao **Gerador de Times da Pelada** no sistema Sapos League. O objetivo é permitir que o organizador da pelada distribua os jogadores presentes em times balanceados, levando em conta o nível/habilidade de cada jogador. A página será separada do gerador de rodadas existente (`gerador-rodadas.html`) e seguirá o mesmo padrão visual e técnico do projeto (HTML, CSS e JS vanilla + Supabase).

A lógica central de balanceamento é o ponto mais crítico desta feature e deve ser revisada e aprovada antes da implementação.

---

## Glossário

- **Pelada**: Partida de futebol amador informal entre amigos.
- **Gerador_de_Times**: O sistema responsável por distribuir jogadores em times balanceados.
- **Jogador**: Pessoa cadastrada no Supabase que pode participar de uma pelada.
- **Nível**: Atributo numérico de 1 a 5 que representa a habilidade de um jogador (1 = iniciante, 5 = avançado), armazenado na tabela `jogadores` do Supabase.
- **Time**: Grupo de jogadores formado pelo Gerador_de_Times para disputar uma pelada.
- **Força_do_Time**: Soma dos níveis de todos os jogadores de um time.
- **Diferença_de_Força**: Valor absoluto da diferença entre a Força_do_Time de dois times.
- **Goleiro_da_Sessão**: Jogador designado pelo organizador como goleiro para uma pelada específica, sem que isso altere o cadastro permanente do jogador.
- **Sorteio**: Processo de distribuição aleatória de jogadores entre os times.
- **Balanceamento**: Processo de ajuste dos times para minimizar a Diferença_de_Força.
- **Configuração_da_Pelada**: Parâmetros definidos pelo organizador antes do sorteio (número de times, jogadores por time, goleiros da sessão, etc.).
- **Jogador_Genérico**: Jogador fictício inserido automaticamente pelo Gerador_de_Times para completar vagas restantes quando o número de jogadores selecionados não preenche todos os times. Seu nível é calculado para equilibrar o time mais fraco.
- **Vagas_Restantes**: Número de posições não preenchidas por jogadores reais após a distribuição, calculado como `(número de times × jogadores por time) − número de jogadores selecionados`.
- **Troca_de_Jogadores**: Ação do organizador de mover um jogador de um time para outro após o sorteio, sem refazer a distribuição completa.

---

## Requisitos

### Requisito 1: Carregamento de Jogadores do Supabase

**User Story:** Como organizador da pelada, quero que o sistema carregue automaticamente a lista de jogadores cadastrados no Supabase, para que eu não precise digitar os nomes manualmente.

#### Critérios de Aceitação

1. WHEN a página do Gerador_de_Times é carregada, THE Gerador_de_Times SHALL buscar a lista de jogadores da tabela `jogadores` no Supabase.
2. WHEN a busca de jogadores é concluída com sucesso, THE Gerador_de_Times SHALL exibir todos os jogadores disponíveis com nome e nível, mostrando o nível em estrelas (★) na frente do nome de cada jogador.
3. IF a tabela `jogadores` estiver vazia, THEN THE Gerador_de_Times SHALL exibir a mensagem "Nenhum jogador cadastrado. Adicione jogadores pelo painel de administração."
4. IF ocorrer um erro na conexão com o Supabase, THEN THE Gerador_de_Times SHALL exibir a mensagem "Erro ao carregar jogadores. Verifique sua conexão e recarregue a página."
5. THE Gerador_de_Times SHALL exibir o nível de cada jogador como uma representação visual de estrelas preenchidas (ex: ★★★☆☆ para nível 3) imediatamente antes do nome do jogador na lista.

---

### Requisito 1-A: Cadastro de Nível dos Jogadores no Supabase

**User Story:** Como administrador do sistema, quero definir o nível (1 a 5 estrelas) de cada jogador no Supabase, para que o balanceamento dos times use dados atualizados de habilidade.

#### Critérios de Aceitação

1. THE Supabase SHALL armazenar o nível de cada jogador na coluna `nivel` (inteiro, valores de 1 a 5) da tabela `jogadores`.
2. IF o campo `nivel` de um jogador não estiver preenchido, THEN THE Gerador_de_Times SHALL tratar o nível desse jogador como 1 (iniciante) para fins de balanceamento.
3. THE Gerador_de_Times SHALL permitir que o organizador edite o nível de um jogador diretamente na lista, sem sair da página, salvando a alteração na tabela `jogadores` do Supabase.
4. WHEN o nível de um jogador é atualizado, THE Gerador_de_Times SHALL refletir a mudança visual imediatamente na lista sem recarregar a página.
5. IF o valor informado para o nível estiver fora do intervalo de 1 a 5, THEN THE Gerador_de_Times SHALL rejeitar a entrada e exibir a mensagem "O nível deve ser entre 1 e 5."

---

**User Story:** Como organizador da pelada, quero selecionar quais jogadores estão presentes no dia, para que apenas os jogadores disponíveis sejam distribuídos nos times.

#### Critérios de Aceitação

1. THE Gerador_de_Times SHALL exibir todos os jogadores carregados em uma lista com checkboxes de seleção, mostrando as estrelas de nível na frente do nome de cada jogador.
2. WHEN o organizador clica no checkbox de um jogador, THE Gerador_de_Times SHALL alternar o estado de seleção desse jogador (selecionado/não selecionado).
3. THE Gerador_de_Times SHALL exibir em tempo real o contador de jogadores selecionados no formato "X jogadores selecionados".
4. THE Gerador_de_Times SHALL disponibilizar um botão "Selecionar Todos" que marca todos os jogadores da lista.
5. THE Gerador_de_Times SHALL disponibilizar um botão "Limpar Seleção" que desmarca todos os jogadores da lista.
6. WHILE o número de jogadores selecionados for menor que 2, THE Gerador_de_Times SHALL manter o botão de gerar times desabilitado.

---

### Requisito 3: Configuração da Pelada

**User Story:** Como organizador da pelada, quero configurar o número de times e o número de jogadores por time antes do sorteio, para que o sorteio seja feito de acordo com o formato da pelada do dia.

#### Critérios de Aceitação

1. THE Gerador_de_Times SHALL permitir que o organizador selecione o número de times a serem formados (mínimo 2, máximo 6).
2. THE Gerador_de_Times SHALL permitir que o organizador defina o número de jogadores por time (mínimo 2, máximo 15).
3. THE Gerador_de_Times SHALL calcular e exibir em tempo real o total de jogadores necessários com base na fórmula `número de times × jogadores por time`.
4. WHEN o número de jogadores selecionados for diferente do total necessário, THE Gerador_de_Times SHALL exibir um alerta visual indicando a diferença (ex: "Você selecionou 18 jogadores, mas a configuração exige 21. Faltam 3 vagas.").
5. WHEN o número de jogadores selecionados for exatamente igual ao total necessário, THE Gerador_de_Times SHALL remover o alerta e habilitar o botão de gerar times.
6. THE Gerador_de_Times SHALL permitir que o organizador ative a opção "Separar Goleiros" e, quando ativa, exibir um controle para marcar individualmente quais jogadores da lista serão Goleiro_da_Sessão nesta pelada.
7. WHERE a opção "Separar Goleiros" estiver ativa, THE Gerador_de_Times SHALL distribuir os Goleiros_da_Sessão marcados pelo organizador, um por time, antes do balanceamento dos demais jogadores.
8. WHERE a opção "Separar Goleiros" estiver ativa e o número de Goleiros_da_Sessão marcados for diferente do número de times, THEN THE Gerador_de_Times SHALL exibir um aviso indicando a inconsistência e impedir o sorteio até que seja corrigida.

---

### Requisito 4: Lógica de Geração e Balanceamento de Times

**User Story:** Como organizador da pelada, quero que os times sejam gerados de forma o mais equilibrada possível com base nas estrelas de cada jogador, para que as partidas sejam mais justas e divertidas.

#### Critérios de Aceitação

1. WHEN o organizador aciona o botão "Gerar Times", THE Gerador_de_Times SHALL distribuir os jogadores selecionados nos times usando o algoritmo de balanceamento por nível descrito abaixo.
2. THE Gerador_de_Times SHALL implementar o seguinte algoritmo de balanceamento:
   - **Passo 1 – Separação de Goleiros_da_Sessão (se ativado):** Os jogadores marcados como Goleiro_da_Sessão são separados e distribuídos aleatoriamente, um por time.
   - **Passo 2 – Ordenação:** Os jogadores restantes são ordenados por nível em ordem decrescente (do mais habilidoso ao menos habilidoso). Jogadores com o mesmo nível são embaralhados aleatoriamente entre si.
   - **Passo 3 – Distribuição Greedy:** A cada passo, o próximo jogador da lista ordenada é atribuído ao time com menor Força_do_Time acumulada. Em caso de empate de força, o time com menor número de jogadores recebe o próximo. Em caso de empate de força e quantidade, a escolha é aleatória entre os times empatados.
   - **Passo 4 – Preenchimento com Jogadores_Genéricos:** Se houver Vagas_Restantes após a distribuição de todos os jogadores reais, THE Gerador_de_Times SHALL preencher cada vaga com um Jogador_Genérico cujo nível é calculado conforme o Requisito 4-A.
   - **Passo 5 – Embaralhamento interno:** Após a distribuição, a ordem dos jogadores dentro de cada time é embaralhada aleatoriamente.
3. THE Gerador_de_Times SHALL minimizar a Diferença_de_Força entre os times, buscando o resultado mais equilibrado possível dado o conjunto de jogadores selecionados.
4. THE Gerador_de_Times SHALL calcular e exibir a Força_do_Time de cada time gerado.
5. THE Gerador_de_Times SHALL calcular e exibir a Diferença_de_Força entre o time mais forte e o mais fraco.
6. WHEN a Diferença_de_Força for maior que o nível médio dos jogadores, THE Gerador_de_Times SHALL exibir um aviso visual indicando que o balanceamento pode não ser ideal.
7. THE Gerador_de_Times SHALL permitir que o organizador acione "Gerar Novamente" para refazer o sorteio com uma nova distribuição aleatória, mantendo os mesmos jogadores selecionados e a mesma configuração.

---

### Requisito 4-A: Jogador Genérico para Times Incompletos

**User Story:** Como organizador da pelada, quero que vagas não preenchidas por jogadores reais sejam completadas com jogadores genéricos de nível calculado automaticamente, para que os times fiquem equilibrados mesmo quando o número de jogadores não fecha exatamente.

#### Critérios de Aceitação

1. WHEN o número de jogadores selecionados for menor que o total necessário (`número de times × jogadores por time`), THE Gerador_de_Times SHALL calcular o número de Vagas_Restantes e preencher cada vaga com um Jogador_Genérico.
2. THE Gerador_de_Times SHALL calcular o nível de cada Jogador_Genérico como o nível inteiro mais próximo que minimiza a Diferença_de_Força após a inserção, arredondado para o inteiro mais próximo dentro do intervalo de 1 a 5.
3. THE Gerador_de_Times SHALL atribuir cada Jogador_Genérico ao time com menor Força_do_Time no momento da inserção, seguindo a mesma lógica greedy do Requisito 4.
4. THE Gerador_de_Times SHALL nomear cada Jogador_Genérico no padrão `"Jogador X⭐"`, onde X é o nível calculado (ex: `"Jogador 4⭐"`).
5. THE Gerador_de_Times SHALL exibir os Jogadores_Genéricos visualmente diferenciados dos jogadores reais nos cards de time (ex: cor diferente, ícone ou rótulo "genérico").
6. THE Gerador_de_Times SHALL incluir os Jogadores_Genéricos no cálculo da Força_do_Time e da Diferença_de_Força.
7. WHEN o texto dos times é copiado via "Copiar Times", THE Gerador_de_Times SHALL incluir os Jogadores_Genéricos na lista de cada time com o nome no padrão `"Jogador X⭐"`.
8. THE Gerador_de_Times SHALL exibir uma nota informativa abaixo dos times indicando quantos jogadores genéricos foram adicionados e que eles representam jogadores a serem "pegos emprestados" de outro time na hora do jogo.

---

### Requisito 4-B: Troca Livre de Jogadores Entre Times

**User Story:** Como organizador da pelada, quero poder mover jogadores livremente entre os times após o sorteio, para que eu possa fazer ajustes manuais sem precisar refazer o sorteio completo.

#### Critérios de Aceitação

1. WHEN os times são exibidos após o sorteio, THE Gerador_de_Times SHALL permitir que o organizador mova qualquer jogador de um time para outro por meio de arrastar e soltar (drag-and-drop) ou por um controle de seleção equivalente.
2. WHEN uma Troca_de_Jogadores é realizada, THE Gerador_de_Times SHALL recalcular e atualizar a Força_do_Time de ambos os times afetados em tempo real, sem recarregar a página.
3. WHEN uma Troca_de_Jogadores é realizada, THE Gerador_de_Times SHALL recalcular e atualizar a Diferença_de_Força exibida no resumo em tempo real.
4. THE Gerador_de_Times SHALL permitir trocas envolvendo Jogadores_Genéricos da mesma forma que jogadores reais.
5. THE Gerador_de_Times SHALL disponibilizar um botão "Desfazer Troca" que reverte a última Troca_de_Jogadores realizada.
6. WHILE o organizador estiver arrastando um jogador, THE Gerador_de_Times SHALL destacar visualmente as áreas de destino válidas (outros times) para orientar a ação.

---

### Requisito 5: Exibição dos Times Gerados

**User Story:** Como organizador da pelada, quero visualizar os times gerados de forma clara, para que eu possa comunicar a distribuição aos jogadores.

#### Critérios de Aceitação

1. WHEN os times são gerados, THE Gerador_de_Times SHALL exibir cada time em um card separado com nome do time (ex: "Time 1", "Time 2") e a lista de jogadores.
2. THE Gerador_de_Times SHALL exibir a Força_do_Time de cada card de forma discreta (visível ao organizador, mas não destacada para não expor os níveis aos jogadores).
3. THE Gerador_de_Times SHALL exibir um resumo com a Diferença_de_Força entre o time mais forte e o mais fraco.
4. THE Gerador_de_Times SHALL disponibilizar um botão "Copiar Times" que copia o resultado para a área de transferência no formato de texto simples, adequado para envio via WhatsApp.
5. WHEN o botão "Copiar Times" é acionado, THE Gerador_de_Times SHALL formatar o texto copiado no seguinte padrão:
   ```
   ⚽ Times da Pelada
   
   Time 1: [Nome1], [Nome2], [Nome3]...
   Time 2: [Nome1], [Nome2], [Nome3]...
   ```
6. WHEN o texto é copiado com sucesso, THE Gerador_de_Times SHALL exibir a confirmação "Times copiados!" por 2 segundos.

---

### Requisito 6: Autenticação e Acesso

**User Story:** Como administrador do sistema, quero que o gerador de times seja acessível apenas para usuários autenticados, para proteger a funcionalidade de administração.

#### Critérios de Aceitação

1. WHEN a página do Gerador_de_Times é carregada, THE Gerador_de_Times SHALL verificar se o usuário está autenticado via Supabase Auth.
2. IF o usuário não estiver autenticado, THEN THE Gerador_de_Times SHALL redirecionar para `admin.html` e salvar a URL atual em `sessionStorage` para redirecionamento pós-login.
3. THE Gerador_de_Times SHALL exibir um botão "Sair" no header que realiza o logout via Supabase Auth e redireciona para `admin.html`.
4. THE Gerador_de_Times SHALL exibir um botão "← Voltar ao Painel" que redireciona para `painel.html`.

---

### Requisito 8: Exportação de Imagem dos Times

**User Story:** Como organizador da pelada, quero exportar os times gerados como uma imagem PNG, para que eu possa compartilhar visualmente a distribuição dos times pelo WhatsApp ou outras redes sociais.

#### Critérios de Aceitação

1. WHEN os times são gerados, THE Gerador_de_Times SHALL exibir um botão "Exportar Imagem" na área de resultados.
2. WHEN o organizador aciona o botão "Exportar Imagem", THE Gerador_de_Times SHALL gerar uma imagem PNG com todos os times dispostos em um grid adaptado à quantidade de times, conforme a tabela abaixo:
   - 2 times: grid 1×2 (lado a lado)
   - 3 times: grid 2×2 com a última célula vazia
   - 4 times: grid 2×2
   - 5 times: grid 2×3 (ou 3×2)
   - 6 times: grid 2×3 (ou 3×2)
3. THE Gerador_de_Times SHALL gerar a imagem inteiramente no cliente, via canvas HTML5 ou biblioteca equivalente (ex: html2canvas), sem enviar dados para nenhum servidor.
4. THE Gerador_de_Times SHALL incluir em cada card de time na imagem: o nome do time (ex: "Time 1") e a lista de jogadores com as estrelas de nível exibidas antes do nome (ex: "★★★ João").
5. THE Gerador_de_Times SHALL aplicar na imagem gerada a identidade visual do projeto: paleta de cores do tema ativo (escuro ou claro), tipografia e estilo visual consistentes com a interface da página.
6. THE Gerador_de_Times SHALL exibir os Jogadores_Genéricos na imagem com visual diferenciado dos jogadores reais, usando cor de texto distinta ou estilo itálico.
7. WHEN a imagem é gerada com sucesso, THE Gerador_de_Times SHALL iniciar automaticamente o download do arquivo no dispositivo do usuário com o nome `"times-pelada.png"`.
8. IF ocorrer um erro durante a geração da imagem, THEN THE Gerador_de_Times SHALL exibir a mensagem "Erro ao gerar imagem. Tente novamente." sem perder os times exibidos na tela.

---

## Nota sobre a Lógica de Balanceamento

A lógica central (Requisito 4, critério 2) usa o algoritmo **Greedy por menor força acumulada**:

- Jogadores são ordenados do maior para o menor nível. Jogadores com o mesmo nível são embaralhados entre si para introduzir aleatoriedade.
- A cada passo, o próximo jogador vai para o time com menor força acumulada.
- Isso garante que times mais fortes recebam jogadores mais fracos nas próximas rodadas, convergindo para o máximo equilíbrio possível.
- O objetivo é minimizar a Diferença_de_Força ao final da distribuição.
- Quando há Vagas_Restantes, Jogadores_Genéricos são inseridos com o nível calculado para equilibrar o time mais fraco, seguindo a mesma lógica greedy.

**Exemplo com 6 jogadores (níveis: 5, 5, 4, 3, 3, 2) em 2 times:**
```
Ordenados: [J1=5, J2=5, J3=4, J4=3, J5=3, J6=2]
Passo 1: T1 recebe J1(5) → T1=5, T2=0
Passo 2: T2 recebe J2(5) → T1=5, T2=5
Passo 3: empate → aleatório → T1 recebe J3(4) → T1=9, T2=5
Passo 4: T2 recebe J4(3) → T1=9, T2=8
Passo 5: T2 recebe J5(3) → T1=9, T2=11
Passo 6: T1 recebe J6(2) → T1=11, T2=11
```
**Resultado:** Diferença_de_Força = 0 (equilíbrio perfeito neste caso).

**Exemplo com jogadores genéricos (18 jogadores, 3 times de 7 = 21 vagas, 3 Vagas_Restantes):**
```
Após distribuição dos 18 jogadores reais:
T1=força_a, T2=força_b, T3=força_c (time mais fraco identificado)
Cada Jogador_Genérico recebe o nível que minimiza a Diferença_de_Força e é atribuído ao time mais fraco.
Resultado exibido: "Jogador 4⭐" (se nível calculado = 4)
```

**Resultado esperado:** Diferença_de_Força ≤ nível médio dos jogadores na maioria dos casos.
