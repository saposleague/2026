# Sapos League 2026

Aplicação web para gestão do campeonato e das peladas da Sapos League. O projeto reúne classificação e rodadas em tempo real, administração de jogadores, controle de presenças, relatórios, PWA e notificações push.

## Status

- **Ambiente:** produção
- **Versão do frontend/PWA:** 2.2.35
- **Última atualização:** 14/08/2026
- **Site:** https://saposleague.github.io/2026/

## Acessos

| Área | URL |
| --- | --- |
| Site público | https://saposleague.github.io/2026/ |
| Login administrativo | https://saposleague.github.io/2026/admin.html |
| Painel administrativo | https://saposleague.github.io/2026/painel.html |
| Gerador de times | https://saposleague.github.io/2026/gerador-times.html |
| Gestão de rodadas | https://saposleague.github.io/2026/rodadas.html |
| Gestão de peladas | https://saposleague.github.io/2026/pelada/admin.html |
| Relatório de presenças | https://saposleague.github.io/2026/relatorio-presencas.html |
| Diagnóstico de notificações | https://saposleague.github.io/2026/debug.html |

## Funcionalidades

### Campeonato

- Classificação atualizada em tempo real pelo Firestore.
- Navegação entre primeira fase, segunda fase e final.
- Seleção automática da rodada que contém o próximo jogo pendente pela data, mesmo quando uma rodada é antecipada.
- Cadastro e edição de partidas, horários, resultados e campeões.
- Geração automática de rodadas.
- Exibição responsiva para computador e celular.

### Times por fase

- **Meteoros:** participa somente da primeira fase.
- **Ponta do Leste:** participa somente da segunda fase.
- Os demais times participam das duas fases.
- A regra principal usa o campo `fases` do time; `js/competition-config.js` mantém uma compatibilidade por nome quando esse campo não existe.

### Peladas e jogadores

- Cadastro e edição de jogadores.
- Organização dos jogadores por time.
- Importação de uma lista, com um nome por linha, no Gerador de Times.
- Reconhecimento automático dos jogadores cadastrados, aviso de nomes incertos e revisão manual antes de gerar.
- Registro e consulta de presenças nas peladas.
- A Gestão de Peladas fica dedicada à consulta, edição e exclusão do histórico e ao controle manual de jogadores aptos.
- Indicação de jogadores aptos com base nas participações recentes.
- Histórico das peladas anteriores.
- Gestão administrativa protegida por login Firebase.

### Relatório de presenças

O relatório possui duas visualizações:

- **Por jogador:** ranking, time atual, total de presenças, primeira e última presença.
- **Por time:** jogadores cadastrados, total de idas, média por jogador, média de presentes por pelada e participação percentual.

Na visão por jogador é possível filtrar por:

- Todos os times;
- Galáxia;
- Gordo F.C;
- Ponta do Leste;
- Reclamões;
- Jogadores sem time.

O filtro atualiza tabela, indicadores e gráficos. As exportações estão disponíveis em PDF e Excel; o arquivo Excel contém abas de resumo, jogadores e times.

Regras do relatório:

- Meteoros fica oculto dos comparativos por time.
- As presenças são atribuídas ao **time atual** de cada jogador.
- Presenças de jogadores sem time não entram no comparativo entre times.
- **Média por jogador:** total de idas do time dividido pela quantidade de jogadores do time.
- **Média por pelada:** total de idas do time dividido pela quantidade de datas de pelada registradas.

### PWA e aparência

- Instalável no iPhone e Android.
- Funcionamento offline para recursos já armazenados.
- Service Worker com atualização automática de HTML, JavaScript e CSS quando há internet.
- Verificação de nova versão ao abrir ou retornar ao PWA.
- Limpeza automática dos caches de versões anteriores.
- Tema claro/escuro com preferência salva no aparelho pela chave `modo`.
- Ícones próprios para navegador, tela inicial e notificações.

### Notificações push

- Web Push para PWA no iOS e Android.
- FCM para navegadores/dispositivos compatíveis.
- Envio automático baseado nos jogos cadastrados no Firestore.
- Funções manuais de diagnóstico protegidas por Firebase ID token e permissão administrativa.

Agendamentos no fuso `America/Sao_Paulo`:

| Função | Agenda | Finalidade |
| --- | --- | --- |
| `notifyWeekGames` | Segunda, terça e quarta às 08:00 | Avisar sobre os jogos da quinta-feira |
| `notifyTodayGames` | Quinta-feira às 00:00, 12:00 e 19:00 | Lembrar os jogos do dia |

Funções manuais:

- `forceTestNotification`: disparo imediato de teste.
- `testNotification`: simulação da notificação dos jogos do dia.
- `testWeekNotification`: simulação do aviso semanal.

## Arquitetura

```text
Navegador / PWA
├── Firebase Authentication — login administrativo
├── Firestore — times, fases, rodadas e subscriptions push
├── Supabase — jogadores, presenças, times da pelada e jogadores aptos
└── Firebase Functions
    ├── notificações programadas e manuais
    └── escritas administrativas protegidas no Supabase
```

