// lib/guardaPontos.js  (repo: moviki-ai)  — marca 2026-09-28-guarda1
//
// GUARDA ANTICLONAGEM — a conta de risco, sem banco e sem rede.
// Funcoes puras: recebem o acumulado do dia + o lote novo e devolvem o
// acumulado novo, os pontos e a decisao. Testadas em lib/guardaPontos.test.js.
//
// POR QUE A CONTA MORA NO SERVIDOR
// O navegador so manda CONTAGENS brutas (quantas vezes apertou F12, quantas
// telas diferentes abriu...). Quem transforma contagem em pontos e decide e
// o servidor. Assim ninguem "manda pontuacao zero": o maximo que um navegador
// adulterado consegue e ficar calado — e calado ele nao ganha nada.
//
// A ESCADA (escolha do Paulo em 28/09/2026: resposta GRADUADA)
//   robo comprovado (webdriver, headless, marcas de Selenium/Playwright)
//        -> 'suspenso' na hora, sem esperar ninguem
//   aparelho que ja foi banido (mesmo id gravado no navegador)
//        -> 'congelado' na hora
//   pontos >= cfg.congelar  -> 'congelado' (acesso travado ate o Paulo decidir)
//   pontos >= cfg.alerta    -> 'alerta'    (so avisa no Telegram)
//   abaixo                  -> 'ok'
// Banir de vez e SEMPRE decisao humana (painel guarda.html).
//
// Modo 'observar' (guarda_config/geral.modo): calcula tudo, avisa, mas
// nunca trava ninguem. Serve para calibrar os limites com trafego real.

'use strict';

const VERSAO = '2026-09-28-guarda1';

// Pontos por ocorrencia e teto por dia de cada sinal.
// Teto existe para UM habito inocente (ex.: tirar print para mandar ao
// socio) nunca bastar sozinho para travar uma conta.
const PESOS = {
  inspecao:       { p: 10, teto: 20 }, // DevTools/CDP conectado a pagina
  painel_dev:     { p: 5,  teto: 10 }, // janela com painel de desenvolvedor aberto
  atalho_dev:     { p: 5,  teto: 20 }, // F12, Ctrl+Shift+I/J/C
  ver_fonte:      { p: 10, teto: 20 }, // Ctrl+U
  salvar:         { p: 15, teto: 30 }, // Ctrl+S (salvar a pagina inteira)
  imprimir:       { p: 5,  teto: 15 }, // Ctrl+P / impressao
  print:          { p: 2,  teto: 10 }, // tecla PrintScreen / Cmd+Shift+3,4,5
  sel_tudo:       { p: 3,  teto: 12 }, // Ctrl+A
  copia_grande:   { p: 8,  teto: 32 }, // copiou mais de 1.500 caracteres de uma vez
  marca_removida: { p: 30, teto: 30 }, // a marca d'agua sumiu da tela
};

// Clique gerado por script (isTrusted=false) em quantidade.
const SINTETICO_MIN = 10, SINTETICO_PONTOS = 20;
// Cliques com intervalo regular demais (maquina, nao gente).
const RITMO_PONTOS = 40;
// Varredura: telas DIFERENTES abertas numa janela de 10 minutos.
const VARREDURA = [ { min: 50, p: 70 }, { min: 30, p: 40 } ];
// Telas diferentes no dia inteiro.
const VARREDURA_DIA = { min: 80, p: 30 };
// Conta criada ha menos de 72 h pesa 1,5x no comportamento.
const CONTA_NOVA_H = 72, CONTA_NOVA_MULT = 1.5;
// Mesmo aparelho com 3+ contas diferentes.
const MULTICONTA_MIN = 3, MULTICONTA_PONTOS = 40;
// Aparelho parecido (impressao do navegador) com o de um banido — so pontua.
// Nunca trava sozinho: iPhones do mesmo modelo tem impressao quase igual.
const PARECIDO_BANIDO_PONTOS = 30;

const CFG_PADRAO = {
  ligado: true,
  modo: 'agir',          // 'agir' | 'observar'
  alerta: 50,
  congelar: 100,
  marcaVisual: true,
  opacidade: 0.03,
  isentos: [],
};

