// api/manychat.js  (repo: moviki-ai)  versao 2026-10-28-ruido | antes 2026-10-26-vendedor
// 28/10/2026 (ruido): corrente religiosa, mensagem politica, link de conteudo
// compartilhado e texto longo encaminhado sem assunto de venda nao chamam a IA,
// nao gravam nada e nao avisam o Paulo: a resposta volta VAZIA com
// calar:'sim' (toda resposta leva calar 'sim' ou 'nao'); o ManyChat grava no
// campo vik_calar e a Condicao antes do bloco de envio nao manda nada. Foto, video e audio soltos tambem
// ficam calados; so recebem o pedido de mensagem escrita quando o Vik falou com
// a pessoa nos ultimos 30 min (e resposta a uma pergunta, nao encaminhamento).
// 26/10/2026 (vendedor): o Vik pensa num rascunho <analise> que sai antes de
// qualquer filtro; usa o ramo guardado da conversa quando o ManyChat nao
// manda; audio/foto/figurinha recebem pedido de mensagem escrita (antes:
// "Boa pergunta!"); resposta barrada por promessa ganha UMA reescrita quando
// ainda ha tempo dentro dos 10 s do ManyChat. | antes 2026-10-09-direct
// 26/10/2026 — "Perfeito" no direct virava "Estou pronto para atender...
// Resumo do que tenho: ✅...". Agora: confirmacao curta responde com frase
// fixa sem gastar IA; resposta que fala de si (resposta_meta no
// segurancaVik) nunca chega ao cliente; historico contaminado e limpo antes de
// ir para a IA. Ver lib/vikDirect.js.
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
const PRAZO_TOTAL_MS = 9000; // margem para gravar e responder antes dos 10 s
const MAX_TOKENS = 500;      // rascunho <analise> (~60) + mensagem (~250)
const RETENCAO_DIAS = 30;
const JANELA_MIDIA_MS = 30 * 60000; // foto/audio logo depois de falar com o Vik = resposta

// Vale para erro, teto e resposta barrada: nao pode soar como resposta a uma
// pergunta (antes comecava com "Boa pergunta!", ate para um "ok").
const FRASE_PESSOA =
  'Vou chamar alguém da equipe para te responder aqui mesmo. ' +
  'Enquanto isso, a live de exemplo do seu ramo está no botão abaixo.';
const FRASE_SEM_TEXTO =
  'Por aqui eu consigo ler só mensagem escrita. Me conta em uma frase o que você vende ' +
  'que eu te mostro como fica a live do seu ramo.';

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

// Calado: toda resposta leva calar 'sim' ou 'nao' (texto, para o ManyChat
// gravar sem conversao no campo vik_calar); a Condicao do fluxo "Instagram
// Default Reply" so chega ao bloco de envio com vik_calar diferente de 'sim'.
function calar(res, motivo) {
  res.status(200).json({ ok: true, resposta: '', silencio: true, calar: 'sim', vik: false, pulado: motivo });
}

