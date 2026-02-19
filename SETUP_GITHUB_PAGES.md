# 🚀 Setup com GitHub Pages

## Situação
- ✅ Site hospedado no GitHub Pages
- ✅ Cloud Functions no Firebase (para notificações automáticas)

## 📋 Passos

### 1. Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Inicializar Firebase (apenas Functions)
```bash
firebase init
```

Selecione:
- ✅ **Functions** (use setas e espaço para selecionar)
- ✅ **Firestore** (para salvar tokens)
- ❌ **NÃO selecione Hosting** (você já usa GitHub Pages)

Quando perguntar:
- "Use an existing project" → Selecione `sapos-league`
- "What language?" → JavaScript
- "Use ESLint?" → No
- "Install dependencies?" → Yes

### 3. Instalar dependências
```bash
cd functions
npm install
cd ..
```

### 4. Deploy apenas das Functions
```bash
firebase deploy --only functions
```

### 5. Deploy das regras do Firestore
```bash
firebase deploy --only firestore:rules
```

### 6. Commit e Push para GitHub
```bash
git add .
git commit -m "Adiciona sistema de notificações push com FCM"
git push origin main
```

O GitHub Pages vai atualizar automaticamente!

## ✅ Pronto!

Agora você tem:
- 🌐 Site no GitHub Pages
- ☁️ Cloud Functions no Firebase (notificações automáticas)
- 🔔 Notificações funcionando mesmo com app fechado

## 🧪 Testar

1. Acesse seu site no GitHub Pages
2. Instale o PWA
3. Permita notificações
4. Clique em "🔔 Testar Notificação"
5. Aguarde até 08:53 para ver notificação automática

## 📱 Horários das Notificações

- 00:00 (meia-noite)
- 08:53 (teste)
- 12:30 (meio-dia)
- 19:00 (noite)

## 🔧 Comandos Úteis

```bash
# Ver logs das Cloud Functions
firebase functions:log

# Atualizar apenas functions
firebase deploy --only functions

# Atualizar apenas regras do Firestore
firebase deploy --only firestore:rules

# Testar notificação via HTTP
curl https://us-central1-sapos-league.cloudfunctions.net/testNotification
```

## ⚠️ Importante

- O arquivo `firebase.json` tem configuração de hosting, mas você pode ignorar
- Apenas as Cloud Functions e Firestore Rules serão usadas do Firebase
- O site continua 100% no GitHub Pages

## 🐛 Troubleshooting

### Erro "Firebase project not found"
```bash
firebase use sapos-league
```

### Erro ao fazer deploy
```bash
# Verificar se está logado
firebase login --reauth

# Verificar projeto atual
firebase projects:list
```

### Notificações não chegam
1. Verifique se as Cloud Functions foram deployadas: `firebase functions:list`
2. Veja os logs: `firebase functions:log`
3. Teste manualmente: Clique no botão "🔔 Testar Notificação"
4. Verifique se o token foi salvo no Firestore (Console Firebase → Firestore → fcmTokens)

## 💰 Custos

Tudo funciona no plano gratuito do Firebase:
- Cloud Functions: 2 milhões de invocações/mês grátis
- FCM: Ilimitado e gratuito
- Firestore: 50k leituras/dia grátis

Para este projeto, você não vai ultrapassar os limites gratuitos.
