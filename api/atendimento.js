// api/atendimento.js  (repo: moviki-ai)
//
// Atendente de IA do WhatsApp (suporte + vendas), 24/7. Repo isolado do
// moviki-robo de propósito (20/08/2026): moviki-robo é o robô de DINHEIRO
// (Asaas, comissões, saque) e deve mudar o mínimo possível; este repo é
// conversacional, evolui rápido, e tem seu próprio teto de 12 funções do
// Hobby só pra si (folga pra crescer: F5/F6, Instagram DM, etc., sem nunca
// disputar vaga com o robô de cobrança). Mesmo padrão de código (fetch cru,
// Admin SDK, sem framework) pra manter familiaridade entre os repos.
//
// Endpoint único com dois papéis, pelo método HTTP:
// 1) GET  — handshake de verificação do webhook, exigido pela Meta na hora
//    de cadastrar a URL no Meta Business (App → WhatsApp → Configuration).
// 2) POST — a Meta chama isso sozinha toda vez que chega mensagem nova no
//    número do WhatsApp Business conectado. Aqui a gente: identifica o
//    remetente, carrega o histórico da conversa, manda pro Claude com o
//    prompt de sistema da Moviki, manda a resposta de volta pelo WhatsApp,
//    e salva o histórico atualizado.
//
// ==========================================================
//  03/09/2026 — ESTE ROBÔ ESTÁ EM STAND-BY, DE PROPÓSITO.
//
//  Quem atende o WhatsApp hoje é o PABX no (41) 2018-6848, com a IA do
//  próprio WhatsApp Business, 24 horas, para quem vem de fora. Este
//  arquivo fica guardado como PLANO B: se um dia o PABX cair ou sair,
//  ligar este robô é só preencher as env vars e dar Redeploy.
//
//  COMO ELE FICA TRANCADO: sem as env vars WHATSAPP_APP_SECRET e
//  WHATSAPP_TOKEN preenchidas na Vercel, o endpoint recusa TUDO logo na
//  entrada (503 "stand-by") e não gasta nem uma chamada de IA. A falta
//  da chave É a tranca — não existe estado "meio ligado".
//
//  COMO LIGAR, no dia em que precisar (projeto moviki-ai na Vercel):
//    1. WHATSAPP_APP_SECRET   -> Chave Secreta do app Meta "Moviki"
//                               (id 1003679066038534 → Configurações →
//                                Básico → Chave secreta do app)
//    2. WHATSAPP_TOKEN        -> token do System User / WhatsApp Cloud API
//    3. WHATSAPP_PHONE_ID     -> id do número no WhatsApp Cloud API
//    4. WHATSAPP_VERIFY_TOKEN -> uma frase que você inventa
//    5. Redeploy
//    6. No Meta Business, cadastrar a URL do webhook apontando para
//       https://moviki-ai.vercel.app/api/atendimento
//  Para DESLIGAR de novo: apagar WHATSAPP_APP_SECRET (ou WHATSAPP_TOKEN)
//  e dar Redeploy. Volta ao stand-by na hora.
//
//  ⚠️ O QUE MUDOU HOJE, E POR QUÊ (foi uma falha real, aberta):
//  a conferência de assinatura fazia `if (!secret) return true` — ou
//  seja, SEM a chave cadastrada ela liberava geral. O endpoint estava
//  no ar, publicado, aceitando qualquer POST forjado: era só mandar um
//  corpo no formato do WhatsApp para o Claude responder e queimar
//  crédito da conta, em laço, sem login. Agora é `return false`.
//  REGRA DE OURO QUE NASCE DAQUI: conferência de assinatura NUNCA pode
//  falhar aberto. Sem o segredo, ninguém entra.
// ==========================================================
//
// Segurança:
//   - Sem WHATSAPP_APP_SECRET e WHATSAPP_TOKEN, o endpoint inteiro fica
//     em stand-by e recusa GET e POST (ver estaLigado(), abaixo).
//   - GET exige o mesmo WHATSAPP_VERIFY_TOKEN configurado no Meta Business.
//   - POST confere a assinatura X-Hub-Signature-256 (HMAC do corpo cru com
//     o WHATSAPP_APP_SECRET). Sem a env, recusa — nunca falha aberto.
//   - Nunca escreve em coleção financeira/de status do moviki-robo (Regra
//     de Ouro #1 do Mapa Mestre — dinheiro é só Admin SDK do robô de
//     cobrança) — só grava em atendimentos_bot/{telefone}, que tem regra de
//     "só Admin SDK escreve" no mesmo Firestore do projeto (compartilhado
//     entre os 4 repos: moviki, moviki-app, moviki-robo, moviki-ai).
//
// Env vars necessárias no Vercel (projeto moviki-ai — TODAS NOVAS, este
// projeto Vercel não herda nada do moviki-robo):
//   FIREBASE_SERVICE_ACCOUNT            -> Admin SDK (mesmo Firebase do projeto,
//                                           é só copiar o mesmo JSON que já
//                                           está no moviki-robo)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID   -> lib/whatsapp.js
//   WHATSAPP_VERIFY_TOKEN               -> string que você inventa, usada no
//                                           cadastro do webhook no Meta Business
//   WHATSAPP_APP_SECRET                 -> App Secret do app Meta (opcional,
//                                           mas recomendado — valida a origem)
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL  -> lib/anthropic.js
//   TELEGRAM_TOKEN, TELEGRAM_CHAT_ID    -> aviso de conversa nova (mesmo bot/
//                                           chat do moviki-robo, se quiser
//                                           tudo no mesmo lugar, é só repetir
//                                           os mesmos valores aqui)