function responder(res, resposta, extra) {
  res.status(200).json(Object.assign({ ok: true, resposta: resposta, silencio: false, calar: 'nao', vik: extra && extra.vik === true }, extra || {}));
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
  const etapas = V.lerEtapas(corpo);
  const inicio = Date.now();

  // Sem contato: nada a fazer. Sem texto (audio, foto, figurinha, video): pede
  // a mensagem escrita, sem IA.
  if (!contato) { responder(res, FRASE_PESSOA, { pulado: 'sem_contato' }); return; }

  // Ruido (corrente, politica, link compartilhado): calado, sem IA e sem
  // gravar o texto — opiniao religiosa ou politica e dado sensivel (LGPD).
  const ruido = V.ehSemTexto(texto) ? '' : V.ruidoDirect(texto);
  if (ruido) { calar(res, ruido); return; }

  // Foto, video, audio ou figurinha sem texto: so pede a mensagem escrita se o
  // Vik conversou com a pessoa ha pouco; encaminhamento solto fica sem resposta.
  if (V.ehSemTexto(texto)) {
    let recente = false;
    try {
      const s0 = await db.collection('vik_direct').doc(contato).get();
      const at = s0.exists && s0.get('atualizadoEm');
      recente = !!(at && typeof at.toMillis === 'function' && Date.now() - at.toMillis() < JANELA_MIDIA_MS);
    } catch (_) {}
    if (recente) responder(res, FRASE_SEM_TEXTO, { pulado: 'sem_texto' });
    else calar(res, 'midia_solta');
    return;
  }

  try {
    // Confirmacao curta ("perfeito", "ok", "obrigada", emoji): resposta fixa,
    // sem IA e sem gastar a cota. Le o historico so quando o texto tem cara de
    // confirmacao (uma leitura barata a mais, nunca nas perguntas).
    if (V.ehConfirmacaoCurta(texto, '')) {
      const ref = db.collection('vik_direct').doc(contato);
      const snap = await ref.get();
      const d0 = snap.exists ? (snap.data() || {}) : {};
      const hist0 = Array.isArray(d0.historico) ? d0.historico : [];
      const ultima = hist0.filter(function (m) { return m && m.role === 'assistant'; }).pop();
      if (V.ehConfirmacaoCurta(texto, ultima ? ultima.texto : '')) {
        const fixa = V.respostaConfirmacao(texto, ultima ? ultima.texto : '');
        await ref.set({
          historico: hist0.concat([
            { role: 'user', texto: texto },
            { role: 'assistant', texto: fixa },
          ]).slice(-MAX_HISTORICO),
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          expiraEm: admin.firestore.Timestamp.fromDate(new Date(Date.now() + RETENCAO_DIAS * 86400000)),
        }, { merge: true });
        responder(res, fixa, { pulado: 'confirmacao' });
        return;
      }
    }

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

    const ehMeta = function (t) { const c = respostaSegura(t); return !c.ok && c.motivo === 'resposta_meta'; };
    const historico = V.limparHistorico(conv.historico, ehMeta);
    // O ramo que o ManyChat nao mandou nesta chamada pode estar guardado da
    // conversa (antes era ignorado e o Vik perguntava o ramo de novo).
    const ramoUsado = ramo || conv.ramo || '';
    const systemPrompt = V.montarPrompt(ramoUsado, etapas);
    const bruta = V.separarAnalise(await perguntarClaude({
      systemPrompt,
      historico,
      mensagemNova: texto,
      maxTokens: MAX_TOKENS,
      timeoutMs: TIMEOUT_IA_MS,
    }));

    if (!bruta) { responder(res, FRASE_PESSOA, { pulado: 'ia_sem_resposta' }); return; }

    // Mesmo filtro de conformidade do Vik do painel e do WhatsApp: promessa
    // de ganho por escrito, no direct, vira print e restricao de anuncio.
    let conf = respostaSegura(bruta, FRASE_PESSOA);
    let final = bruta;
    if (!conf.ok) console.error('[manychat] resposta BARRADA (' + conf.motivo + ') trecho="' + (conf.trecho || '') + '"');

    // Barrada por promessa ou garantia: UMA reescrita, so se ainda couber no
    // prazo do ManyChat. Barrar direto mandaria um lead quente para "alguem da
    // equipe" por causa de uma frase.
    const restante = PRAZO_TOTAL_MS - (Date.now() - inicio);
    if (!conf.ok && conf.motivo !== 'resposta_meta' && restante > 3500) {
      const bruta2 = V.separarAnalise(await perguntarClaude({
        systemPrompt: systemPrompt + '\n\n' + V.avisoReescrita(conf.motivo),
        historico,
        mensagemNova: texto,
        maxTokens: MAX_TOKENS,
        timeoutMs: restante - 500,
      }));
      const conf2 = bruta2 ? respostaSegura(bruta2, FRASE_PESSOA) : { ok: false, motivo: 'ia_sem_resposta' };
      if (conf2.ok) { conf = conf2; final = bruta2; console.error('[manychat] reescrita passou'); }
      else console.error('[manychat] reescrita tambem barrada (' + conf2.motivo + ')');
    }

    // Falou de si em vez de atender: mensagem curta recebe a frase natural de
    // confirmacao; pergunta de verdade recebe "alguem da equipe".
    let resposta = conf.ok ? V.limparResposta(final) : conf.texto;
    if (!conf.ok && conf.motivo === 'resposta_meta' && texto.split(/\s+/).length <= 4 && texto.indexOf('?') === -1) {
      const ultVik = historico.filter(function (m) { return m && m.role === 'assistant'; }).pop();
      resposta = V.respostaConfirmacao(texto, ultVik ? ultVik.texto : '');
    }

    const expira = new Date(Date.now() + RETENCAO_DIAS * 86400000);
    await convRef.set({
      historico: historico.concat([
        { role: 'user', texto: texto },
        { role: 'assistant', texto: resposta },
      ]).slice(-MAX_HISTORICO),
      ramo: ramoUsado,
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
