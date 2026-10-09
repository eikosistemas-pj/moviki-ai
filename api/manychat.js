// api/manychat.js  (repo: moviki-ai)  versao 2026-10-09-direct
//
// O Vik no DIRECT DO INSTAGRAM. Quem chama e o ManyChat (bloco "External
// Request" da automacao "Instagram Default Reply"), quando a mensagem da
// pessoa nao bate com nenhuma palavra-chave. O ManyChat manda a pergunta; este
// endpoint devolve { resposta } e o ManyChat publica no direct, com os botoes
// "Criar conta grátis", "Ver live do meu ramo" e "Falar com uma pessoa".
// Regras e textos: lib/vikDirect.js (com teste).
//
// TRANCA (regra de ouro de 03/09: nunca falhar aberto)
//   - Sem a env MANYCHAT_CHAVE (16+ caracteres) o endpoint fica em stand-by
//     (503) e nao gasta chamada de IA nenhuma.
//   - Toda chamada precisa do cabecalho  x-moviki-chave  igual a env.
//
// CUSTO (cada resposta e uma chamada paga a Anthropic)
//   - Teto por contato por dia: DIRECT_LIMITE_DIA (padrao 12).
//   - Teto global por dia, todos os contatos: DIRECT_TETO_GLOBAL_DIA (padrao
//     300). Ao bater, avisa o Paulo uma vez no Telegram e volta a resposta
//     "uma pessoa responde" ate a virada do dia (UTC).
//   - Reserva da vaga numa transacao ANTES de chamar a IA (mesmo padrao do
//     api/chat.js de 23/09): chamadas simultaneas nao furam o teto.
//
// DADOS (LGPD — politica de privacidade, item 4, versao 2026-10-09-vikdirect)
//   - Grava so em vik_direct/{id do contato no ManyChat}: as ultimas 12
//     mensagens, contadores do dia e expiraEm (30 dias depois da ultima
//     mensagem). Nome, @ e foto nao entram. Sem regra no Firestore = so o
//     Admin SDK alcanca.
//   - expiraEm so apaga sozinho com a politica de TTL do Firestore ligada no
//     campo expiraEm do grupo vik_direct (passo do Paulo no console).
//
// Env (projeto moviki-ai na Vercel): MANYCHAT_CHAVE (nova), e as que ja
// existem: FIREBASE_SERVICE_ACCOUNT, ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
// TELEGRAM_TOKEN, TELEGRAM_CHAT_ID. Opcionais: DIRECT_LIMITE_DIA,
// DIRECT_TETO_GLOBAL_DIA.

const { admin, db } = require('../lib/firebase');
const { perguntarClaude } = require('../lib/anthropic');
const { respostaSegura } = require('../lib/segurancaVik');
const V = require('../lib/vikDirect');

const MAX_HISTORICO = 12;
const TIMEOUT_IA_MS = 7500; // o ManyChat desiste da chamada em 10 s
const RETENCAO_DIAS = 30;

const FRASE_PESSOA =
  'Boa pergunta! Vou passar para a equipe e uma pessoa te responde aqui mesmo. ' +
  'Enquanto isso, dá uma olhada na live de exemplo do seu ramo no botão abaixo.';

function hoje() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}

async function avisarTelegram(texto) {
  const TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT) return;
  try {
    await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text: texto, disable_web_page_preview: true }),
    });
  } catch (_) {}
}

function responder(res, resposta, extra) {
  res.status(200).json(Object.assign({ ok: true, resposta: resposta, vik: extra && extra.vik === true }, extra || {}));
}

