// api/guarda.js  (repo: moviki-ai)  — marca 2026-10-06-donogoogle (antes 2026-09-28-guarda1)
//
// 06/10/2026 (seguranca, plano de acao 1.1): as acoes adm_* (banir,
// congelar, liberar, isentar, configurar e ver a conta de qualquer um) so
// com sessao do dono aberta pelo GOOGLE, pela mesma lib/admin.js do robo.
// O guarda.html ganhou o botao do Google em 03/10, mas este servidor ainda
// aceitava o dono por senha. Quem e isento e quem e alvo protegido continua
// sendo so o documento admins/{uid}.
//
// GUARDA ANTICLONAGEM — o servidor.
//
// Quem chama:
//   - mvguarda.js (painel do lojista, do parceiro, /criador e estudio da live)
//     pelo endereco app.moviki.com.br/api/guarda, que o vercel.json do
//     moviki-app repassa para ca (mesma origem: a CSP de nenhum painel muda).
//   - guarda.html (painel da Guarda, so o dono) pelo mesmo endereco.
//
// Acoes:
//   status      -> registra o aparelho, devolve o estado e a marca d'agua
//   sinais      -> soma o lote de sinais do navegador e decide
//   adm_lista   -> fila do dono (travados + maior risco do dia)
//   adm_conta   -> tudo de uma conta
//   adm_acao    -> banir | congelar | liberar | isentar | tirar_isencao
//   adm_config  -> le (sem cfg) ou grava (com cfg) guarda_config/geral
//   adm_marca   -> de qual conta e esta marca d'agua
//
// SEGURANCA
// - O uid vem SEMPRE do idToken verificado, nunca do corpo.
// - O navegador so manda contagens; a pontuacao e a decisao sao daqui
//   (lib/guardaPontos.js). Navegador adulterado so consegue ficar calado.
// - Travar = desativar o login no Firebase Auth + revogar as sessoes. Nao
//   depende de regra nova do Firestore: sem login, nenhuma leitura logada passa.
//   O token que ja estava na mao vale no maximo 1 h; ate la o mvguarda.js
//   derruba a tela e faz logout.
// - Admin (admins/{uid}) e conta isenta nunca sao pontuados nem travados.
// - Banir e SEMPRE decisao humana (adm_acao). O automatico so suspende robo
//   comprovado e congela o que passou do limite — e o Paulo decide pelo
//   botao do Telegram.
// - Colecoes guarda_* nao tem regra no Firestore = negadas ao navegador.
//   So o Admin SDK (este arquivo) alcanca.
//
// ENVS (projeto Vercel moviki-ai) — nenhuma nova:
//   FIREBASE_SERVICE_ACCOUNT, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, CHAT_ORIGENS
//
// CHAVE-MESTRA: guarda_config/geral.ligado = false (no guarda.html).
// Desligada, o endpoint responde {ligado:false} e o mvguarda.js para tudo.

'use strict';

const { admin, db } = require('../lib/firebase');
const G = require('../lib/guardaPontos');
const { conferirAdmin } = require('../lib/admin');

const VERSAO = G.VERSAO;
const PAINEL_URL = 'https://app.moviki.com.br/guarda.html';
const ORIGENS_PADRAO = ['https://app.moviki.com.br', 'https://moviki.com.br', 'https://www.moviki.com.br'];
const DIA_MS = 24 * 3600 * 1000;
const RETEM_DIAS = 180;          // conta comum: 6 meses depois do ultimo sinal
const RETEM_DIAS_BANIDO = 1826;  // banida: 5 anos (prova para acao judicial)
const ALERTA_INTERVALO_MS = 6 * 3600 * 1000;
const MAX_HIST = 60;
const MAX_UIDS_APARELHO = 20;

const FV = admin.firestore.FieldValue;
const TS = admin.firestore.Timestamp;

