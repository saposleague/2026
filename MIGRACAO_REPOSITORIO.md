# 🔄 Migração para Novo Repositório

## Passo 1: Criar o novo repositório no GitHub

1. Acesse: https://github.com/new
2. **Repository name:** `2026`
3. **Owner:** `saposleague`
4. **Description:** Sistema de gerenciamento Sapos League 2026 com notificações push
5. **Visibility:** Public (ou Private se preferir)
6. ⚠️ **NÃO marque** "Initialize this repository with a README"
7. Clique em "Create repository"

## Passo 2: Atualizar o remote local

Execute estes comandos no terminal:

```bash
# Remover o remote antigo
git remote remove origin

# Adicionar o novo remote
git remote add origin https://github.com/saposleague/2026.git

# Verificar se está correto
git remote -v

# Fazer push para o novo repositório
git push -u origin main
```

## Passo 3: Configurar GitHub Pages

1. Acesse: https://github.com/saposleague/2026/settings/pages
2. Em "Source", selecione: **Deploy from a branch**
3. Em "Branch", selecione: **main** e **/ (root)**
4. Clique em "Save"
5. Aguarde alguns minutos para o deploy

## Passo 4: Verificar o site

Após alguns minutos, acesse:
- **Site:** https://saposleague.github.io/2026/
- **Debug:** https://saposleague.github.io/2026/debug.html

## Passo 5: Testar notificações

```bash
# Enviar notificação de teste
curl https://us-central1-sapos-league.cloudfunctions.net/forceTestNotification
```

## Passo 6: Atualizar dispositivos instalados

### Para usuários que já têm o PWA instalado:

**iOS:**
1. Desinstale o app antigo (pressione e segure → Remover App)
2. Acesse https://saposleague.github.io/2026/ no Safari
3. Adicione à tela inicial novamente
4. Aceite as notificações

**Android:**
1. Desinstale o app antigo
2. Acesse https://saposleague.github.io/2026/ no Chrome
3. Instale o PWA novamente
4. Aceite as notificações

## Passo 7: (Opcional) Deletar repositório antigo

Após confirmar que tudo está funcionando:

1. Acesse: https://github.com/saposleague/teste/settings
2. Role até o final da página
3. Clique em "Delete this repository"
4. Digite `saposleague/teste` para confirmar
5. Clique em "I understand the consequences, delete this repository"

---

## ✅ Checklist

- [ ] Criar repositório `2026` no GitHub
- [ ] Atualizar remote local
- [ ] Fazer push para novo repositório
- [ ] Configurar GitHub Pages
- [ ] Verificar site funcionando
- [ ] Testar notificações
- [ ] Atualizar PWA nos dispositivos
- [ ] (Opcional) Deletar repositório `teste`

---

## 📝 Notas

- Todas as URLs já foram atualizadas no código
- Service Worker atualizado para versão 2.2.5
- Cloud Functions já estão com as URLs corretas
- README atualizado com novas URLs
- Não é necessário fazer deploy das Functions novamente (elas já usam as URLs corretas)

---

## 🆘 Problemas?

Se algo der errado, você pode voltar ao repositório antigo:

```bash
git remote remove origin
git remote add origin https://github.com/saposleague/teste.git
git push -u origin main
```

E reverter as URLs no código para `/teste/`.
