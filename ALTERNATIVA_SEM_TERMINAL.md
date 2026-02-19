# 🔧 Alternativa SEM Terminal

Se você não pode/quer usar o terminal, aqui está uma solução alternativa usando Service Account do Firebase.

## 📋 Passos

### 1. Criar Service Account no Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto **sapos-league**
3. Clique no ⚙️ (Configurações) → **Configurações do projeto**
4. Vá na aba **Contas de serviço**
5. Clique em **Gerar nova chave privada**
6. Confirme clicando em **Gerar chave**
7. Um arquivo JSON será baixado (ex: `sapos-league-abc123.json`)

### 2. Converter JSON para Base64

Você precisa converter o conteúdo do arquivo JSON para Base64.

**Opção A: Site online**
1. Acesse: https://www.base64encode.org/
2. Abra o arquivo JSON baixado em um editor de texto
3. Copie TODO o conteúdo
4. Cole no site
5. Clique em "Encode"
6. Copie o resultado

**Opção B: PowerShell (Windows)**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content "caminho\do\arquivo.json" -Raw)))
```

### 3. Atualizar GitHub Workflow

Substitua o conteúdo de `.github/workflows/firebase-deploy.yml` por:

```yaml
name: Deploy Firebase Functions

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'
      - 'firestore.rules'
      - '.github/workflows/firebase-deploy.yml'

jobs:
  deploy:
    name: Deploy to Firebase
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout código
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: functions/package-lock.json
      
      - name: Criar arquivo de credenciais
        run: |
          echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}" | base64 -d > $HOME/service-account.json
          echo "GOOGLE_APPLICATION_CREDENTIALS=$HOME/service-account.json" >> $GITHUB_ENV
      
      - name: Instalar Firebase CLI
        run: npm install -g firebase-tools
      
      - name: Instalar dependências
        run: |
          cd functions
          npm ci
          cd ..
      
      - name: Deploy para Firebase
        run: firebase deploy --only functions,firestore:rules --project sapos-league
      
      - name: Notificar sucesso
        if: success()
        run: echo "✅ Deploy realizado com sucesso!"
      
      - name: Notificar falha
        if: failure()
        run: echo "❌ Deploy falhou. Verifique os logs acima."
```

### 4. Adicionar Secret no GitHub

1. Vá em: `https://github.com/SEU_USUARIO/sapos-league/settings/secrets/actions`
2. Clique em **New repository secret**
3. Nome: `FIREBASE_SERVICE_ACCOUNT`
4. Valor: Cole o texto Base64 que você gerou
5. Clique em **Add secret**

### 5. Push!

```bash
git add .
git commit -m "Configura deploy com Service Account"
git push origin main
```

## ✅ Verificar

1. Vá em: `https://github.com/SEU_USUARIO/sapos-league/actions`
2. Veja o workflow rodando
3. Aguarde ~2-3 minutos
4. ✅ Verde = Sucesso!

## ⚠️ Segurança

- **NUNCA** compartilhe o arquivo JSON ou o Base64
- **NUNCA** faça commit do arquivo JSON no GitHub
- O arquivo `.gitignore` já está configurado para ignorar esses arquivos

## 🐛 Troubleshooting

### Erro: "Invalid credentials"
- Verifique se copiou o Base64 completo
- Certifique-se de que não tem espaços extras
- Tente gerar uma nova chave no Firebase Console

### Erro: "Permission denied"
- Verifique se a Service Account tem permissões de Editor no projeto
- Vá em Firebase Console → IAM e Administração → IAM
- A conta deve ter papel "Editor" ou "Proprietário"

## 💡 Qual método usar?

| Método | Prós | Contras |
|--------|------|---------|
| **Token CI** (`firebase login:ci`) | Mais simples | Precisa de terminal |
| **Service Account** (este método) | Não precisa terminal | Mais passos |

Ambos funcionam perfeitamente! Escolha o que for mais fácil para você.