// ------------------------------------------------------------------ util
function origens() {
  const env = String(process.env.CHAT_ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
  return env.length ? env : ORIGENS_PADRAO;
}
function cors(req, res) {
  const o = req.headers.origin;
  if (o && origens().indexOf(o) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
}
function corpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
function ipCurto(req) {
  const bruto = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (!bruto) return '';
  if (bruto.indexOf(':') >= 0) return bruto.split(':').slice(0, 3).join(':') + '::';
  const p = bruto.split('.');
  return p.length === 4 ? p[0] + '.' + p[1] + '.' + p[2] + '.0' : '';
}
function expira(dias) { return TS.fromMillis(Date.now() + dias * DIA_MS); }
function idAparelho(s) { return typeof s === 'string' && /^[a-z0-9]{16,40}$/.test(s) ? s : ''; }
function fpAparelho(s) { return typeof s === 'string' && /^[a-f0-9]{16,64}$/.test(s) ? s : ''; }

async function avisarTelegram(texto, uid) {
  const TOKEN = process.env.TELEGRAM_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT || typeof fetch !== 'function') return;
  const corpoMsg = { chat_id: CHAT, text: String(texto).slice(0, 3500), disable_web_page_preview: true };
  if (uid) corpoMsg.reply_markup = { inline_keyboard: [[{ text: 'Abrir e decidir', url: PAINEL_URL + '?uid=' + encodeURIComponent(uid) }]] };
  try {
    await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpoMsg),
    });
  } catch (e) { console.error('[guarda] telegram:', e && e.message); }
}

async function lerCfg() {
  try {
    const d = await db.collection('guarda_config').doc('geral').get();
    return G.cfgNormalizada(d.exists ? d.data() : {});
  } catch (e) {
    console.error('[guarda] cfg (usando padrao):', e && e.message);
    return G.cfgNormalizada({});
  }
}

async function tokenDe(b) {
  const t = typeof b.t === 'string' ? b.t : '';
  if (!t || t.length > 4096) return null;
  try { return await admin.auth().verifyIdToken(t); } catch (_) { return null; }
}
async function ehAdmin(uid) {
  try { return (await db.collection('admins').doc(uid).get()).exists; } catch (_) { return false; }
}

async function travarLogin(uid) {
  try {
    await admin.auth().updateUser(uid, { disabled: true });
    await admin.auth().revokeRefreshTokens(uid);
    return true;
  } catch (e) { console.error('[guarda] travar login', uid, e && e.message); return false; }
}
async function destravarLogin(uid) {
  try { await admin.auth().updateUser(uid, { disabled: false }); return true; }
  catch (e) { console.error('[guarda] destravar login', uid, e && e.message); return false; }
}

// Marca d'agua unica. Reserva em guarda_marcas com create() (falha se existe).
async function reservarMarca(uid) {
  for (let i = 0; i < 5; i++) {
    const m = G.marcaNova();
    try {
      await db.collection('guarda_marcas').doc(m).create({ uid, em: FV.serverTimestamp() });
      return m;
    } catch (_) { /* colidiu: tenta outra */ }
  }
  return '';
}

// ------------------------------------------------------ aparelho
// Dois registros por aparelho:
//   i_<id>  -> id aleatorio gravado no navegador (forte: mesmo navegador)
//   f_<fp>  -> impressao do navegador (fraca: aparelhos iguais colidem)
async function registrarAparelho(uid, id, fp) {
  const out = { banido: false, parecidoBanido: false, multiconta: 0 };
  const refs = [];
  if (id) refs.push(['i', db.collection('guarda_disp').doc('i_' + id)]);
  if (fp) refs.push(['f', db.collection('guarda_disp').doc('f_' + fp)]);
  for (const [tipo, ref] of refs) {
    try {
      const d = await ref.get();
      const x = d.exists ? d.data() : {};
      const uids = Array.isArray(x.uids) ? x.uids : [];
      if (x.banido === true && !(Array.isArray(x.banidoUids) && x.banidoUids.length === 1 && x.banidoUids[0] === uid)) {
        if (tipo === 'i') out.banido = true; else out.parecidoBanido = true;
      }
      if (tipo === 'i') out.multiconta = uids.indexOf(uid) >= 0 ? uids.length : uids.length + 1;
      if (uids.indexOf(uid) < 0 && uids.length < MAX_UIDS_APARELHO) {
        await ref.set({ uids: FV.arrayUnion(uid), ultimoEm: FV.serverTimestamp(), expiraEm: expira(RETEM_DIAS_BANIDO) }, { merge: true });
      }
    } catch (e) { console.error('[guarda] aparelho', e && e.message); }
  }
  return out;
}

