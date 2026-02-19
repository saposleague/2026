# 🔔 Sistema de Notificações Push - Sapos League

## O que foi implementado

Implementei um sistema completo de notificações push usando **Firebase Cloud Messaging (FCM)** que permite enviar notificações automáticas mesmo com o app fechado.

## Como funciona

### 1. **Cloud Functions (Backend)**
- Roda automaticamente nos horários programados: **00:00, 08:53, 12:30 e 19:00**
- Verifica se há jogos cadastrados para o dia
- Envia notificações push para todos os dispositivos registrados
- Funciona mesmo com o app completamente fechado

### 2. **Cliente (Frontend)**
- Registra o dispositivo para receber notificações
- Salva o token FCM no Firestore
- Recebe notificações em tempo real

## Passos para ativar

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Fazer login no Firebase

```bash
firebase login
```

### 3. Inicializar o projeto (se ainda não foi feito)

```bash
firebase init
```

Selecione:
- ✅ Functions
- ✅ Firestore
- ✅ Hosting

### 4. Gerar chave VAPID

As notificações push precisam de uma chave VAPID. Para gerar:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto "sapos-league"
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Aba **Cloud Messaging**
5. Em "Configuração da Web", clique em **Gerar par de chaves**
6. Copie a chave pública gerada

### 5. Atualizar a chave VAPID no código

Abra `js/fcm-notifications.js` e substitua a chave VAPID na linha 67:

```javascript
vapidKey: 'SUA_CHAVE_VAPID_AQUI'
```

### 6. Instalar dependências das Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 7. Deploy das Cloud Functions

```bash
firebase deploy --only functions
```

### 8. Deploy do Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 9. Deploy do site (opcional)

```bash
firebase deploy --only hosting
```

## Testando

### Teste Manual
1. Abra o PWA instalado
2. Conceda permissão para notificações
3. Clique no botão "🔔 Testar Notificação"
4. Você deve receber uma notificação

### Teste da Cloud Function
Você pode testar a função manualmente:

```bash
firebase functions:shell
```

Depois execute:
```javascript
sendDailyGameNotifications()
```

Ou via HTTP (após deploy):
```
https://us-central1-sapos-league.cloudfunctions.net/testNotification
```

## Horários de Notificação

As notificações são enviadas automaticamente nos seguintes horários:
- **00:00** - Meia-noite
- **08:53** - Manhã (TESTE)
- **12:30** - Meio-dia
- **19:00** - Noite

## Formato das Notificações

### 1 jogo:
```
HOJE TEM JOGO! 🔥🔥🔥
Hoje, às 20:00, a bola rola para Time A x Time B. Não perca!
```

### 2 jogos:
```
HOJE TEM RODADA DUPLA! 🔥🔥🔥
Hoje, às 19:00, a bola rola para Time A x Time B e logo em seguida, 
às 20:30, a bola rola para Time C x Time D. Não perca!
```

### 3+ jogos:
```
HOJE TEM JOGOS! 🔥🔥🔥
Hoje tem 3 jogos! Primeiro jogo às 19:00. Não perca!
```

## Monitoramento

### Ver logs das Cloud Functions:
```bash
firebase functions:log
```

### Ver tokens registrados:
Acesse o Firestore no console do Firebase e veja a coleção `fcmTokens`

## Custos

- **Cloud Functions**: Plano gratuito inclui 2 milhões de invocações/mês
- **FCM**: Completamente gratuito, sem limites
- **Firestore**: Plano gratuito inclui 50k leituras/dia

Para este projeto, tudo deve funcionar no plano gratuito.

## Troubleshooting

### Notificações não chegam
1. Verifique se a permissão foi concedida
2. Verifique se o token foi salvo no Firestore
3. Veja os logs das Cloud Functions
4. Teste com a função HTTP de teste

### Erro de VAPID key
- Certifique-se de que copiou a chave correta do console
- A chave deve começar com "B" e ter ~88 caracteres

### Cloud Function não executa
- Verifique se fez o deploy: `firebase deploy --only functions`
- Veja os logs: `firebase functions:log`
- Teste manualmente via HTTP

## Próximos Passos

Para remover o horário de teste (08:53), edite `functions/index.js` linha 11:

```javascript
// Antes (com teste):
.schedule('0 0,8:53,12:30,19 * * *')

// Depois (sem teste):
.schedule('0 0,12:30,19 * * *')
```

Depois faça deploy novamente:
```bash
firebase deploy --only functions
```

## Suporte

Se tiver problemas, verifique:
1. Console do Firebase para erros
2. Logs das Cloud Functions
3. Console do navegador (F12)
4. Botão "📋 Mostrar Logs" no app
