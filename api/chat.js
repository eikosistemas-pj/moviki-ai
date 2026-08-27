// api/chat.js  (repo: moviki-ai)
//
// Atendente de IA da caixa de mensagens do PAINEL (lojista e parceiro).
// Vive aqui, e nao no moviki-robo, porque o robo do dinheiro esta no teto de
// 12 funcoes do plano Hobby e nada conversacional entra la. Este repo usa
// 2 de 12 depois deste arquivo.
//
// ------------------------------------------------------------------
// COMO FUNCIONA (e por que NAO e como estava desenhado antes)
// ------------------------------------------------------------------
// O desenho antigo mandava o TEXTO da mensagem junto com o idToken. Isso
// duplicaria a verdade: o painel ja grava a mensagem do lojista direto no
// Firestore (msgEnviar), entao o texto existiria em dois lugares e poderia
// divergir — bastaria o cliente mandar um texto pro Firestore e outro pro
// endpoint. Aqui o painel manda SO o idToken; o endpoint LE do Firestore a
// ultima mensagem da pessoa. O banco e a unica fonte de verdade.
//
// Fluxo:
//   1. confere o idToken do Firebase (nao ha outro jeito de saber quem e);
//   2. le conversas/{uid} -> exige botLigado === true;
//   3. le as ultimas mensagens de conversas/{uid}/mensagens;
//   4. trava de handoff: se um humano (admin) falou por ultimo, o robo cala;
//   5. trava de idempotencia: se ja respondeu aquela mensagem, sai calado;
//   6. monta o contexto real da conta (lib/contextoUsuario.js);
//   7. chama o Claude e grava a resposta como de:'bot' (Admin SDK);
//   8. atualiza conversas/{uid} (ultimaMsg / ultimaEm / ultimoDe / carimbos).
//
// ------------------------------------------------------------------
// SEGURANCA
// ------------------------------------------------------------------
// - So responde a quem tem idToken valido. O uid vem SEMPRE do token
//   verificado, nunca do corpo do pedido: e por isso que ninguem consegue
//   fazer o robo falar na conversa de outra pessoa.
// - Nunca escreve em colecao financeira. So le. A unica escrita e a mensagem
//   do bot e os carimbos da propria conversa.
// - de:'bot' e proposital e obrigatorio: se a resposta entrasse como 'admin',
//   o lojista acharia que era o Paulo falando e depois nao daria pra separar
//   o que foi robo do que foi gente.
// - Trava por conversa (botLigado), igual ao docsLiberado: conversa sensivel
//   (dinheiro, saque, documento) fica com o robo desligado.
// - Limite de uso por conta e por dia, para uma conta sozinha nao torrar a
//   chave da Anthropic.
//
// ------------------------------------------------------------------
// ENVS NO VERCEL (projeto moviki-ai)
// ------------------------------------------------------------------
//   FIREBASE_SERVICE_ACCOUNT  -> o MESMO JSON que ja esta no moviki-robo
//   ANTHROPIC_API_KEY         -> console.anthropic.com
//   ANTHROPIC_MODEL           -> opcional
//   CHAT_ORIGENS              -> opcional. Lista separada por virgula das
//                                origens liberadas no CORS. Padrao abaixo.
//   CHAT_LIMITE_DIA           -> opcional. Padrao 40 respostas por conta/dia.

const { admin, db } = require('../lib/firebase');
const { perguntarClaude } = require('../lib/anthropic');
const { montarSystemPrompt } = require('../lib/promptPainel');
const { montarContexto } = require('../lib/contextoUsuario');
const memoria = require('../lib/memoria');

const ORIGENS_PADRAO = [
  'https://app.moviki.com.br',
  'https://moviki.com.br',
  'https://www.moviki.com.br',
];
const MAX_HISTORICO = 16;   // ~8 idas e vindas — o bastante para contexto
const LIMITE_DIA_PADRAO = 40;

function origensLiberadas() {
  const env = String(process.env.CHAT_ORIGENS || '').trim();
  if (!env) return ORIGENS_PADRAO;
  return env.split(',').map((s) => s.trim()).filter(Boolean);
}

