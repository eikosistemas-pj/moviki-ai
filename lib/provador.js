/* MOVIKI lib/provador.js | versao 2026-11-12-provador | repo: moviki-ai
   PROVADOR VIRTUAL — geracao da imagem (12/11/2026).

   O comprador manda uma foto dele pela pagina publica da loja; aqui a IA monta o
   produto na foto, o servidor carimba a marca d'agua e devolve a imagem.

   Fronteira (nao cruzar):
   - Este repositorio NAO escreve saldo, preco nem nada no banco. Antes de gastar,
     pede ao moviki-robo `prova_reservar` (ele confere loja, produto, saldo e limites
     e desconta 1 prova); depois avisa `prova_concluir` (falhou = a prova volta).
   - A foto do comprador e a imagem gerada NUNCA sao guardadas nem escritas em log.
     Passam pela memoria desta funcao e pelo fornecedor do motor, e so.

   Variaveis (Vercel do moviki-ai) — sem qualquer uma delas a porta fica parada (503):
     PROVADOR_SEGREDO   a mesma frase do moviki-robo (20+ caracteres)
     PROVADOR_CHAVE     chave do motor (Gemini API)
     PROVADOR_MODELO    modelo do motor (escolha consciente: muda o custo por prova)
   Opcionais: PROVADOR_ORIGENS, PROVADOR_ROBO_URL, PROVADOR_MOTOR_BASE, PROVADOR_LADO. */
'use strict';

const GLIFOS = require('./provadorGlifos.js');

const VERSAO = '2026-11-12-provador';
const ROBO_PADRAO = 'https://moviki-robo.vercel.app';
const MOTOR_BASE = 'https://generativelanguage.googleapis.com/v1';
const ORIGENS_PADRAO = ['https://moviki.com.br', 'https://www.moviki.com.br'];
const TIPOS = ['roupa', 'calcado', 'acessorio', 'maquiagem'];
// Mesmos enderecos de foto que o robo aceita no cardapio.
const FOTO_HOST = /^(firebasestorage\.googleapis\.com|[a-z0-9-]+\.firebasestorage\.app|i\.ibb\.co)$/;
const LIM = {
  fotoBytes: 2600000,      // foto do comprador ja comprimida no aparelho (o pedido inteiro cabe em 4,5 MB)
  produtoBytes: 8000000,
  ladoMin: 320,
  ladoSaida: 1280,
  roboMs: 8000,
  baixarMs: 8000,
  motorMs: 70000,
};
// Proporcoes que o motor aceita; a saida usa a mais proxima da foto do comprador.
const PROPORCOES = [['1:1', 1], ['2:3', 2 / 3], ['3:2', 3 / 2], ['3:4', 3 / 4], ['4:3', 4 / 3], ['4:5', 4 / 5], ['5:4', 5 / 4], ['9:16', 9 / 16], ['16:9', 16 / 9]];

const MSG = {
  metodo: 'Pedido inválido.',
  origem: 'Pedido inválido.',
  dados: 'Não consegui ler o pedido. Atualize a página e tente de novo.',
  aceite: 'Para usar o provador, confirme que a foto é sua e que você tem 18 anos ou mais.',
  foto: 'Não consegui ler essa foto. Escolha outra, em JPG ou PNG.',
  foto_grande: 'Essa foto ficou grande demais. Escolha outra ou tire uma nova.',
  foto_pequena: 'Essa foto é pequena demais. Escolha uma com mais qualidade.',
  parado: 'O provador não está disponível agora.',
  robo: 'O provador não respondeu agora. Tente de novo em instantes.',
  foto_produto: 'Não consegui abrir a foto deste produto. Avise a loja.',
  motor: 'Não deu para montar a imagem agora. Tente de novo em instantes. Essa tentativa não foi descontada.',
  motor_bloqueio: 'Não consegui usar essa foto. Tente outra, com boa luz, só você na imagem. Essa tentativa não foi descontada.',
  tempo: 'A imagem demorou demais para ficar pronta. Tente de novo. Essa tentativa não foi descontada.',
};

function parado(env) {
  env = env || process.env;
  if (String(env.PROVADOR_SEGREDO || '').length < 20) return 'PROVADOR_SEGREDO ausente';
  if (!env.PROVADOR_CHAVE) return 'PROVADOR_CHAVE ausente';
  if (!env.PROVADOR_MODELO) return 'PROVADOR_MODELO ausente';
  return '';
}

