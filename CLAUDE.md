# CLAUDE.md — moviki-ai

Repo dos atendentes de IA da Moviki. Segue as mesmas diretrizes do projeto
Moviki (ver MOVIKI_MAPA_MESTRE.md e o doc de instruções do Project):
responder em Português (Brasil), ser direto e crítico, economizar tokens,
sempre entregar arquivo completo pronto pra substituir (nunca "pedaço de
código + onde colar").

## Por que este repo é separado do moviki-robo
`moviki-robo` é o robô de DINHEIRO (Asaas, comissões, saque) — muda o mínimo
possível, de propósito, e está no teto de 12 funções do plano Hobby.
`moviki-ai` é conversacional, evolui rápido, e tem seu próprio teto de 12
funções, isolado do robô de cobrança. Os dois compartilham o MESMO projeto
Firebase (Firestore/Auth) — não são bancos diferentes, só repos/deploys
diferentes.

**Uso de funções: 2 de 12** (`api/atendimento.js`, `api/chat.js`).

## Os DOIS atendentes — não confundir
| | `api/atendimento.js` | `api/chat.js` |
| --- | --- | --- |
| Canal | WhatsApp (webhook da Meta) | Caixa de mensagens do painel |
| Quem fala | qualquer número, desconhecido | pessoa logada (idToken do Firebase) |
| O que sabe | só o catálogo | catálogo **+ os dados reais da conta** |
| Prompt | `lib/promptAtendimento.js` | `lib/promptPainel.js` |
| Grava em | `atendimentos_bot/{telefone}` | `conversas/{uid}/mensagens` com `de:'bot'` |
| Status | ver Mapa Mestre — o número oficial hoje é atendido pelo PABX + IA da Meta | é a peça nova |

O do painel existe porque a IA do WhatsApp **não sabe quem está falando** e
nunca vai saber. O do painel lê `negocios/{uid}`, `assinaturas/{uid}`,
`parceiros/{uid}`, `comissoes` e `saques` daquela pessoa e responde *"sua
comissão disponível é R$ 34,15 e o restante libera dia 12"*.

## Regras de ouro (herdadas do Mapa Mestre)
- Dado sensível/financeiro nunca é escrito pelo cliente — só Admin SDK.
- **Este repo NUNCA escreve em coleção financeira** (`assinaturas`,
  `comissoes`, `saques`, `parceiros`, `negocios`). Só LÊ. As únicas escritas
  permitidas são `atendimentos_bot/{telefone}` e a mensagem do bot +
  carimbos em `conversas/{uid}`.
- Chaves secretas nunca no código/GitHub — só nas Environment Variables do
  Vercel (projeto `moviki-ai`, que é um projeto Vercel PRÓPRIO, não herda
  nada do `moviki-robo`).
- O `uid` vem SEMPRE do idToken verificado, nunca do corpo do pedido.
- A resposta da IA nasce como `de:'bot'`, nunca como `'admin'` — senão o
  lojista acha que era o dono falando e depois não dá pra separar robô de
  gente.
- Medição/IA nunca derruba o fluxo principal: erro na Anthropic devolve 200
  com `ok:false` e o painel segue normal.

## Estrutura
- `api/atendimento.js` — webhook do WhatsApp (GET = verificação Meta,
  POST = mensagem nova).
- `api/chat.js` — atendente de dentro do painel. POST com
  `Authorization: Bearer <idToken>`, sem corpo obrigatório.
- `lib/firebase.js` — Admin SDK (mesmo padrão do moviki-robo).
- `lib/whatsapp.js` — envio via WhatsApp Cloud API.
- `lib/anthropic.js` — chamada à API da Anthropic (Claude).
- `lib/promptAtendimento.js` — prompt de sistema do WhatsApp.
- `lib/promptPainel.js` — prompt de sistema do painel (com a trava de
  "só afirme o que está no bloco de dados").
- `lib/contextoUsuario.js` — lê e agrega os dados reais da conta. Só leitura,
  comissões sempre agregadas (nunca item a item).

## Travas do `api/chat.js`
1. `botLigado === true` em `conversas/{uid}` — padrão desligado, ligado pelo
   dono conversa a conversa (mesma lógica do `docsLiberado`).
2. Handoff: se um admin falou nos últimos 30 minutos, o robô cala.
3. Idempotência: `botRespondeuAte` guarda o id da última mensagem respondida.
4. Teto de uso: `botDia` + `botUsos`, padrão 40 respostas por conta/dia
   (`CHAT_LIMITE_DIA`).
5. CORS com lista fixa de origens (`CHAT_ORIGENS`), nunca `*`.

## Env vars no Vercel (projeto moviki-ai)
`FIREBASE_SERVICE_ACCOUNT` · `ANTHROPIC_API_KEY` · `ANTHROPIC_MODEL` (opc.) ·
`CHAT_ORIGENS` (opc.) · `CHAT_LIMITE_DIA` (opc.) · e, só para o WhatsApp:
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_APP_SECRET`, `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`.

## Fluxo de atualização do Mapa Mestre
Quando o usuário digitar "/atualizarmapa" no chat principal do Project, as
mudanças deste repo entram na seção do Mapa Mestre sobre o atendente de IA —
não altere o Mapa Mestre por conta própria fora desse comando.