const crypto = require('crypto');
const { admin, db } = require('../lib/firebase');
const { perguntarClaude } = require('../lib/anthropic');
const { enviarTextoWhatsapp } = require('../lib/whatsapp');
const { SYSTEM_PROMPT } = require('../lib/promptAtendimento');
const { respostaSegura } = require('../lib/segurancaVik');

const MAX_HISTORICO = 24; // ~12 idas e vindas guardadas por conversa

// Corpo cru é necessário pra validar a assinatura da Meta (HMAC sobre os
// bytes originais) — desliga o parser automático da Vercel pra esta rota.
module.exports.config = { api: { bodyParser: false } };

async function lerCorpoCru(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

function assinaturaValida(corpoCru, headerAssinatura) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // 03/09/2026: NUNCA falhar aberto. Sem o App Secret cadastrado na Vercel,
  // nenhuma chamada e aceita — e essa e justamente a tranca do stand-by.
  if (!secret) return false;
  if (!headerAssinatura) return false;
  const esperado = 'sha256=' + crypto.createHmac('sha256', secret).update(corpoCru).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(headerAssinatura));
  } catch (_) { return false; }
}

async function avisarTelegramConversaNova(telefone, primeiraMsg) {
  const TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT  = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT) return;
  const texto =
    '💬 Nova conversa no atendente de IA (WhatsApp)\n\n' +
    'De: ' + telefone + '\n' +
    'Mensagem: "' + primeiraMsg.slice(0, 200) + '"\n\n' +
    'A IA já está respondendo. Acompanhe se quiser assumir.';
  try {
    await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text: texto, disable_web_page_preview: true }),
    });
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// GET — handshake de verificação do webhook (uma vez, no cadastro no Meta).
// ---------------------------------------------------------------------------
async function handleVerify(req, res) {
  const q = req.query || {};
  const modo   = q['hub.mode'];
  const token  = q['hub.verify_token'];
  const desafio = q['hub.challenge'];

  if (modo === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(String(desafio || ''));
    return;
  }
  res.status(403).send('token invalido');
}

// ---------------------------------------------------------------------------
// POST — mensagem nova do WhatsApp.
// ---------------------------------------------------------------------------
// Stand-by: o robo so acorda quando as DUAS envs abaixo existem. Sem elas
// nao ha como validar a origem (WHATSAPP_APP_SECRET) nem responder ao
// cliente (WHATSAPP_TOKEN), entao o certo e nem comecar — e nao gastar
// chamada de IA nenhuma. Esta e a tranca de que fala o cabecalho.
function estaLigado() {
  return !!process.env.WHATSAPP_APP_SECRET && !!process.env.WHATSAPP_TOKEN;
}