// ------------------------------------------------------ processar
async function processar(req, uid, b, cfg) {
  const agora = Date.now();
  const ref = db.collection('guarda_contas').doc(uid);
  const snap = await ref.get();
  let conta = snap.exists ? snap.data() : null;

  // Conta nunca vista: marca, e-mail e idade da conta (Auth).
  if (!conta) {
    let email = '', criada = 0;
    try { const u = await admin.auth().getUser(uid); email = u.email || ''; criada = Date.parse(u.metadata.creationTime) || 0; } catch (_) {}
    conta = { estado: 'ok', marca: await reservarMarca(uid), email, criadaEmMs: criada, disps: [], fps: [], historico: [], pontosHoje: 0 };
    await ref.set(Object.assign({}, conta, { primeiroEm: FV.serverTimestamp(), expiraEm: expira(RETEM_DIAS) }), { merge: true });
  } else if (!conta.marca) {
    conta.marca = await reservarMarca(uid);
    await ref.set({ marca: conta.marca }, { merge: true });
  }

  if (conta.isento === true) return { conta, isento: true };

  const id = idAparelho(b.disp), fp = fpAparelho(b.fp);
  const novoAparelho = (id && (conta.disps || []).indexOf(id) < 0) || (fp && (conta.fps || []).indexOf(fp) < 0);
  const ap = (id || fp) ? await registrarAparelho(uid, id, fp) : { banido: false, parecidoBanido: false, multiconta: 0 };

  const lote = b.acao === 'sinais' ? G.limparLote(b.lote) : G.limparLote({});
  const hoje = G.somar(conta.hoje, lote, agora);
  const contaNovaH = conta.criadaEmMs ? (agora - conta.criadaEmMs) / 3600000 : undefined;
  const pt = G.pontuar(hoje, { contaNovaH, multiconta: ap.multiconta, parecidoBanido: ap.parecidoBanido });
  const dec = G.decidir({ pontos: pt.pontos, robo: hoje.robo, aparelhoBanido: ap.banido, estadoAtual: conta.estado, cfg });

  const temSinal = Object.keys(lote.c).length || lote.robo.length || lote.ritmo;
  const upd = {
    hoje, pontosHoje: pt.pontos, motivos: pt.motivos.slice(0, 20),
    ultimaEm: FV.serverTimestamp(), ultimaPagina: lote.pagina || String(b.pagina || '').slice(0, 40),
    versaoCliente: String(b.versao || '').slice(0, 30), versaoServidor: VERSAO,
    expiraEm: expira(conta.estado === 'banido' ? RETEM_DIAS_BANIDO : RETEM_DIAS),
  };
  if (id) upd.disps = FV.arrayUnion(id);
  if (fp) upd.fps = FV.arrayUnion(fp);
  if (temSinal || dec.mudou || novoAparelho) {
    const hist = Array.isArray(conta.historico) ? conta.historico.slice(-(MAX_HIST - 1)) : [];
    hist.push({
      em: agora, pts: pt.pontos,
      s: Object.keys(lote.c).map(k => k + ':' + lote.c[k]).concat(lote.robo.map(r => 'robo:' + r)).join(' ').slice(0, 300),
      p: upd.ultimaPagina, ip: ipCurto(req), ua: String(req.headers['user-agent'] || '').slice(0, 140),
      e: dec.mudou ? dec.estado : undefined,
    });
    upd.historico = JSON.parse(JSON.stringify(hist)); // tira undefined
  }

  let estado = conta.estado || 'ok';
  if (dec.mudou) {
    estado = dec.estado;
    upd.estado = estado; upd.porque = dec.porque; upd.estadoEm = FV.serverTimestamp();
    if (G.travado(estado)) upd.loginTravado = await travarLogin(uid);
  }

  // Telegram: toda mudanca de estado; alerta repetido no maximo a cada 6 h.
  const alertado = (conta.alertadoEm && conta.alertadoEm[estado]) || 0;
  const deveAvisar = estado !== 'ok' && estado !== 'banido' &&
    (dec.mudou || (estado === 'alerta' && pt.pontos > 0 && temSinal && agora - alertado > ALERTA_INTERVALO_MS));
  if (deveAvisar) {
    upd.alertadoEm = Object.assign({}, conta.alertadoEm || {}, { [estado]: agora });
    const titulo = estado === 'suspenso' ? '🛑 Guarda: ROBÔ detectado — conta SUSPENSA'
      : estado === 'congelado' ? '🧊 Guarda: conta CONGELADA — decida'
      : '⚠️ Guarda: comportamento suspeito';
    await avisarTelegram(
      titulo + '\n' +
      (conta.email || uid) + '\n' +
      'Pontos hoje: ' + pt.pontos + (cfg.modo === 'observar' ? ' (modo observar)' : '') + '\n' +
      'Motivo: ' + (dec.porque || '-') + '\n' +
      (pt.motivos.length ? '• ' + pt.motivos.slice(0, 6).join('\n• ') + '\n' : '') +
      'Tela: ' + (upd.ultimaPagina || '-'),
      uid);
  }

  await ref.set(upd, { merge: true });
  return { conta: Object.assign({}, conta, { estado }), estado };
}

