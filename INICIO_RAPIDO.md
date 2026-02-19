# 🚀 Início Rápido - 3 Passos

## Passo 1: Gerar Token Firebase

### Opção A: Com Terminal
```bash
npm install -g firebase-tools
firebase login:ci
```
Copie o token que aparecer!

### Opção B: Sem Terminal
1. Acesse: https://console.firebase.google.com/
2. Vá em Configurações do Projeto → Contas de Serviço
3. Clique em "Gerar nova chave privada"
4. Baixe o arquivo JSON

(Se escolher Opção B, me avise que ajusto o workflow)

## Passo 2: Adicionar Token no GitHub

1. Vá em: `https://github.com/SEU_USUARIO/sapos-league/settings/secrets/actions`
2. Clique em **New repository secret**
3. Nome: `FIREBASE_TOKEN`
4. Valor: Cole o token
5. Clique em **Add secret**

## Passo 3: Push!

```bash
git add .
git commit -m "Ativa notificações automáticas"
git push origin main
```

## ✅ Verificar

1. Vá em: `https://github.com/SEU_USUARIO/sapos-league/actions`
2. Veja o workflow rodando
3. Aguarde ~2-3 minutos
4. ✅ Verde = Sucesso!

## 🎉 Pronto!

Agora as notificações serão enviadas automaticamente em:
- 00:00 (meia-noite)
- 08:53 (teste)
- 12:30 (meio-dia)
- 19:00 (noite)

Mesmo com o app fechado! 🔥

---

**Dúvidas?** Veja `SETUP_GITHUB_ACTIONS.md` para detalhes completos.