module.exports = async (req, res) => {
  if (!estaLigado()) {
    res.status(503).json({ ok: false, standby: true,
      motivo: 'atendimento por WhatsApp desligado — quem atende e o PABX' });
    return;
  }
  if (req.method === 'GET') { await handleVerify(req, res); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const corpoCru = await lerCorpoCru(req);
  const headerAssinatura = req.headers['x-hub-signature-256'];

  if (!assinaturaValida(corpoCru, headerAssinatura)) {
    console.error('[atendimento] assinatura invalida, recusando.');
    res.status(401).json({ ok: false });
    return;
  }

  let payload;
  try { payload = JSON.parse(corpoCru.toString('utf8') || '{}'); }
  catch (_) { res.status(200).json({ ok: true }); return; } // corpo ilegível: ack e ignora

  // Sempre responde 200 rápido pra Meta não ficar re-tentando — o trabalho
  // de verdade acontece antes disso, mas erro interno não pode virar 5xx
  // repetido (a Meta reenvia e pode duplicar mensagem pro cliente).
  try {
    const entry   = (payload.entry && payload.entry[0]) || {};
    const change  = (entry.changes && entry.changes[0]) || {};
    const value   = change.value || {};
    const msg     = value.messages && value.messages[0];

    if (!msg) { res.status(200).json({ ok: true, semMensagem: true }); return; } // status de entrega/leitura etc.

    const telefone = String(msg.from || '').replace(/[^0-9]/g, '');
    const msgId    = String(msg.id || '');
    if (!telefone || !msgId) { res.status(200).json({ ok: true }); return; }

    const convRef  = db.collection('atendimentos_bot').doc(telefone);
    const convSnap = await convRef.get();
    const conv      = convSnap.exists ? (convSnap.data() || {}) : {};

    // Dedup: a Meta pode reentregar a mesma mensagem.
    const jaProcessados = Array.isArray(conv.mensagensProcessadas) ? conv.mensagensProcessadas : [];
    if (jaProcessados.includes(msgId)) { res.status(200).json({ ok: true, duplicada: true }); return; }

    // Só trata texto por enquanto — outros tipos (áudio, imagem, figurinha)
    // recebem uma resposta fixa, sem gastar chamada de IA.
    if (msg.type !== 'text' || !msg.text || !msg.text.body) {
      await enviarTextoWhatsapp(
        telefone,
        'Por enquanto só consigo ler mensagens de texto. Pode escrever sua dúvida? Se preferir falar com uma pessoa, chama no suporte@moviki.com.br ou wa.me/554120186848.'
      );
      res.status(200).json({ ok: true, tipoNaoSuportado: msg.type });
      return;
    }

    const textoCliente = String(msg.text.body).slice(0, 2000);
    const ehConversaNova = !convSnap.exists;

    const historico = Array.isArray(conv.historico) ? conv.historico : [];

    const respostaIA = await perguntarClaude({
      systemPrompt: SYSTEM_PROMPT,
      historico,
      mensagemNova: textoCliente,
    });

    const bruta = respostaIA ||
      'Tive um problema pra responder agora. Fala com a gente no suporte@moviki.com.br ou wa.me/554120186848 que resolvemos rápido.';

    /* MESMO filtro de conformidade do Vik do painel (lib/segurancaVik.js).
       Aqui o risco é ainda maior: no WhatsApp a frase sai para um DESCONHECIDO
       e vira print. Promessa de ganho por escrito é o que já deixou uma conta
       de anúncios da Moviki restrita na Meta. Barrou, manda a frase neutra. */
    const conf = respostaSegura(bruta,
      'Prefiro não responder isso por aqui pra não te passar informação errada. ' +
      'Fala com a gente no suporte@moviki.com.br ou no wa.me/554120186848 que uma pessoa te atende.');
    if (!conf.ok) {
      console.error('[atendimento] resposta BARRADA (' + conf.motivo + ') trecho="' + (conf.trecho || '') + '"');
    }
    const textoResposta = conf.ok ? bruta : conf.texto;

    await enviarTextoWhatsapp(telefone, textoResposta);

    const novoHistorico = historico
      .concat([
        { role: 'user', texto: textoCliente },
        { role: 'assistant', texto: textoResposta },
      ])
      .slice(-MAX_HISTORICO);

    const novosProcessados = jaProcessados.concat([msgId]).slice(-10);

    await convRef.set({
      historico: novoHistorico,
      mensagensProcessadas: novosProcessados,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      criadoEm: conv.criadoEm || admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (ehConversaNova) { await avisarTelegramConversaNova(telefone, textoCliente); }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[atendimento] erro inesperado:', e);
    res.status(200).json({ ok: false });
  }
};
