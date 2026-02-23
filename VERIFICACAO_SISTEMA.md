# ✅ Verificação do Sistema - Sapos League

## 🎯 Como ter certeza que está tudo funcionando

### 1️⃣ Verificar Functions no Firebase

**Acesse:** https://console.firebase.google.com/project/sapos-league/functions

**Deve mostrar 3 functions ativas:**
- ✅ `notifyWeekGames` - Segunda a Quarta às 08:00
- ✅ `notifyTodayGames` - Quinta às 00:00, 12:00 e 19:00
- ✅ `testNotification` - Função de teste manual

**Status esperado:** Todas com ícone verde ✓

---

### 2️⃣ Verificar Subscriptions no Firestore

**Acesse:** https://console.firebase.google.com/project/sapos-league/firestore

**Coleções que devem existir:**

#### `fcmTokens` (Android/Chrome)
- Deve ter documentos com tokens FCM
- Campo `platform` não existe (é FCM)
- Campo `token` com string longa

#### `webPushSubscriptions` (iOS)
- Deve ter documentos com `platform: 'ios'`
- Campo `subscription` com objeto JSON
- Campo `endpoint` com URL

**Quantos dispositivos registrados:**
- Pelo menos 1 iOS (seu iPhone)
- Pelo menos 1 FCM (se testou no computador)

---

### 3️⃣ Testar Notificação Manual

**No navegador, acesse:**
```
https://us-central1-sapos-league.cloudfunctions.net/testNotification
```

**Resultado esperado:**

Se houver jogos hoje:
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "fcm": { "sent": 1, "failed": 0, "total": 1 },
  "ios": { "sent": 1, "failed": 0, "total": 1 },
  "games": 1,
  "date": "2026-02-23",
  "title": "Jogo Hoje - 2ª Rodada",
  "body": "METEOROS x RECLAMÕES às 21:00"
}
```

Se NÃO houver jogos hoje:
```json
{
  "success": false,
  "message": "Nenhum jogo encontrado para hoje",
  "date": "2026-02-23"
}
```

**Ambos os resultados indicam que o sistema está funcionando!**

---

### 4️⃣ Verificar Logs das Functions

**Acesse:** https://console.firebase.google.com/project/sapos-league/functions/logs

**Filtrar por função:**
- Selecione `notifyWeekGames` ou `notifyTodayGames`

**Logs esperados:**
```
📅 Verificando jogos da semana (quinta-feira)...
🔍 Buscando jogos para quinta-feira: 2026-02-27
⚽ 1 jogo(s) encontrado(s) para quinta-feira
📱 Enviando para 1 dispositivo(s) FCM
🍎 Enviando para 1 dispositivo(s) iOS
✅ FCM enviadas: 1
✅ iOS enviadas: 1
```

ou se não houver jogos:
```
📅 Verificando jogos da semana (quinta-feira)...
🔍 Buscando jogos para quinta-feira: 2026-02-27
📭 Nenhum jogo encontrado para quinta-feira
```

---

### 5️⃣ Verificar no iPhone

#### A. PWA Instalado
- Deve ter o ícone "Sapos League" na tela inicial
- Ao abrir, não deve mostrar a barra do Safari

#### B. Permissões de Notificação
1. Ajustes → Notificações
2. Procure "Sapos League"
3. Deve estar com "Permitir Notificações" ATIVADO

#### C. Testar Recebimento
1. Acesse a URL de teste no navegador do computador
2. A notificação deve aparecer no iPhone
3. Mesmo com o app fechado
4. Com som e vibração

---

### 6️⃣ Verificar Agendamento das Notificações

**Acesse:** https://console.cloud.google.com/cloudscheduler?project=sapos-league

**Deve mostrar 2 jobs agendados:**

#### `firebase-schedule-notifyWeekGames-us-central1`
- Frequência: `0 8 * * 1,2,3`
- Timezone: America/Sao_Paulo
- Status: Enabled ✓

#### `firebase-schedule-notifyTodayGames-us-central1`
- Frequência: `0 0,12,19 * * 4`
- Timezone: America/Sao_Paulo
- Status: Enabled ✓

---

### 7️⃣ Verificar GitHub Pages

**Acesse seu site:** https://seu-usuario.github.io/seu-repositorio

**Deve carregar:**
- ✅ Página inicial com tabela
- ✅ PWA instalável (botão de instalação aparece)
- ✅ Service Worker registrado (veja no DevTools)
- ✅ Manifesto carregado (veja no DevTools → Application)

---

## 🧪 Teste Completo Passo a Passo

### Teste 1: Notificação Manual (AGORA)

1. Acesse: `https://us-central1-sapos-league.cloudfunctions.net/testNotification`
2. Veja o JSON retornado
3. Verifique se a notificação chegou no iPhone