function origens(env) {
  env = env || process.env;
  const extra = String(env.PROVADOR_ORIGENS || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter((s) => /^https:\/\/[a-z0-9.-]+$/i.test(s));
  return ORIGENS_PADRAO.concat(extra);
}
function origemOk(origin, env) {
  const o = String(origin || '').replace(/\/+$/, '');
  return !!o && origens(env).indexOf(o) >= 0;
}

/* IP de quem pediu: a Vercel poe o endereco real na frente do x-forwarded-for. */
function ipDe(req) {
  const h = (req && req.headers) || {};
  const xf = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = xf || String(h['x-real-ip'] || '').trim();
  return /^[0-9a-fA-F:.]{3,64}$/.test(ip) ? ip : '';
}

function tipoImagem(buf) {
  if (!buf || buf.length < 12) return '';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return '';
}

/* Foto do comprador: data URL em base64, conferida pelos primeiros bytes. */
function lerFoto(dataUrl) {
  const s = String(dataUrl || '');
  if (s.length > Math.ceil(LIM.fotoBytes * 1.4) + 64) return { erro: 'foto_grande' };
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(s);
  if (!m) return { erro: 'foto' };
  let buf;
  try { buf = Buffer.from(m[2], 'base64'); } catch (_) { return { erro: 'foto' }; }
  if (buf.length > LIM.fotoBytes) return { erro: 'foto_grande' };
  if (!tipoImagem(buf)) return { erro: 'foto' };
  return { buf };
}

function validar(b) {
  b = b || {};
  const uid = String(b.uid || ''), ci = Number(b.ci), pi = Number(b.pi), aparelho = String(b.aparelho || '');
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return { erro: 'dados' };
  if (!Number.isInteger(ci) || !Number.isInteger(pi) || ci < 0 || pi < 0 || ci > 60 || pi > 500) return { erro: 'dados' };
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(aparelho)) return { erro: 'dados' };
  if (b.aceite !== true) return { erro: 'aceite' };
  return { uid, ci, pi, aparelho };
}

function proporcaoDe(l, a) {
  const r = l / a;
  let melhor = PROPORCOES[0], d = Infinity;
  for (const p of PROPORCOES) { const x = Math.abs(Math.log(r / p[1])); if (x < d) { d = x; melhor = p; } }
  return melhor[0];
}

/* ---------------------------------------------------------------- pedido ao motor */
/* O texto vai em ingles porque e a lingua em que o motor segue melhor a instrucao.
   Regra comum: mesma pessoa, mesma pose, mesmo fundo; muda so o produto. */
const BASE_PROMPT =
  'You are a virtual try-on engine for an online store. Image 1 is a photo of a customer. Image 2 is a product photo from the store. ' +
  'Edit image 1 so the customer is using the product from image 2. ' +
  'Keep the same person exactly: same face, facial features, expression, skin tone, hair, body shape and proportions, pose and hands. ' +
  'Keep the same background, framing, camera angle and lighting of image 1. Do not beautify, slim, age or restyle the person. ' +
  'Reproduce the product faithfully: same color, pattern, print, material, shape and details as in image 2; ignore the hanger, mannequin, packaging, price tags, text and background of image 2. ' +
  'The result must be one photorealistic photo with natural shadows and fit, no text, no watermark, no borders, no collage, no extra people. ' +
  'Keep the person modestly dressed; never remove clothing beyond what the product replaces. ';
const POR_TIPO = {
  roupa: 'The product is a clothing item. Dress the customer in it, replacing only the garment it substitutes (top for top, bottom for bottom, dress for the full outfit) and keeping every other clothing item, shoes and accessories from image 1. Respect the garment length and sleeves shown in image 2.',
  calcado: 'The product is footwear. Put the pair on the customer\'s feet, replacing only the shoes, with correct left and right, scale and perspective. Keep all clothing unchanged. If the feet are not visible in image 1, leave the photo unchanged.',
  acessorio: 'The product is an accessory (jewelry, earrings, necklace, bracelet, ring, watch, glasses, hat, cap, scarf or bag). Place it on the customer where it is naturally worn, at real-life scale, keeping its exact thickness, size and shine. Keep clothing, hair and makeup unchanged. For earrings show them on the visible ears only.',
  maquiagem: 'The product is a makeup item. Apply only this product, in the color shown in image 2, where it is naturally used (lipstick on the lips, eyeshadow on the eyelids, blush on the cheeks, nail polish on the nails). Keep the skin texture, face shape and everything else identical. Do not add any other makeup.',
};
function promptDe(tipo, produto) {
  const t = TIPOS.indexOf(tipo) >= 0 ? tipo : 'roupa';
  const nome = String(produto || '').replace(/[^\p{L}\p{N} .,\-()/]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return BASE_PROMPT + POR_TIPO[t] + (nome ? ' Store name of the product, for reference only: "' + nome + '".' : '');
}

/* ---------------------------------------------------------------- chamadas de rede */
async function buscar(url, opcoes, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, Object.assign({}, opcoes, { signal: ctrl.signal })); }
  finally { clearTimeout(t); }
}