### Tecnologias

- HTML, CSS e JavaScript sem framework.
- Firebase Authentication, Firestore, Cloud Functions e Cloud Scheduler.
- Supabase/PostgreSQL com Row Level Security.
- Chart.js para gráficos.
- jsPDF e SheetJS para exportações.
- GitHub Pages para o frontend.
- GitHub Actions para publicar Functions e regras do Firestore.

## Segurança

### Firebase

- Páginas administrativas usam `js/auth-guard.js` e exigem login Firebase.
- Funções administrativas manuais verificam o Firebase ID token e a permissão `admin: true`.
- A chave privada VAPID fica no Google Cloud Secret Manager.
- Tokens e subscriptions podem ser cadastrados pelo cliente, mas não podem ser lidos publicamente pelas regras do Firestore.

### Supabase

- Leituras públicas usam apenas a chave `anon` e permanecem sujeitas ao RLS.
- `INSERT`, `UPDATE` e `DELETE` nas tabelas protegidas passam pela Cloud Function `adminSupabaseWrite`.
- A função valida o token Firebase, a permissão administrativa, a tabela, a operação e o payload.
- A chave elevada do Supabase fica somente no Secret Manager como `SUPABASE_ADMIN_KEY`.
- Nunca coloque uma chave `sb_secret_...` ou `service_role` em HTML, JavaScript do navegador ou arquivos versionados.
- A migração de segurança está em `supabase/20260727_secure_admin_rls.sql`.

## Estrutura do projeto

```text
.
├── css/                         estilos das páginas
├── functions/                   Firebase Cloud Functions
├── images/                      ícones, logos e imagens do PWA
├── js/                          lógica do frontend
├── pelada/                      páginas públicas e administrativas das peladas
├── supabase/                    migrações e políticas SQL
├── .github/workflows/           automação de deploy do Firebase
├── index.html                   classificação e próximas partidas
├── painel.html                  painel administrativo
├── gerador-times.html           seleção e geração balanceada dos times
├── relatorio-presencas.html     relatório por jogador e por time
├── firestore.rules              regras do Firestore
├── site.webmanifest             configuração de instalação do PWA
└── sw.js                        Service Worker e notificações push
```

## Desenvolvimento local

O frontend deve ser servido por HTTP; abrir os arquivos diretamente com `file://` pode impedir módulos, Service Worker e requisições externas.

Exemplo com Python:

```powershell
cd "C:\Users\RBR\Pictures\2026"
python -m http.server 8000
```

Depois, acesse:

```text
http://localhost:8000/
```

### Firebase Functions

Requisitos:

- Node.js 22;
- Firebase CLI;
- projeto Firebase `sapos-league` selecionado;
- parâmetros e segredos configurados.

Instalação e validação:

```powershell
cd functions
npm ci
npm run check
```

Execução com emuladores:

```powershell
npm run serve
```

Use `functions/.env.example` como referência para os parâmetros não secretos. Não versione `functions/.env`.

Segredos necessários:

```powershell
firebase functions:secrets:set VAPID_PRIVATE_KEY
firebase functions:secrets:set SUPABASE_ADMIN_KEY
```

## Publicação

### Frontend

O frontend é publicado pelo GitHub Pages a partir da branch `main`. Antes de publicar uma mudança visível no PWA:

1. Atualize os parâmetros `?v=` dos arquivos alterados quando necessário.
2. Incremente `CACHE_VERSION` em `sw.js`.
3. Verifique sintaxe e comportamento em computador e celular.
4. Envie a alteração para `main`.

### Firebase

O workflow `.github/workflows/firebase-deploy.yml` é executado quando `main` recebe mudanças em:

- `functions/**`;
- `firestore.rules`;
- no próprio workflow.

Ele instala Node.js 22, valida as Functions, autentica no Google Cloud e publica Functions e regras do Firestore.

## Verificações antes de publicar

```powershell
node --check js/arquivo-alterado.js
node --check sw.js
git diff --check

cd functions
npm run check
```

Além das verificações de sintaxe, teste:

- navegação entre fases e rodadas;
- cadastro, edição e exclusão nas áreas administrativas;
- relatório em tema claro e escuro;
- relatório por jogador, por time e filtros;
- atualização do PWA instalado;
- registro e recebimento de notificações.

## Monitoramento e diagnóstico

