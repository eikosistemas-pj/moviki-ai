# CLAUDE.md — moviki-ai

Repo do atendente de IA da Moviki (WhatsApp, suporte + vendas, 24/7). Segue as
mesmas diretrizes do projeto Moviki (ver MOVIKI_MAPA_MESTRE.md e o doc de
instruções do Project): responder em Português (Brasil), ser direto e crítico,
economizar tokens, sempre entregar arquivo completo pronto pra substituir
(nunca "pedaço de código + onde colar").

## Por que este repo é separado do moviki-robo
`moviki-robo` é o robô de DINHEIRO (Asaas, comissões, saque) — muda o mínimo
possível, de propósito. `moviki-ai` é conversacional, evolui rápido, e tem seu
próprio teto de 12 funções do plano Hobby da Vercel, isolado do robô de
cobrança. Os dois compartilham o MESMO projeto Firebase (Firestore/Auth) —
não são bancos diferentes, só repos/deploys diferentes.

## Regras de ouro (herdadas do Mapa Mestre)
- Dado sensível/financeiro nunca é escrito pelo cliente — só Admin SDK.
- Chaves secretas nunca no código/GitHub — só nas Environment Variables do
  Vercel (projeto `moviki-ai`, que é um projeto Vercel PRÓPRIO, não herda
  nada do `moviki-robo`).
- Este repo NUNCA escreve em coleções financeiras (`assinaturas`,
  `comissoes`, `saques`, `parceiros` status, `negocios`) — só em
  `atendimentos_bot/{telefone}`, que é dele.
- Regra do Firestore de `atendimentos_bot` fica no doc "regras fire base" do
  Project (mesmo doc compartilhado com os outros repos) — colar no Console
  do Firebase depois de qualquer mudança.

## Estrutura
- `api/atendimento.js` — webhook único (GET = verificação Meta, POST =
  mensagem nova).
- `lib/firebase.js` — Admin SDK (mesmo padrão do moviki-robo).
- `lib/whatsapp.js` — envio de mensagem via WhatsApp Cloud API.
- `lib/anthropic.js` — chamada à API da Anthropic (Claude).
- `lib/promptAtendimento.js` — prompt de sistema (fonte de verdade textual:
  doc "moviki-robo-atendimento-prompt.md" no Project — atualizar os dois
  juntos).

## Fluxo de atualização do Mapa Mestre
Quando o usuário digitar "/atualizarmapa" no chat principal do Project, as
mudanças deste repo entram na seção do Mapa Mestre sobre o atendente de IA —
não altere o Mapa Mestre por conta própria fora desse comando.