**Resultado esperado:** ✅ Notificação recebida

---

### Teste 2: Aguardar Notificação Automática

**Próximas notificações agendadas:**

#### Segunda-feira às 08:00
- Se houver jogos na quinta-feira
- Título: "Jogo Quinta-Feira - Xª Rodada"

#### Terça-feira às 08:00
- Se houver jogos na quinta-feira
- Título: "Jogo Quinta-Feira - Xª Rodada"

#### Quarta-feira às 08:00
- Se houver jogos na quinta-feira
- Título: "Jogo Quinta-Feira - Xª Rodada"

#### Quinta-feira às 00:00, 12:00 e 19:00
- Se houver jogos hoje
- Título: "Jogo Hoje - Xª Rodada"

**Como verificar:**
1. Aguarde o horário agendado
2. Verifique se a notificação chegou
3. Veja os logs no Firebase Console

---

## ⚠️ Problemas Comuns

### Notificação não chega no iPhone

**Verificar:**
1. PWA está instalado? (não funciona no Safari)
2. Permissões ativadas? (Ajustes → Notificações)
3. "Não Perturbe" desativado?
4. Subscription registrada no Firestore?

**Solução:**
1. Desinstale o PWA
2. Limpe dados do Safari
3. Reinstale o PWA
4. Aceite as notificações novamente

---

### Notificação não chega no Android/Chrome

**Verificar:**
1. Token FCM registrado no Firestore?
2. Permissões de notificação concedidas?
3. Service Worker ativo?

**Solução:**
1. Limpe o cache do navegador
2. Recarregue a página
3. Aceite as notificações novamente

---

### Notificação não é enviada automaticamente

**Verificar:**
1. Há jogos cadastrados para o dia correto?
2. Cloud Scheduler está habilitado?
3. Veja os logs das functions

**Solução:**
1. Verifique se há jogos no Firestore
2. Verifique se a data está correta (YYYY-MM-DD)
3. Veja os logs para identificar o erro

---

## 📊 Monitoramento Contínuo

### Diário
- Verificar se as notificações estão sendo enviadas
- Ver logs de erros no Firebase Console

### Semanal
- Verificar quantidade de subscriptions ativas
- Limpar subscriptions inválidas (automático)

### Mensal
- Verificar uso de quota do Firebase
- Verificar uso de quota do Cloud Functions

---

## 🎯 Checklist Final

- [ ] Functions ativas no Firebase Console
- [ ] Subscriptions registradas no Firestore (iOS e FCM)
- [ ] Teste manual funcionando
- [ ] Notificação recebida no iPhone
- [ ] Logs sem erros no Firebase Console
- [ ] Cloud Scheduler habilitado
- [ ] PWA instalado e funcionando
- [ ] Permissões de notificação concedidas

**Se todos os itens estão marcados: ✅ Sistema 100% funcional!**

---

## 🆘 Suporte

Se algo não estiver funcionando:

1. Veja os logs: https://console.firebase.google.com/project/sapos-league/functions/logs
2. Verifique o Firestore: https://console.firebase.google.com/project/sapos-league/firestore
3. Teste manualmente: https://us-central1-sapos-league.cloudfunctions.net/testNotification

**Tudo funcionando? Parabéns! 🎉**