const MAX_TELAS_DIA = 200;
const MAX_CONTAGEM_LOTE = 50;

function num(v, max) {
  const n = Math.floor(Number(v));
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

// Dia no horario de Brasilia fixo (UTC-3), como o resto do projeto.
function diaBR(ms) {
  const d = new Date((ms || Date.now()) - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function cfgNormalizada(c) {
  const x = Object.assign({}, CFG_PADRAO, c || {});
  x.ligado = x.ligado !== false;
  x.modo = x.modo === 'observar' ? 'observar' : 'agir';
  x.alerta = num(x.alerta, 100000) || CFG_PADRAO.alerta;
  x.congelar = num(x.congelar, 100000) || CFG_PADRAO.congelar;
  if (x.congelar < x.alerta) x.congelar = x.alerta;
  x.marcaVisual = x.marcaVisual !== false;
  let op = Number(x.opacidade);
  if (!isFinite(op)) op = CFG_PADRAO.opacidade;
  x.opacidade = Math.max(0.015, Math.min(0.12, op));
  x.isentos = Array.isArray(x.isentos) ? x.isentos.filter(s => typeof s === 'string').slice(0, 200) : [];
  return x;
}

// Limpa o lote que veio do navegador: so nomes conhecidos, so numeros, com teto.
function limparLote(l) {
  l = l && typeof l === 'object' ? l : {};
  const c = {};
  const bruto = l.c && typeof l.c === 'object' ? l.c : {};
  Object.keys(PESOS).forEach(k => { const v = num(bruto[k], MAX_CONTAGEM_LOTE); if (v) c[k] = v; });
  const sint = num(bruto.clique_sintetico, 500); if (sint) c.clique_sintetico = sint;
  const robo = Array.isArray(l.robo)
    ? l.robo.filter(s => typeof s === 'string').map(s => s.slice(0, 40)).slice(0, 12)
    : [];
  const telas = Array.isArray(l.telas)
    ? l.telas.filter(s => typeof s === 'string' && /^[a-z0-9]{4,12}$/.test(s)).slice(0, 60)
    : [];
  return {
    c,
    robo,
    ritmo: l.ritmo === true,
    max10: num(l.max10, 500),
    telas,
    pagina: typeof l.pagina === 'string' ? l.pagina.slice(0, 40) : '',
  };
}

// Junta o lote ao acumulado do dia. Dia virou -> comeca do zero.
function somar(hoje, lote, agoraMs) {
  const dia = diaBR(agoraMs);
  const base = hoje && hoje.dia === dia ? hoje : { dia, c: {}, telas: [], max10: 0, ritmo: false, robo: [] };
  const out = {
    dia,
    c: Object.assign({}, base.c || {}),
    telas: Array.isArray(base.telas) ? base.telas.slice() : [],
    max10: num(base.max10, 500),
    ritmo: base.ritmo === true,
    robo: Array.isArray(base.robo) ? base.robo.slice() : [],
  };
  Object.keys(lote.c).forEach(k => { out.c[k] = num((out.c[k] || 0) + lote.c[k], 5000); });
  lote.telas.forEach(t => { if (out.telas.indexOf(t) < 0 && out.telas.length < MAX_TELAS_DIA) out.telas.push(t); });
  out.max10 = Math.max(out.max10, lote.max10);
  if (lote.ritmo) out.ritmo = true;
  lote.robo.forEach(r => { if (out.robo.indexOf(r) < 0 && out.robo.length < 12) out.robo.push(r); });
  return out;
}

// Pontos do dia + a lista legivel do porque.
// extra: { contaNovaH, multiconta, parecidoBanido }
function pontuar(hoje, extra) {
  extra = extra || {};
  const motivos = [];
  let comp = 0;
  Object.keys(PESOS).forEach(k => {
    const n = (hoje.c && hoje.c[k]) || 0;
    if (!n) return;
    const p = Math.min(n * PESOS[k].p, PESOS[k].teto);
    comp += p; motivos.push(k + ' x' + n + ' = ' + p);
  });
  const sint = (hoje.c && hoje.c.clique_sintetico) || 0;
  if (sint >= SINTETICO_MIN) { comp += SINTETICO_PONTOS; motivos.push('clique_sintetico x' + sint + ' = ' + SINTETICO_PONTOS); }
  if (hoje.ritmo) { comp += RITMO_PONTOS; motivos.push('ritmo_de_maquina = ' + RITMO_PONTOS); }
  for (const v of VARREDURA) {
    if ((hoje.max10 || 0) >= v.min) { comp += v.p; motivos.push('varredura ' + hoje.max10 + ' telas/10min = ' + v.p); break; }
  }
  const nDia = (hoje.telas || []).length;
  if (nDia >= VARREDURA_DIA.min) { comp += VARREDURA_DIA.p; motivos.push('varredura ' + nDia + ' telas no dia = ' + VARREDURA_DIA.p); }

  const nova = typeof extra.contaNovaH === 'number' && extra.contaNovaH < CONTA_NOVA_H;
  if (nova && comp > 0) {
    const antes = comp; comp = Math.round(comp * CONTA_NOVA_MULT);
    motivos.push('conta nova (' + Math.round(extra.contaNovaH) + ' h) x' + CONTA_NOVA_MULT + ': ' + antes + ' -> ' + comp);
  }
  let pts = comp;
  if (extra.multiconta >= MULTICONTA_MIN) { pts += MULTICONTA_PONTOS; motivos.push('aparelho com ' + extra.multiconta + ' contas = ' + MULTICONTA_PONTOS); }
  if (extra.parecidoBanido) { pts += PARECIDO_BANIDO_PONTOS; motivos.push('aparelho parecido com o de um banido = ' + PARECIDO_BANIDO_PONTOS); }
  return { pontos: pts, motivos };
}

const TRAVADOS = ['congelado', 'suspenso', 'banido'];
function travado(estado) { return TRAVADOS.indexOf(estado) >= 0; }

// Decide o estado. Estado TRAVADO (congelado/suspenso/banido) nunca volta
// sozinho: liberar e so pelo painel. 'alerta' e so aviso e e recalculado a
// cada lote (dia novo sem sinal volta a 'ok').
const GRAVIDADE = { ok: 0, alerta: 1, congelado: 2, suspenso: 3, banido: 4 };
function decidir(opts) {
  const cfg = cfgNormalizada(opts.cfg);
  const atual = GRAVIDADE[opts.estadoAtual] !== undefined ? opts.estadoAtual : 'ok';
  let novo = 'ok', porque = '';
  if (opts.robo && opts.robo.length) { novo = 'suspenso'; porque = 'robo: ' + opts.robo.join(', '); }
  else if (opts.aparelhoBanido) { novo = 'congelado'; porque = 'aparelho de conta banida'; }
  else if (opts.pontos >= cfg.congelar) { novo = 'congelado'; porque = opts.pontos + ' pontos (limite ' + cfg.congelar + ')'; }
  else if (opts.pontos >= cfg.alerta) { novo = 'alerta'; porque = opts.pontos + ' pontos (alerta em ' + cfg.alerta + ')'; }
  // Modo observar: nunca trava, so rebaixa para alerta.
  if (cfg.modo === 'observar' && (novo === 'suspenso' || novo === 'congelado')) {
    porque = '[observar] seria ' + novo + ' — ' + porque; novo = 'alerta';
  }
  if (travado(atual) && GRAVIDADE[atual] >= GRAVIDADE[novo]) return { estado: atual, mudou: false, porque };
  return { estado: novo, mudou: novo !== atual, porque };
}


// Marca d'agua: 6 caracteres sem os que se confundem (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function marcaNova(rnd) {
  rnd = rnd || Math.random;
  let s = '';
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(rnd() * ALFABETO.length)];
  return s;
}
function marcaValida(m) { return typeof m === 'string' && /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/.test(m); }

module.exports = {
  VERSAO, PESOS, CFG_PADRAO, GRAVIDADE,
  cfgNormalizada, limparLote, somar, pontuar, decidir, travado,
  marcaNova, marcaValida, diaBR,
};