// O painel roda em app.moviki.com.br e o endpoint em outro dominio (Vercel),
// entao o navegador exige CORS. Lista fixa: '*' deixaria qualquer site
// chamar o endpoint com o token de quem estivesse logado.
function cors(req, res) {
  const origem = String(req.headers.origin || '');
  if (origensLiberadas().indexOf(origem) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function ms(t) {
  try { return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; } catch (_) { return 0; }
}
function hoje() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}

/* Le o token do cabecalho Authorization: Bearer <idToken>, e so dele.
   Token no corpo do pedido acabaria em log de proxy mais facilmente. */
async function quemEstaFalando(req) {
  const h = String(req.headers.authorization || '');
  const t = h.indexOf('Bearer ') === 0 ? h.slice(7).trim() : '';
  if (!t) return null;
  try {
    const dec = await admin.auth().verifyIdToken(t);
    return { uid: dec.uid, email: dec.email || '', emailVerificado: dec.email_verified === true };
  } catch (e) {
    console.error('[chat] token invalido:', e && e.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'metodo' });

  try {
    const eu = await quemEstaFalando(req);
    if (!eu) return res.status(401).json({ ok: false, erro: 'nao_autenticado' });

    const uid = eu.uid;
    const convRef = db.collection('conversas').doc(uid);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return res.status(200).json({ ok: true, pulado: 'sem_conversa' });
    const conv = convSnap.data() || {};

    // Trava por conversa. Padrao DESLIGADO: conversa nova nao ganha robo
    // sozinha — o dono liga quando quiser.
    if (conv.botLigado !== true) return res.status(200).json({ ok: true, pulado: 'bot_desligado' });

    // Teto de uso por conta/dia. Zera sozinho na virada do dia (UTC).
    const dia = hoje();
    const limite = Number(process.env.CHAT_LIMITE_DIA || LIMITE_DIA_PADRAO);
    const usadas = (conv.botDia === dia) ? (Number(conv.botUsos) || 0) : 0;
    if (usadas >= limite) return res.status(200).json({ ok: true, pulado: 'limite_dia' });

    // Historico: as ultimas MAX_HISTORICO mensagens, em ordem. Vem em ordem
    // decrescente e e invertido aqui — 'desc' + limit pega as ULTIMAS; com
    // 'asc' + limit pegaria as PRIMEIRAS e o robo responderia o passado.
    const qs = await convRef.collection('mensagens')
      .orderBy('criadoEm', 'desc').limit(MAX_HISTORICO).get();
    const msgs = [];
    qs.forEach((d) => msgs.push(Object.assign({ id: d.id }, d.data() || {})));
    msgs.reverse();
    if (!msgs.length) return res.status(200).json({ ok: true, pulado: 'sem_mensagem' });

    const ultima = msgs[msgs.length - 1];

    // O robo so responde a pessoa. Se a ultima e do admin ou dele mesmo,
    // nao ha o que responder.
    if (ultima.de !== 'lojista') return res.status(200).json({ ok: true, pulado: 'nao_e_vez_do_bot' });

    // HANDOFF: humano assumiu, robo cala. Se o admin falou nesta conversa nos
    // ultimos HANDOFF_MIN minutos, quem responde e gente — o robo entrando no
    // meio de um atendimento humano e pior do que nao responder.
    const HANDOFF_MIN = 30;
    const agora = Date.now();
    const humanoRecente = msgs.some((m) => m.de === 'admin' && ms(m.criadoEm) > agora - HANDOFF_MIN * 60000);
    if (humanoRecente) return res.status(200).json({ ok: true, pulado: 'humano_no_atendimento' });

    // IDEMPOTENCIA: dois cliques, dois deploys ou um retry do navegador nao
    // podem gerar duas respostas para a mesma mensagem.
    if (conv.botRespondeuAte === ultima.id) return res.status(200).json({ ok: true, pulado: 'ja_respondida' });

    // Mensagem so com anexo e sem texto: nao ha o que interpretar, e o robo
    // nao le documento. Passa para o time.
    const pergunta = String(ultima.texto || '').trim();
    if (!pergunta) {
      await gravarResposta(convRef, uid, ultima.id, dia, usadas,
        'Recebi seu arquivo. Como eu não consigo abrir documentos, vou passar para o time — alguém responde por aqui mesmo.');
      return res.status(200).json({ ok: true, resposta: 'anexo_sem_texto' });
    }

    // Devolve o texto do contexto E o id da oferta que o lib/oportunidade.js
    // escolheu — o id precisa ser gravado junto com a resposta, senao um
    // "nao" da pessoa na mensagem seguinte nao teria a que se referir.
    const ctx = await montarContexto(uid, eu.email);
    const contexto = ctx.texto;
    const ofertaId = ctx.ofertaId;
    const historico = msgs.slice(0, -1).map((m) => ({
      role: (m.de === 'lojista') ? 'user' : 'assistant',
      texto: String(m.texto || (m.arquivoNome ? '[enviou o arquivo ' + m.arquivoNome + ']' : '')).slice(0, 2000),
    })).filter((m) => m.texto);

    const resposta = await perguntarClaude({
      systemPrompt: montarSystemPrompt(contexto),
      historico: alternar(historico),
      mensagemNova: pergunta.slice(0, 2000),
    });

    // Sem resposta da IA (chave, cota, timeout): NAO grava nada e nao mente
    // pro painel. O lojista continua vendo a propria mensagem enviada e o
    // time responde depois — que e exatamente o comportamento de antes.
    if (!resposta) return res.status(200).json({ ok: false, erro: 'ia_indisponivel' });

    // O Vik responde e, no MESMO texto, acrescenta no fim um bloco marcado
    // com o que aprendeu. Aqui o bloco e arrancado antes de qualquer coisa:
    // limparResposta() corta a partir do marcador de abertura mesmo que o
    // bloco esteja malformado ou sem fechamento. Perder um aprendizado e
    // barato; mostrar tripa de prompt para o lojista, nao.
    const limpa = memoria.limparResposta(resposta);
    const aprendido = memoria.extrairAprendizado(resposta);

    // Resposta que sobrou vazia depois da limpeza = a IA mandou so o bloco.
    // Melhor nao gravar nada do que gravar bolha em branco.
    if (!limpa) return res.status(200).json({ ok: false, erro: 'resposta_vazia' });

    await gravarResposta(convRef, uid, ultima.id, dia, usadas, limpa.slice(0, 2000));

    // Memoria e um bonus: grava DEPOIS da mensagem e nunca derruba a
    // resposta se falhar. Mesmo contrato do lib/ga.js e do lib/meta.js.
    try { await memoria.gravar(uid, aprendido, ofertaId); }
    catch (me) { console.error('[chat] memoria (ignorado):', me && me.message); }

    return res.status(200).json({ ok: true, resposta: 'gravada' });
  } catch (e) {
    console.error('[chat] erro:', e);
    // 200 de proposito: o painel nao deve mostrar erro vermelho por causa do
    // robo. A mensagem da pessoa ja esta gravada e sera respondida por gente.
    return res.status(200).json({ ok: false, erro: 'interno' });
  }
};

/* A API da Anthropic exige alternancia user/assistant e nao aceita duas
   mensagens seguidas do mesmo papel. No chat real isso acontece o tempo todo
   (a pessoa manda 3 mensagens seguidas). Aqui elas viram uma so. */
function alternar(lista) {
  const fora = [];
  for (const m of lista) {
    const ult = fora[fora.length - 1];
    if (ult && ult.role === m.role) { ult.texto = (ult.texto + '\n' + m.texto).slice(0, 4000); }
    else fora.push({ role: m.role, texto: m.texto });
  }
  // A API tambem exige que a primeira mensagem seja do usuario.
  while (fora.length && fora[0].role !== 'user') fora.shift();
  return fora;
}

/* Escreve a resposta e os carimbos em UM lote: ou entra tudo, ou nada.
   Sem lote, uma falha no meio deixaria a mensagem gravada sem o
   botRespondeuAte — e a proxima chamada responderia de novo. */
async function gravarResposta(convRef, uid, msgId, dia, usadas, texto) {
  const lote = db.batch();
  const nova = convRef.collection('mensagens').doc();
  lote.set(nova, {
    de: 'bot',
    texto: texto,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  lote.set(convRef, {
    uid: uid,
    ultimaMsg: String(texto).slice(0, 200),
    ultimaEm: admin.firestore.FieldValue.serverTimestamp(),
    ultimoDe: 'bot',
    botRespondeuAte: msgId,
    botDia: dia,
    botUsos: usadas + 1,
  }, { merge: true });
  await lote.commit();
}
