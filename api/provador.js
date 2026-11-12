/* MOVIKI api/provador.js | versao 2026-11-12-provador | repo: moviki-ai
   PROVADOR VIRTUAL — porta que a pagina publica da loja chama (12/11/2026).

   POST { uid, ci, pi, aparelho, aceite: true, foto: 'data:image/jpeg;base64,...' }
   200  { ok, imagem (data URL JPEG, ja com a marca d'agua), largura, altura, restam }
   erro { ok: false, erro, mensagem }

   So atende o site do Moviki (CORS) e fica parada (503) enquanto faltar variavel.
   Nada e gravado aqui: a foto e a imagem passam pela memoria e somem. O log leva
   so o codigo do erro e o tempo, nunca a imagem nem o endereco de quem pediu. */
'use strict';

const P = require('../lib/provador.js');

function cors(req, res) {
  const origin = String(req.headers.origin || '');
  const ok = P.origemOk(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin.replace(/\/+$/, ''));
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  return ok;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origemOk = cors(req, res);
  if (req.method === 'OPTIONS') { res.status(origemOk ? 204 : 403).end(); return; }
  const falta = P.parado();
  if (falta) { res.status(503).json({ ok: false, standby: true, erro: 'parado', mensagem: P.MSG.parado }); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, erro: 'metodo', mensagem: P.MSG.metodo }); return; }
  if (!origemOk) { res.status(403).json({ ok: false, erro: 'origem', mensagem: P.MSG.origem }); return; }

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (_) { corpo = null; } }
  if (!corpo || typeof corpo !== 'object') { res.status(400).json({ ok: false, erro: 'dados', mensagem: P.MSG.dados }); return; }

  const inicio = Date.now();
  let r;
  try { r = await P.gerar(corpo, P.ipDe(req)); }
  catch (_) { r = { status: 500, json: { ok: false, erro: 'motor', mensagem: P.MSG.motor } }; }
  if (r.status !== 200) console.log('[provador] ' + r.status + ' ' + (r.json && r.json.erro) + ' ' + (Date.now() - inicio) + 'ms');
  res.status(r.status).json(r.json);
};
