# Moviki AI — Atendente de IA (WhatsApp)

Atendente de suporte + vendas da Moviki, 24/7, pelo WhatsApp. Não tem tela —
é 1 endereço que trabalha nos bastidores:

- `GET/POST /api/atendimento` — a **Meta** chama sozinha: GET uma vez, na
  hora de cadastrar o webhook (verificação); POST toda vez que chega
  mensagem nova no número conectado.

Repo **separado** do `moviki-robo` de propósito: `moviki-robo` é o robô de
dinheiro (Asaas/comissões) e deve mudar o mínimo possível; este repo é
conversacional e evolui rápido. Os dois falam com o **mesmo** Firebase do
projeto Moviki — não são bancos diferentes.

> ⚠️ **Regra de ouro:** as chaves secretas NUNCA vão no código nem no GitHub.
> Elas ficam só nas **Environment Variables** deste projeto Vercel.

---

## Passo 1 — Subir os arquivos no GitHub

No repositório `moviki-ai`: **Add file → Upload files**, arraste as pastas
`api/` e `lib/` inteiras, mais `package.json`, `vercel.json`, `README.md`,
`CLAUDE.md`, mantendo a estrutura de pastas. **Commit**.

## Passo 2 — Criar o projeto na Vercel

1. Em **vercel.com** → **Add New… → Project**.
2. Escolha o repositório `moviki-ai` e clique em **Import**.
3. Não mude nada nas configurações. **Deploy**.
4. Guarde o endereço que a Vercel dá, tipo `https://moviki-ai.vercel.app`
   (pode ser um nome um pouco diferente — copie o que aparecer).

## Passo 3 — Configurar as variáveis (Environment Variables)

No Vercel: **Project → Settings → Environment Variables**. Crie estas:

| Nome | Valor | Onde pegar |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | o mesmo JSON da conta de serviço do Firebase | É o **mesmo** valor que já está configurado no projeto `moviki-robo` na Vercel — copie de lá (Settings → Environment Variables → clique no valor pra ver/copiar, se ainda der; senão gere uma chave nova no Firebase Console e atualize nos dois lugares) |
| `WHATSAPP_TOKEN` | access token permanente | Meta Business Manager → seu app → WhatsApp → API Setup → gerar token de um **System User** (não o token temporário de 24h) |
| `WHATSAPP_PHONE_ID` | phone_number_id | mesmo lugar, aparece junto do número de teste/produção |
| `WHATSAPP_VERIFY_TOKEN` | uma senha que você inventa | usada nos dois lados (aqui e no cadastro do webhook no Meta, passo 5) |
| `WHATSAPP_APP_SECRET` | App Secret do app Meta | Meta Business Manager → seu app → Configurações básicas |
| `ANTHROPIC_API_KEY` | chave da API da Anthropic | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | opcional — id do modelo Claude | deixe em branco pra usar o padrão do código, ou defina o mais atual (ver docs.claude.com/en/docs/about-claude/models) |
| `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` | opcional | mesmo bot/chat que já avisa você no `moviki-robo` — repete os mesmos valores aqui se quiser ser avisado de conversa nova |

Depois de criar, **Redeploy**.

## Passo 4 — Cadastrar o webhook no Meta Business Manager

No app do Meta Business → **WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://SEU-ENDERECO.vercel.app/api/atendimento`
  (o do passo 2).
- **Verify token:** o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
- Clique em **Verify and save** — se a variável estiver certa, verifica na hora.
- Em **Webhook fields**, assine o campo **messages**.

## Passo 5 — Firestore

A coleção `atendimentos_bot/{telefone}` guarda o histórico de cada conversa
(bloqueada pro app do lojista/parceiro — só o robô escreve). A regra já está
no doc "regras fire base" do Project — cole a versão nova no **Firebase
Console → Firestore → Regras** (mesmo banco do resto do Moviki).

---

## Como testar

1. No Meta Business Manager, use o **número de teste** que a Meta já dá por
   padrão (grátis, sem precisar verificar conta business ainda) e adicione
   seu próprio WhatsApp como destinatário de teste.
2. Mande uma mensagem de texto pro número de teste.
3. Confira: (a) chegou resposta da IA no seu WhatsApp; (b) se configurou o
   Telegram, chegou aviso de "conversa nova"; (c) apareceu um doc novo em
   `atendimentos_bot/{seu telefone}` no Firestore.
4. Pra ir pra produção de verdade: precisa verificar a conta business no
   Meta e usar um número de telefone real conectado (não o de teste).

## Limitações do v1 (de propósito, não travam o lançamento)

- Só responde **texto**. Áudio, imagem e figurinha recebem uma resposta fixa
  pedindo pra escrever.
- Não envia as 7 imagens de apoio (planos, como começar, etc.) — os arquivos
  ainda não existem hospedados em lugar nenhum. Quando existirem, dá pra
  plugar no `lib/promptAtendimento.js` ou numa lógica de anexo separada.
- Não cruza telefone com conta de lojista/parceiro no Firestore (não existe
  esse índice hoje) — o bot não sabe se quem está falando já é cliente. Isso
  é o F5/F6 do Mapa Mestre, fica pra uma próxima fase.
