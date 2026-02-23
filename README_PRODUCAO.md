# 🏆 Sapos League 2026 - Sistema de Notificações

Sistema completo de gerenciamento de campeonato com notificações push para iOS e Android.

## ✅ Status: PRODUÇÃO

Versão: 1.0.0  
Data: 23/02/2026  
Status: ✅ Totalmente funcional

---

## 📱 Funcionalidades

### Notificações Automáticas
- ✅ Segunda a Quarta às 08:00 - Aviso de jogos da quinta-feira
- ✅ Quinta-feira às 00:00, 12:00 e 19:00 - Lembretes do dia
- ✅ Suporte completo para iOS (16.4+) e Android
- ✅ Funciona com app fechado

### PWA (Progressive Web App)
- ✅ Instalável no iPhone e Android
- ✅ Funciona offline
- ✅ Modo escuro automático
- ✅ Ícones otimizados

### Gerenciamento
- ✅ Tabela de classificação em tempo real
- ✅ Navegação entre fases
- ✅ Painel administrativo
- ✅ Sistema de peladas

---

## 🔧 Funções Firebase

### Produção (Automáticas)

#### `notifyWeekGames`
- **Horário:** Segunda, Terça e Quarta às 08:00
- **Função:** Avisa sobre jogos de quinta-feira
- **Formato:** "Jogo Quinta-Feira - Xª Rodada"

#### `notifyTodayGames`
- **Horário:** Quinta-feira às 00:00, 12:00 e 19:00
- **Função:** Lembra dos jogos de hoje
- **Formato:** "Jogo Hoje - Xª Rodada"

### Teste (Manuais)

#### `testNotification`
- **URL:** https://us-central1-sapos-league.cloudfunctions.net/testNotification
- **Função:** Testa notificação de quinta-feira (jogos de hoje)
- **Uso:** Diagnóstico e validação

#### `testWeekNotification`
- **URL:** https://us-central1-sapos-league.cloudfunctions.net/testWeekNotification
- **Função:** Testa notificação de segunda a quarta (jogos da próxima quinta)
- **Uso:** Diagnóstico e validação

---

## 📊 Monitoramento

### Firebase Console
- **Functions:** https://console.firebase.google.com/project/sapos-league/functions
- **Firestore:** https://console.firebase.google.com/project/sapos-league/firestore
- **Logs:** https://console.firebase.google.com/project/sapos-league/functions/logs

### Cloud Scheduler
- **Agendamentos:** https://console.cloud.google.com/cloudscheduler?project=sapos-league

### Verificações Diárias
1. Verificar se notificações foram enviadas (logs)
2. Verificar quantidade de subscriptions ativas
3. Verificar erros nos logs

---

## 🔐 Segurança

### Chaves VAPID
- **Pública:** `BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg`
- **Privada:** Armazenada apenas no backend (Firebase Functions)

### Firestore Rules
- Leitura pública para tabelas e jogos
- Escrita restrita ao admin

### Functions
- Executam automaticamente via Cloud Scheduler
- Funções de teste são públicas mas inofensivas

---

## 📱 Instalação para Usuários

### iPhone (iOS 16.4+)
1. Abra o Safari e acesse o site
2. Toque no botão de compartilhar
3. "Adicionar à Tela de Início"
4. Abra o app instalado
5. Aceite as notificações quando solicitado

### Android
1. Abra o Chrome e acesse o site
2. Toque em "Instalar" quando aparecer
3. Ou Menu → "Adicionar à tela inicial"
4. Abra o app instalado
5. Aceite as notificações quando solicitado

---

## 🧪 Testes

### Teste Rápido
```bash
# Testar notificação de quinta-feira
curl https://us-central1-sapos-league.cloudfunctions.net/testNotification

# Testar notificação de segunda a quarta
curl https://us-central1-sapos-league.cloudfunctions.net/testWeekNotification
```

### Verificar Subscriptions
1. Acesse Firestore Console
2. Coleção `fcmTokens` - Dispositivos Android/Chrome
3. Coleção `webPushSubscriptions` - Dispositivos iOS

### Verificar Logs
1. Acesse Functions Logs
2. Filtre por função específica
3. Procure por erros ou falhas

---

## ⚠️ Troubleshooting

### Notificação não chega no iPhone
1. Verifique se o PWA está instalado (não funciona no Safari)
2. Verifique permissões: Ajustes → Notificações → Sapos League
3. Desative "Não Perturbe"
4. Desinstale e reinstale o PWA

### Notificação não chega no Android
1. Verifique permissões de notificação
2. Limpe cache do navegador
3. Recarregue a página

### Notificação não é enviada automaticamente
1. Verifique se há jogos cadastrados para o dia correto
2. Verifique Cloud Scheduler (deve estar habilitado)
3. Veja os logs das functions

---

## 📈 Métricas

### Usuários Ativos
- Verifique quantidade de subscriptions no Firestore
- iOS: Coleção `webPushSubscriptions`
- Android: Coleção `fcmTokens`

### Taxa de Entrega
- Veja logs das functions após envio
- Formato: "✅ Total enviadas: X" e "❌ Total falhas: Y"

### Uso de Quota
- Firebase Console → Usage
- Cloud Functions → Invocations

---

## 🚀 Próximas Melhorias (Opcional)

### Funcionalidades
- [ ] Notificações personalizadas por time
- [ ] Histórico de notificações
- [ ] Estatísticas de jogadores
- [ ] Chat entre jogadores

### Técnicas
- [ ] Atualizar Node.js para versão mais recente
- [ ] Implementar testes automatizados
- [ ] Adicionar analytics
- [ ] Implementar backup automático

---

## 📞 Suporte

### Documentação
- `VERIFICACAO_SISTEMA.md` - Guia completo de verificação
- `INICIO_RAPIDO.md` - Guia de início rápido
- `INSTRUCOES_NOTIFICACOES.md` - Instruções de notificações

### Logs e Diagnóstico
1. Firebase Console → Functions → Logs
2. Funções de teste manuais
3. Firestore para verificar dados

---

## ✅ Checklist de Produção

- [x] Functions deployadas e funcionando
- [x] Notificações automáticas configuradas
- [x] Suporte iOS e Android implementado
- [x] PWA instalável
- [x] Modo escuro funcionando
- [x] Sistema offline funcionando
- [x] Funções de teste disponíveis
- [x] Documentação completa
- [x] Monitoramento configurado
- [x] Segurança implementada

---

## 🎉 Sistema Pronto!

Seu sistema está 100% funcional e pronto para uso em produção.

**Última atualização:** 23/02/2026  
**Versão:** 1.0.0  
**Status:** ✅ Produção