// ------------------------------------------------------ admin
async function admLista() {
  const col = db.collection('guarda_contas');
  const [trav, topo] = await Promise.all([
    col.where('estado', 'in', ['congelado', 'suspenso', 'banido', 'alerta']).limit(80).get(),
    col.orderBy('pontosHoje', 'desc').limit(30).get(),
  ]);
  const resumo = d => {
    const x = d.data();
    return {
      uid: d.id, email: x.email || '', estado: x.estado || 'ok', pontos: x.pontosHoje || 0,
      dia: (x.hoje && x.hoje.dia) || '', porque: x.porque || '', pagina: x.ultimaPagina || '',
      ultimaEm: x.ultimaEm && x.ultimaEm.toMillis ? x.ultimaEm.toMillis() : 0, isento: x.isento === true,
    };
  };
  return { travados: trav.docs.map(resumo), topo: topo.docs.map(resumo).filter(x => x.pontos > 0) };
}

async function admConta(uid) {
  const d = await db.collection('guarda_contas').doc(uid).get();
  const x = d.exists ? d.data() : null;
  let auth = null;
  try {
    const u = await admin.auth().getUser(uid);
    auth = { email: u.email || '', desativado: !!u.disabled, criada: u.metadata.creationTime, ultimoLogin: u.metadata.lastSignInTime };
  } catch (_) {}
  let negocio = null, parceiro = null;
  try { const n = await db.collection('negocios').doc(uid).get(); if (n.exists) { const v = n.data(); negocio = { nome: v.nome || '', slug: v.slug || '' }; } } catch (_) {}
  try { const p = await db.collection('parceiros').doc(uid).get(); if (p.exists) { const v = p.data(); parceiro = { nome: v.nome || '', slug: v.slug || '', status: v.status || '' }; } } catch (_) {}
  let assinatura = null;
  try { const a = await db.collection('assinaturas').doc(uid).get(); if (a.exists) { const v = a.data(); assinatura = { plano: v.plano || '', ativo: v.ativo === true, periodo: v.periodo || '' }; } } catch (_) {}
  if (x) {
    ['ultimaEm', 'estadoEm', 'primeiroEm', 'expiraEm'].forEach(k => { if (x[k] && x[k].toMillis) x[k] = x[k].toMillis(); });
  }
  return { uid, guarda: x, auth, negocio, parceiro, assinatura };
}

async function admAcao(quem, uid, acao, nota) {
  if (!uid || typeof uid !== 'string' || uid.length > 128) return { erro: 'uid' };
  if (await ehAdmin(uid)) return { erro: 'alvo_admin' };
  const ref = db.collection('guarda_contas').doc(uid);
  const snap = await ref.get();
  const conta = snap.exists ? snap.data() : {};
  const upd = { estadoEm: FV.serverTimestamp(), porqueDono: String(nota || '').slice(0, 300), porQuem: quem };
  let login = null;

  if (acao === 'banir' || acao === 'congelar') {
    upd.estado = acao === 'banir' ? 'banido' : 'congelado';
    upd.porque = acao === 'banir' ? 'banido pelo dono' : 'congelado pelo dono';
    upd.isento = false;
    login = await travarLogin(uid);
    upd.loginTravado = login;
    if (acao === 'banir') {
      upd.expiraEm = expira(RETEM_DIAS_BANIDO);
      upd.banidoEm = FV.serverTimestamp();
      const ids = (conta.disps || []).map(i => 'i_' + i).concat((conta.fps || []).map(f => 'f_' + f));
      for (const docId of ids.slice(0, 40)) {
        try { await db.collection('guarda_disp').doc(docId).set({ banido: true, banidoUids: FV.arrayUnion(uid), expiraEm: expira(RETEM_DIAS_BANIDO) }, { merge: true }); } catch (_) {}
      }
    }
  } else if (acao === 'liberar' || acao === 'isentar') {
    upd.estado = 'ok'; upd.porque = acao === 'isentar' ? 'isento pelo dono' : 'liberado pelo dono';
    upd.hoje = FV.delete(); upd.pontosHoje = 0; upd.motivos = [];
    upd.alertadoEm = {};
    upd.expiraEm = expira(RETEM_DIAS);
    if (acao === 'isentar') upd.isento = true;
    login = await destravarLogin(uid);
    upd.loginTravado = false;
    if (conta.estado === 'banido') {
      const ids = (conta.disps || []).map(i => 'i_' + i).concat((conta.fps || []).map(f => 'f_' + f));
      for (const docId of ids.slice(0, 40)) {
        try { await db.collection('guarda_disp').doc(docId).set({ banido: false }, { merge: true }); } catch (_) {}
      }
    }
  } else if (acao === 'tirar_isencao') {
    upd.isento = false;
  } else {
    return { erro: 'acao' };
  }

  await ref.set(upd, { merge: true });
  try {
    await db.collection('guarda_log').add({
      uid, acao, nota: String(nota || '').slice(0, 300), quem, login, em: FV.serverTimestamp(), expiraEm: expira(RETEM_DIAS_BANIDO),
    });
  } catch (_) {}
  return { ok: true, estado: upd.estado || conta.estado || 'ok', login };
}

