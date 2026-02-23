# 🍎 Correção de Notificações iOS

## Problema Identificado

As notificações não funcionam no iPhone porque:

1. ✅ **Chaves VAPID diferentes** - Corrigido! Agora todos os arquivos usam a mesma chave pública
2. ⚠️ **Chave privada VAPID** - Precisa ser configurada corretamente no backend
3. ✅ **Service Worker** - Melhorado com logs detalhados
4. ✅ **Caminhos dos ícones** - Corrigidos no Service Worker

## 🔧 Passos para Corrigir

### 1. Gerar Par de Chaves VAPID (se necessário)

Se você não tem a chave privada correspondente à chave pública `BCGlPwG2538voWXXYiSV-y6P1jIWN60aYHdcNUQcS4rpWe-eJpo5bK4-HJHkcbDRzD-S0jaW-sXeRL8XsGLPBts`, você precisa gerar um novo par:

```bash
cd functions
npx web-push generate-vapid-keys
```

Isso vai gerar algo como:
```
Public Key: BCGlPwG2538voWXXYiSV-y6P1jIWN60aYHdcNUQcS4rpWe-eJpo5bK4-HJHkcbDRzD-S0jaW-sXeRL8XsGLPBts
Private Key: sua-chave-privada-aqui
```

### 2. Atualizar a Chave Privada no Backend

Edite `functions/index.js` e substitua `YOUR_PRIVATE_VAPID_KEY_HERE` pela sua chave privada:

```javascript
webpush.setVapidDetails(
  'mailto:contato@saposleague.com',
  'BCGlPwG2538voWXXYiSV-y6P1jIWN60aYHdcNUQcS4rpWe-eJpo5bK4-HJHkcbDRzD-S0jaW-sXeRL8XsGLPBts',
  'SUA_CHAVE_PRIVADA_AQUI'  // ← Coloque aqui
);
```

### 3. Fazer Deploy das Functions

```bash
firebase deploy --only functions
```

### 4. Testar no iPhone

#### A. Desinstalar o PWA atual
1. Pressione e segure o ícone do app
2. Remover do Home Screen

#### B. Limpar dados do Safari
1. Ajustes → Safari → Avançado → Dados de Sites
2. Remover todos os dados

#### C. Reinstalar o PWA
1. Abra o Safari e acesse seu site
2. Toque no botão de compartilhar
3. "Adicionar à Tela de Início"

#### D. Testar notificações
1. Abra o PWA instalado
2. Aceite as permissões de notificação quando solicitado
3. Acesse `https://seu-site.com/debug-ios.html`
4. Clique em "Testar Web Push"
5. Verifique os logs

### 5. Enviar Notificação de Teste

Acesse a função de teste:
```
https://us-central1-seu-projeto.cloudfunctions.net/testNotification
```

## 📱 Requisitos do iOS

Para notificações funcionarem no iPhone, você precisa:

- ✅ iOS 16.4 ou superior
- ✅ PWA instalado na tela inicial (não funciona no Safari normal)
- ✅ Permissão de notificações concedida
- ✅ Service Worker registrado
- ✅ Chaves VAPID corretas (mesma chave pública no frontend e backend)

## 🔍 Debug

### Ver logs no iPhone

1. Conecte o iPhone ao Mac
2. Abra Safari no Mac
3. Desenvolver → [Seu iPhone] → [Seu PWA]
4. Console mostrará todos os logs

### Verificar subscription

No console do iPhone/Mac:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

### Verificar no Firestore

Acesse o Firebase Console e verifique:
- Coleção `webPushSubscriptions` - deve ter documentos com `platform: 'ios'`
- Coleção `fcmTokens` - tokens do Android/Chrome

## ⚠️ Problemas Comuns

### "Subscription failed"
- Verifique se a chave VAPID está correta
- Certifique-se de que o PWA está instalado (não funciona no Safari)

### "Permission denied"
- Usuário negou permissão
- Precisa desinstalar o PWA e reinstalar

### "Service Worker not ready"
- Aguarde alguns segundos após abrir o app
- Recarregue a página

### Notificação não aparece
- Verifique se o iPhone não está em modo "Não Perturbe"
- Verifique as configurações de notificação do iOS
- Veja os logs do backend para erros de envio

## 📊 Monitoramento

Após corrigir, monitore:

1. **Firebase Console** → Functions → Logs
2. **Firestore** → `webPushSubscriptions` (deve crescer quando usuários iOS se registrarem)
3. **Teste manual** com a função `testNotification`

## 🎯 Checklist Final

- [ ] Chave privada VAPID configurada em `functions/index.js`
- [ ] Deploy das functions feito
- [ ] PWA desinstalado e reinstalado no iPhone
- [ ] Permissão de notificações concedida
- [ ] Subscription registrada no Firestore
- [ ] Teste manual funcionando
- [ ] Notificações agendadas funcionando

## 💡 Dica

Se ainda não funcionar, use o `debug-ios.html` para ver exatamente onde está falhando. Os logs são muito detalhados e vão mostrar cada etapa do processo.