/* Porta servidor a servidor do robo. Nunca lanca: devolve { http, j }. */
async function chamarRobo(acao, dados, env) {
  env = env || process.env;
  const base = String(env.PROVADOR_ROBO_URL || ROBO_PADRAO).replace(/\/+$/, '');
  try {
    const r = await buscar(base + '/api/provador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-moviki-provador': String(env.PROVADOR_SEGREDO || '') },
      body: JSON.stringify({ acao, dados }),
    }, LIM.roboMs);
    let j = null;
    try { j = await r.json(); } catch (_) { j = null; }
    return { http: r.status, j: j || {} };
  } catch (_) { return { http: 0, j: {} }; }
}

/* Foto do produto: so dos enderecos em que o painel guarda foto, sem seguir redirecionamento. */
function fotoProdutoOk(url) {
  let u;
  try { u = new URL(String(url || '')); } catch (_) { return false; }
  return u.protocol === 'https:' && !u.username && !u.password && FOTO_HOST.test(u.hostname);
}
async function baixarProduto(url) {
  if (!fotoProdutoOk(url)) throw new Error('foto_produto');
  const r = await buscar(url, { redirect: 'error' }, LIM.baixarMs);
  if (!r.ok) throw new Error('foto_produto');
  const tam = Number(r.headers.get('content-length') || 0);
  if (tam > LIM.produtoBytes) throw new Error('foto_produto');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > LIM.produtoBytes || !tipoImagem(buf)) throw new Error('foto_produto');
  return buf;
}

/* Motor do Google (Gemini, geracao de imagem). O nome do campo de formato da imagem
   mudou entre versoes da API; por isso tenta as formas conhecidas e, se a API recusar
   o campo (400, que nao e cobrado), cai para a seguinte. A ultima forma nao manda
   formato nenhum: o motor segue a proporcao da foto de entrada. */
function formasDoPedido(proporcao) {
  return [
    { responseModalities: ['IMAGE'], responseFormat: { image: { aspectRatio: proporcao, imageSize: '1K' } } },
    { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: proporcao, imageSize: '1K' } },
    { responseModalities: ['TEXT', 'IMAGE'] },
  ];
}
function imagemDaResposta(j) {
  const c = j && Array.isArray(j.candidates) ? j.candidates[0] : null;
  const partes = c && c.content && Array.isArray(c.content.parts) ? c.content.parts : [];
  for (let i = partes.length - 1; i >= 0; i--) {
    const p = partes[i] || {};
    if (p.thought === true) continue;
    const d = p.inlineData || p.inline_data;
    if (d && d.data) return Buffer.from(String(d.data), 'base64');
  }
  return null;
}
function bloqueioDaResposta(j) {
  if (j && j.promptFeedback && j.promptFeedback.blockReason) return true;
  const c = j && Array.isArray(j.candidates) ? j.candidates[0] : null;
  const fim = String((c && c.finishReason) || '');
  return /SAFETY|PROHIBITED|BLOCK|RECITATION|IMAGE_OTHER|NO_IMAGE/i.test(fim);
}
async function motorGoogle(e, env) {
  env = env || process.env;
  const base = String(env.PROVADOR_MOTOR_BASE || MOTOR_BASE).replace(/\/+$/, '');
  const url = base + '/models/' + encodeURIComponent(String(env.PROVADOR_MODELO)) + ':generateContent';
  const partes = [
    { text: e.prompt },
    { inline_data: { mime_type: 'image/jpeg', data: e.pessoa.toString('base64') } },
    { inline_data: { mime_type: 'image/jpeg', data: e.produto.toString('base64') } },
  ];
  const fim = Date.now() + LIM.motorMs;
  let ultimo = 'motor';
  for (const cfg of formasDoPedido(e.proporcao)) {
    const resta = fim - Date.now();
    if (resta < 4000) throw new Error('tempo');
    let r;
    try {
      r = await buscar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': String(env.PROVADOR_CHAVE) },
        body: JSON.stringify({ contents: [{ role: 'user', parts: partes }], generationConfig: cfg }),
      }, resta);
    } catch (err) { throw new Error(err && err.name === 'AbortError' ? 'tempo' : 'motor'); }
    if (r.status === 400) { ultimo = 'motor'; continue; }         // campo recusado: tenta a forma seguinte
    if (!r.ok) throw new Error('motor:' + r.status);
    let j = null;
    try { j = await r.json(); } catch (_) { throw new Error('motor'); }
    const img = imagemDaResposta(j);
    if (img && tipoImagem(img)) return img;
    throw new Error(bloqueioDaResposta(j) ? 'motor_bloqueio' : 'motor');
  }
  throw new Error(ultimo);
}