- [Firebase Functions](https://console.firebase.google.com/project/sapos-league/functions)
- [Firestore](https://console.firebase.google.com/project/sapos-league/firestore)
- [Logs das Functions](https://console.firebase.google.com/project/sapos-league/functions/logs)
- [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=sapos-league)
- [Página de diagnóstico](https://saposleague.github.io/2026/debug.html)

Para conferir dispositivos inscritos:

- `fcmTokens`: tokens FCM compatíveis.
- `webPushSubscriptions`: subscriptions Web Push de PWA.

## Solução de problemas

### O PWA continua usando uma versão antiga

1. Confirme que a publicação do GitHub Pages terminou.
2. Feche completamente o PWA e abra novamente com internet.
3. Aguarde a verificação do Service Worker e aceite a atualização quando apresentada.
4. Use limpeza manual/reinstalação apenas como último recurso.

O botão de voltar das páginas de pelada não apaga caches nem desregistra o Service Worker.

### A notificação não chegou no iPhone

1. Confirme iOS 16.4 ou superior.
2. Use o site instalado pela opção **Adicionar à Tela de Início**; Web Push não funciona como esperado apenas em uma aba comum do Safari.
3. Verifique a permissão em **Ajustes → Notificações → Sapos League**.
4. Confirme que não há modo Foco/Não Perturbe bloqueando o aviso.
5. Verifique a subscription e os logs usando `debug.html`.

### A notificação automática não foi enviada

1. Confirme que os jogos possuem data no formato esperado e estão no Firestore.
2. Verifique o Cloud Scheduler.
3. Consulte os logs de `notifyWeekGames` ou `notifyTodayGames`.
4. Execute uma função manual autenticada para isolar o problema.

### O relatório por time parece diferente do histórico

O relatório agrupa todas as presenças pelo **time atual** do jogador. Se um jogador mudou de time, as presenças anteriores passam a contar para o time atual. Jogadores sem time permanecem no relatório individual, mas ficam fora do comparativo entre times.

## Histórico recente

### 2.2.35 — 14/08/2026

- Gestão de Rodadas reformulada no mesmo padrão visual das demais páginas administrativas.
- Cabeçalho com botão de voltar, escudo, marca, tema claro/escuro e saída.
- Formulário de confronto, histórico e mensagens reorganizados para computador e celular.

### 2.2.34 — 14/08/2026

- Alinhamento vertical do ícone no botão de voltar corrigido nas páginas administrativas.

### 2.2.33 — 14/08/2026

- Cabeçalho das páginas administrativas alinhado ao Relatório de Presenças.
- Botão de voltar compacto, marca posicionada à esquerda e ações organizadas à direita.

### 2.2.32 — 14/08/2026

- Tema claro/escuro compartilhado entre Gerador de Times, Gerador de Rodadas, Gestão de Peladas e Jogadores.
- Cabeçalhos administrativos atualizados com o escudo oficial e a marca SAPOS LEAGUE.
- Preferência de tema sincronizada com o Relatório de Presenças.

### 2.2.31 — 14/08/2026

- Gestão de Peladas alinhada ao tema visual dos geradores administrativos.
- Histórico, editor e controle de jogadores aptos atualizados para o mesmo padrão escuro e responsivo.

### 2.2.30 — 14/08/2026

- Cadastro por lista removido da Gestão de Peladas e centralizado no Gerador de Times.
- Gestão de Peladas reformulada para manutenção do histórico e dos jogadores aptos.
- Código de interface do formulário antigo removido.

### 2.2.29 — 14/08/2026

- Lista completa dos nomes processados na importação do Gerador de Times.
- Cada item mostra o nome enviado, o jogador correspondente e o tipo de reconhecimento.

### 2.2.28 — 14/08/2026

- Opções clicáveis para confirmar nomes ambíguos durante a importação no Gerador de Times.
- A seleção e o resumo são atualizados imediatamente após cada confirmação.

### 2.2.27 — 14/08/2026

- Importação e reconhecimento automático da lista de jogadores no Gerador de Times.
- Nomes não encontrados, ambíguos ou repetidos ficam destacados para revisão manual.

### 2.2.26 — 12/08/2026

- Filtro de jogadores por time no relatório.
- Indicadores, gráficos e exportações acompanham o filtro.

### 2.2.25 — 12/08/2026

- Melhorias de contraste e legibilidade no tema claro.

### 2.2.24 — 12/08/2026

- Tema claro/escuro no relatório com preferência compartilhada.
- Meteoros ocultado dos comparativos por time.

### 2.2.23 — 12/08/2026

- Novo relatório por jogador e por time.
- Médias, gráficos, ranking e exportações PDF/Excel.
- Acesso ao relatório pelo painel administrativo.

### 2.2.22 — 10/08/2026

- Botão de voltar das peladas deixou de apagar o cache e desregistrar o PWA.

### 2.2.21 — 10/08/2026

- Atualização automática do código e dos estilos do PWA.
- Estratégia network-first para HTML, JavaScript e CSS.

### 2.2.20 — 10/08/2026

- Rodada inicial escolhida pelo próximo jogo pendente, independentemente da numeração da rodada.

## Estado conhecido

- O arquivo `images/favicon().png` está fora do controle de versão e não é usado pelo site.
- A versão do PWA deve ser incrementada sempre que houver mudança que possa ficar retida no cache.
- O relatório esconde Meteoros no comparativo, mas mantém os registros individuais existentes.