module.exports = async (req, res) => {
  const chaveEnv = process.env.MANYCHAT_CHAVE;
  if (!chaveEnv || chaveEnv.length < 16) {
    res.status(503).json({ ok: false, standby: true, motivo: 'MANYCHAT_CHAVE ausente' });
    return;
  }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!V.chaveValida(chaveEnv, req.headers['x-moviki-chave'])) {
    res.status(401).json({ ok: false });
    return;
  }

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (_) { corpo = {}; } }
  const { contato, texto, ramo } = V.lerEntrada(corpo);

  // Sem contato ou sem texto (figurinha, audio, reacao): nada para a IA ler.
  if (!contato || !texto) { responder(res, FRASE_PESSOA, { pulado: 'sem_texto' }); return; }

  try {
    const dia = hoje();
    const limite = V.numeroEnv(process.env.DIRECT_LIMITE_DIA, V.LIMITE_CONTATO_PADRAO);
    const tetoGlobal = V.numeroEnv(process.env.DIRECT_TETO_GLOBAL_DIA, V.TETO_GLOBAL_PADRAO);
    const convRef = db.collection('vik_direct').doc(contato);
    const globalRef = db.collection('vik_direct').doc('_global');

    let conv = {};
    let ehNova = false;
    const decisao = await db.runTransaction(async (t) => {
      const [cs, gs] = await Promise.all([t.get(convRef), t.get(globalRef)]);
      conv = cs.exists ? (cs.data() || {}) : {};
      ehNova = !cs.exists;
      const g = gs.exists ? (gs.data() || {}) : {};
      const d = V.decidirReserva(conv, g, dia, limite, tetoGlobal);
      if (d.status === 'teto_global' && d.avisarTeto) t.set(globalRef, { dia, usos: d.usosG, avisadoDia: dia });
      if (d.status === 'ok') {
        t.set(convRef, { dia, usos: d.usos + 1 }, { merge: true });
        t.set(globalRef, { dia, usos: d.usosG + 1, avisadoDia: g.avisadoDia || '' });
      }
      return d;
    });

    if (decisao.avisarTeto) {
      await avisarTelegram('⚠️ Vik no direct do Instagram: o teto de ' + tetoGlobal +
        ' respostas por dia foi atingido. Até a virada do dia (UTC) o direct volta para "uma pessoa responde". ' +
        'Se for uso legítimo, suba DIRECT_TETO_GLOBAL_DIA na Vercel do moviki-ai.');
    }
    if (decisao.status !== 'ok') { responder(res, FRASE_PESSOA, { pulado: decisao.status }); return; }

    const historico = Array.isArray(conv.historico) ? conv.historico : [];
    const bruta = await perguntarClaude({
      systemPrompt: V.montarPrompt(ramo),
      historico,
      mensagemNova: texto,
      maxTokens: 350,
      timeoutMs: TIMEOUT_IA_MS,
    });

    if (!bruta) { responder(res, FRASE_PESSOA, { pulado: 'ia_sem_resposta' }); return; }

    // Mesmo filtro de conformidade do Vik do painel e do WhatsApp: promessa
    // de ganho por escrito, no direct, vira print e restricao de anuncio.
    const conf = respostaSegura(bruta, FRASE_PESSOA);
    if (!conf.ok) console.error('[manychat] resposta BARRADA (' + conf.motivo + ') trecho="' + (conf.trecho || '') + '"');
    const resposta = conf.ok ? V.limparResposta(bruta) : conf.texto;

    const expira = new Date(Date.now() + RETENCAO_DIAS * 86400000);
    await convRef.set({
      historico: historico.concat([
        { role: 'user', texto: texto },
        { role: 'assistant', texto: resposta },
      ]).slice(-MAX_HISTORICO),
      ramo: ramo || conv.ramo || '',
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      expiraEm: admin.firestore.Timestamp.fromDate(expira),
    }, { merge: true });

    if (ehNova) {
      await avisarTelegram('💬 Vik respondeu uma pergunta nova no direct do Instagram' +
        (ramo ? ' (ramo: ' + ramo + ')' : '') + ':\n"' + texto.slice(0, 200) + '"\n\nAcompanhe na caixa do ManyChat se quiser assumir.');
    }

    responder(res, resposta, { vik: true });
  } catch (e) {
    console.error('[manychat] erro inesperado:', e && e.message ? e.message : e);
    responder(res, FRASE_PESSOA, { pulado: 'erro' });
  }
};