/* ---------------------------------------------------------------- imagem */
function sharpLib() { return require('sharp'); }

/* Foto do comprador pronta para o motor: virada pelo EXIF, sem metadados (some o GPS),
   no maximo `lado` pixels no lado maior, JPEG. */
async function prepararPessoa(buf, lado) {
  const sharp = sharpLib();
  const base = sharp(buf, { failOn: 'none', limitInputPixels: 40e6 }).rotate();
  const saida = await base.resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  return { buf: saida.data, l: saida.info.width, a: saida.info.height };
}
async function prepararProduto(buf) {
  const sharp = sharpLib();
  return sharp(buf, { failOn: 'none', limitInputPixels: 40e6 }).rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
}

/* Texto da marca: moviki.com.br/<apelido>. So letras que existem em provadorGlifos. */
function textoMarca(slug) {
  const s = String(slug || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  return 'moviki.com.br' + (s ? '/' + s : '');
}
/* Desenho (SVG) da marca d'agua, do tamanho exato da imagem: uma faixa escura suave
   embaixo e o texto em branco no canto. Letras como contorno, sem depender de fonte. */
function svgMarca(l, a, texto) {
  const tam = Math.max(14, Math.round(Math.min(l, a) * 0.034));
  let esc = tam / GLIFOS.em;
  const larguraTexto = (t, e) => { let w = 0; for (const ch of t) w += ((GLIFOS.g[ch] || GLIFOS.g[' '])[0]) * e; return w; };
  const desenho = (t, x, y, e) => {
    let out = '', cx = x;
    for (const ch of t) {
      const g = GLIFOS.g[ch] || GLIFOS.g[' '];
      if (g[1]) out += '<path transform="translate(' + cx.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + e.toFixed(5) + ',' + (-e).toFixed(5) + ')" d="' + g[1] + '"/>';
      cx += g[0] * e;
    }
    return out;
  };
  const margem = Math.round(tam * 0.9);
  const cabe = l - 2 * margem, largo = larguraTexto(texto, esc);
  if (largo > cabe) esc = esc * cabe / largo;               // apelido comprido: encolhe, nunca corta
  const y = a - margem;
  const faixa = Math.round(tam * 3.4);
  const selo = 'simulação por IA';
  const escSelo = esc * 0.62;
  const xSelo = l - margem - larguraTexto(selo, escSelo);
  const sobra = xSelo - margem - larguraTexto(texto, esc) > tam;   // os dois cabem na mesma linha?
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + l + '" height="' + a + '" viewBox="0 0 ' + l + ' ' + a + '">' +
    '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>' +
    '<rect x="0" y="' + (a - faixa) + '" width="' + l + '" height="' + faixa + '" fill="url(#f)"/>' +
    '<g fill="#000" fill-opacity="0.35">' + desenho(texto, margem + 1, y + 1, esc) + '</g>' +
    '<g fill="#fff" fill-opacity="0.94">' + desenho(texto, margem, y, esc) + '</g>' +
    (sobra ? '<g fill="#fff" fill-opacity="0.78">' + desenho(selo, xSelo, y, escSelo) + '</g>' : '') +
    '</svg>';
}
/* Deixa a imagem do motor do MESMO tamanho da foto do comprador (a barra de comparar
   precisa das duas alinhadas), carimba a marca e tira os metadados. */
async function finalizar(img, l, a, slug) {
  const sharp = sharpLib();
  const svg = Buffer.from(svgMarca(l, a, textoMarca(slug)));
  return sharp(img, { failOn: 'none', limitInputPixels: 40e6 })
    .resize({ width: l, height: a, fit: 'cover', position: 'centre' })
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

/* ---------------------------------------------------------------- a prova */
function padrao() {
  return { robo: chamarRobo, baixar: baixarProduto, motor: motorGoogle, prepararPessoa, prepararProduto, finalizar };
}
function falha(status, erro, extra) {
  return { status, json: Object.assign({ ok: false, erro, mensagem: MSG[erro] || '' }, extra || {}) };
}

/* b = corpo do pedido { uid, ci, pi, aparelho, aceite, foto }; ip = endereco de quem pediu.
   Devolve { status, json }. Nunca lanca. */
async function gerar(b, ip, deps, env) {
  deps = Object.assign(padrao(), deps || {});
  env = env || process.env;
  const v = validar(b);
  if (v.erro) return falha(400, v.erro);
  if (!ip) return falha(400, 'dados');
  const f = lerFoto(b && b.foto);
  if (f.erro) return falha(f.erro === 'foto_grande' ? 413 : 400, f.erro);

  // A foto e conferida ANTES da reserva: foto ruim nao gasta prova nem limite.
  const lado = Math.min(2048, Math.max(768, Number(env.PROVADOR_LADO) || LIM.ladoSaida));
  let pessoa;
  try { pessoa = await deps.prepararPessoa(f.buf, lado); } catch (_) { return falha(400, 'foto'); }
  if (Math.min(pessoa.l, pessoa.a) < LIM.ladoMin) return falha(400, 'foto_pequena');

  const res = await deps.robo('prova_reservar', { uid: v.uid, ci: v.ci, pi: v.pi, aparelho: v.aparelho, ip }, env);
  const rj = res.j || {};
  if (res.http !== 200 || rj.ok !== true || !rj.prova) {
    if (res.http >= 400 && res.http < 500 && res.http !== 401 && rj.erro) {
      return { status: res.http, json: { ok: false, erro: String(rj.erro), mensagem: String(rj.mensagem || MSG.parado) } };
    }
    return falha(503, 'robo');
  }

  const inicio = Date.now();
  const modelo = String(env.PROVADOR_MODELO || '');
  const devolver = async (motivo) => { await deps.robo('prova_concluir', { prova: rj.prova, ok: false, motivo: String(motivo).slice(0, 60), ms: Date.now() - inicio, motor: modelo }, env); };
  let saida;
  try {
    let produto;
    try { produto = await deps.prepararProduto(await deps.baixar(rj.foto)); }
    catch (_) { throw new Error('foto_produto'); }
    const bruta = await deps.motor({
      pessoa: pessoa.buf, produto, proporcao: proporcaoDe(pessoa.l, pessoa.a),
      prompt: promptDe(String(rj.tipo || ''), String(rj.produto || '')),
    }, env);
    try { saida = await deps.finalizar(bruta, pessoa.l, pessoa.a, rj.slug); }
    catch (_) { throw new Error('marca'); }
  } catch (err) {
    const cod = String((err && err.message) || 'motor').split(':')[0];
    await devolver((err && err.message) || 'motor');
    const erro = MSG[cod] ? cod : 'motor';
    return falha(erro === 'tempo' ? 504 : 502, erro, { devolvida: true });
  }
  // Sem marca d'agua a imagem nao sai: `finalizar` e o unico caminho ate aqui.
  await deps.robo('prova_concluir', { prova: rj.prova, ok: true, ms: Date.now() - inicio, motor: modelo }, env);
  return {
    status: 200,
    json: {
      ok: true, imagem: 'data:image/jpeg;base64,' + saida.toString('base64'),
      largura: pessoa.l, altura: pessoa.a, restam: Number(rj.restam) || 0,
      produto: String(rj.produto || ''), tipo: String(rj.tipo || ''),
    },
  };
}

module.exports = {
  VERSAO, LIM, TIPOS, MSG,
  parado, origens, origemOk, ipDe, tipoImagem, lerFoto, validar, proporcaoDe, promptDe,
  fotoProdutoOk, formasDoPedido, imagemDaResposta, bloqueioDaResposta,
  textoMarca, svgMarca, prepararPessoa, prepararProduto, finalizar,
  chamarRobo, baixarProduto, motorGoogle, gerar,
};