async function admConfig(cfgNova) {
  const ref = db.collection('guarda_config').doc('geral');
  if (cfgNova && typeof cfgNova === 'object') {
    const atual = await lerCfg();
    const c = G.cfgNormalizada(Object.assign({}, atual, cfgNova));
    await ref.set(Object.assign({}, c, { atualizadoEm: FV.serverTimestamp() }), { merge: true });
    return c;
  }
  return lerCfg();
}

async function admMarca(marca) {
  marca = String(marca || '').toUpperCase().trim();
  if (!G.marcaValida(marca)) return { erro: 'marca_invalida' };
  const d = await db.collection('guarda_marcas').doc(marca).get();
  if (!d.exists) return { achou: false, marca };
  const uid = d.data().uid;
  return Object.assign({ achou: true, marca }, await admConta(uid));
}

// ------------------------------------------------------ handler
module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, versao: VERSAO });
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });

  const b = corpo(req);
  const acao = String(b.acao || '');
  const dec = await tokenDe(b);
  if (!dec || !dec.uid) return res.status(401).json({ erro: 'token' });
  const uid = dec.uid;

  try {
    if (acao.indexOf('adm_') === 0) {
      const adm = await conferirAdmin(db, dec);
      if (!adm.ok) return res.status(adm.status).json({ erro: adm.erro, mensagem: adm.mensagem });
      if (acao === 'adm_lista') return res.status(200).json(Object.assign({ cfg: await lerCfg(), versao: VERSAO }, await admLista()));
      if (acao === 'adm_conta') return res.status(200).json(await admConta(String(b.uid || '')));
      if (acao === 'adm_acao') return res.status(200).json(await admAcao(uid, String(b.uid || ''), String(b.tipo || ''), b.nota));
      if (acao === 'adm_config') return res.status(200).json({ cfg: await admConfig(b.cfg) });
      if (acao === 'adm_marca') return res.status(200).json(await admMarca(b.marca));
      return res.status(400).json({ erro: 'acao' });
    }

    if (acao !== 'status' && acao !== 'sinais') return res.status(400).json({ erro: 'acao' });

    const cfg = await lerCfg();
    if (!cfg.ligado) return res.status(200).json({ ligado: false, versao: VERSAO });
    if (cfg.isentos.indexOf(uid) >= 0 || await ehAdmin(uid)) return res.status(200).json({ ligado: true, isento: true, versao: VERSAO });

    const r = await processar(req, uid, b, cfg);
    if (r.isento) return res.status(200).json({ ligado: true, isento: true, versao: VERSAO });
    return res.status(200).json({
      ligado: true,
      estado: r.estado,
      travado: G.travado(r.estado),
      marca: r.conta.marca || '',
      marcaVisual: cfg.marcaVisual,
      opacidade: cfg.opacidade,
      versao: VERSAO,
    });
  } catch (e) {
    console.error('[guarda] erro', acao, uid, e && (e.stack || e.message));
    // Falha do servidor nunca trava ninguem.
    return res.status(200).json({ ligado: true, estado: 'ok', erroServidor: true, versao: VERSAO });
  }
};
