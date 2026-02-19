# 🚀 Setup Rápido - Notificações Push

## ⚡ Passos Essenciais

### 1. Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Obter Chave VAPID
1. Acesse: https://console.firebase.google.com/
2. Selecione projeto "sapos-league"
3. ⚙️ Configurações do Projeto → Cloud Messaging
4. Clique em "Gerar par de chaves" (Web Push certificates)
5. Copie a chave pública

### 3. Atualizar Chave no Código
Abra `js/fcm-notifications.js` (linha 67) e cole sua chave:
```javascript
vapidKey: 'COLE_SUA_CHAVE_AQUI'
```

### 4. Instalar e Fazer Deploy
```bash
# Instalar dependências
cd functions
npm install
cd ..

# Deploy completo
firebase deploy
```

### 5. Testar
1. Abra o PWA
2. Permita notificações
3. Clique em "🔔 Testar Notificação"

## ✅ Pronto!

As notificações serão enviadas automaticamente em:
- 00:00 (meia-noite)
- 08:53 (teste)
- 12:30 (meio-dia)
- 19:00 (noite)

## 🔧 Comandos Úteis

```bash
# Ver logs
firebase functions:log

# Testar localmente
firebase emulators:start

# Deploy apenas functions
firebase deploy --only functions
```

## ❓ Problemas?

Veja o arquivo `INSTRUCOES_NOTIFICACOES.md` para detalhes completos.
