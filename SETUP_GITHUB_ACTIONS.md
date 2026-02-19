# 🤖 Setup GitHub Actions - Deploy Automático

## O que vai acontecer?

Toda vez que você fizer `git push`, o GitHub Actions vai:
1. ✅ Instalar dependências
2. ✅ Fazer deploy das Cloud Functions
3. ✅ Atualizar regras do Firestore
4. ✅ Tudo automático!

## 📋 Configuração (só precisa fazer UMA VEZ)

### Passo 1: Gerar Token do Firebase

Você precisa gerar um token para o GitHub Actions acessar seu Firebase.

**Opção A: Usando o terminal (mais fácil)**

1. Instale o Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Gere o token:
   ```bash
   firebase login:ci
   ```
   
3. Vai abrir o navegador para você fazer login
4. Depois de autorizar, o terminal vai mostrar um token como:
   ```
   1//0abcdefghijklmnopqrstuvwxyz...
   ```
   
5. **COPIE ESSE TOKEN!** (você vai usar no próximo passo)

**Opção B: Sem terminal (alternativa)**

Se não conseguir usar o terminal, me avise que eu te mostro outra forma.

### Passo 2: Adicionar Token no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** → **Actions**
4. Clique em **New repository secret**
5. Preencha:
   - **Name:** `FIREBASE_TOKEN`
   - **Secret:** Cole o token que você copiou
6. Clique em **Add secret**

### Passo 3: Fazer o primeiro push

```bash
git add .
git commit -m "Configura GitHub Actions para deploy automático"
git push origin main
```

### Passo 4: Verificar se funcionou

1. Vá no seu repositório no GitHub
2. Clique na aba **Actions**
3. Você vai ver o workflow "Deploy Firebase Functions" rodando
4. Aguarde ~2-3 minutos
5. Se aparecer ✅ verde, funcionou!

## 🎯 Pronto!

Agora, toda vez que você:
- Modificar arquivos em `functions/`
- Modificar `firestore.rules`
- Fazer push para `main`

O deploy acontece automaticamente! 🚀

## 🔧 Comandos úteis

```bash
# Ver status do último deploy
# (vá em GitHub → Actions)

# Forçar novo deploy (mesmo sem mudanças)
git commit --allow-empty -m "Trigger deploy"
git push
```

## ⚠️ Importante

- O token `FIREBASE_TOKEN` é secreto - nunca compartilhe!
- Se o deploy falhar, veja os logs na aba Actions do GitHub
- O workflow só roda quando você faz push para a branch `main`

## 🐛 Troubleshooting

### Erro: "FIREBASE_TOKEN not found"
- Verifique se adicionou o secret corretamente no GitHub
- O nome deve ser exatamente `FIREBASE_TOKEN` (maiúsculas)

### Erro: "Permission denied"
- O token pode ter expirado
- Gere um novo token: `firebase login:ci`
- Atualize o secret no GitHub

### Erro: "Project not found"
- Verifique se o arquivo `.firebaserc` existe
- Deve conter: `"default": "sapos-league"`

### Deploy não inicia
- Verifique se fez push para a branch `main`
- Verifique se modificou arquivos em `functions/` ou `firestore.rules`

## 💡 Dica

Se quiser que o deploy rode em qualquer mudança (não só functions), edite o arquivo `.github/workflows/firebase-deploy.yml` e remova a seção `paths:`.

## 📞 Precisa de ajuda?

Se tiver problemas:
1. Vá em GitHub → Actions
2. Clique no workflow que falhou
3. Veja os logs de erro
4. Me mostre a mensagem de erro
