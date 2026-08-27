// lib/memoria.js  (repo: moviki-ai)
//
// A MEMORIA DO VIK — vik_memoria/{uid}, um documento por conta.
//
// "Aprender" aqui NAO e a IA se retreinar. E memoria estruturada: o Vik
// guarda o que aquela pessoa contou sobre o negocio dela, o que ela ja
// perguntou e o que ela recusou — e le isso de volta na proxima conversa.
// Efeito pratico: o lojista nao precisa se reapresentar toda vez, e o Vik
// para de repetir oferta que ja levou nao.
//
// ------------------------------------------------------------------
// COMO O APRENDIZADO E EXTRAIDO — e por que assim
// ------------------------------------------------------------------
// Na MESMA chamada em que responde, o Vik acrescenta no fim da resposta um
// bloco marcado que o servidor arranca antes de gravar a mensagem. Isso
// custa alguns tokens de saida e nada mais.
//
// A alternativa seria uma segunda chamada de IA so para destilar, o que
// dobraria o custo e a latencia de cada mensagem para guardar tres linhas.
// Nao compensa.
//
// O RISCO da abordagem escolhida e um so: o bloco vazar para o lojista se o
// parsing falhar. Por isso a funcao limparResposta() e DEFENSIVA — ela corta
// tudo a partir do marcador de abertura, esteja o bloco bem formado, mal
// formado ou sem fechamento. Na duvida, corta. Perder um aprendizado e
// barato; mostrar tripa de prompt para o cliente, nao.
//
// ------------------------------------------------------------------
// PRIVACIDADE
// ------------------------------------------------------------------
// Aqui entra SO o que serve para atender melhor: fato sobre o NEGOCIO, tema
// perguntado, objecao comercial. Nunca documento, telefone de terceiro,
// dado bancario, chave Pix, nem nada que a pessoa tenha mandado como anexo.
// A instrucao correspondente esta no promptPainel.js, e os filtros abaixo
// sao a segunda barreira — prompt sozinho nao e trava.
//
// O dono do Moviki ve e apaga a memoria de qualquer conta pelo painel
// (eikoadm01), e a colecao inteira e invisivel para o lojista: a regra do
// Firestore so libera leitura para admin, e escrita para ninguem — quem
// grava e o Admin SDK, que ignora regras.

const { admin, db } = require('./firebase');

const ABRE = '<<<VIK';
const FECHA = 'VIK>>>';

// Tetos por lista. Memoria que cresce para sempre vira prompt caro e ruim:
// 40 fatos soltos confundem mais do que 10 bem escolhidos.
const MAX_FATOS = 10;
const MAX_TEMAS = 12;
const MAX_OBJECOES = 6;
const MAX_LINHA = 160;

// Palavras que NUNCA podem entrar na memoria, mesmo que a IA tente. Segunda
// barreira: o prompt ja proibe, mas prompt nao e trava de seguranca.
const PROIBIDO = /(\bcpf\b|\bcnpj\b|\brg\b|chave pix|\bpix\b.*\b(chave|copia)\b|cart[aã]o|\bcvv\b|senha|token|c[oó]digo de seguran[cç]a|ag[eê]ncia.*conta|\bboleto\b|n[uú]mero do cart)/i;

// Sequencias longas de digitos: telefone, documento, cartao, conta. Um fato
// util sobre o negocio nunca precisa de 8 numeros seguidos.
const MUITO_DIGITO = /\d[\d.\-\/\s]{7,}/;

function limpaLinha(v) {
  const s = String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LINHA);
  if (!s || s.length < 3) return '';
  if (PROIBIDO.test(s)) return '';
  if (MUITO_DIGITO.test(s)) return '';
  return s;
}

/* Corta o bloco de aprendizado da resposta. SEMPRE roda antes de gravar a
   mensagem, e sempre corta a partir do marcador de abertura — bloco sem
   fechamento tambem some inteiro. */
function limparResposta(texto) {
  const t = String(texto || '');
  const i = t.indexOf(ABRE);
  if (i < 0) return t.trim();
  return t.slice(0, i).trim();
}

/* Le o bloco e devolve o que der para aproveitar. Formato esperado:
     <<<VIK
     fato: roda com food truck em tres pontos fixos
     tema: metricas
     objecao: acha o Pro caro por enquanto
     oferta: recusada
     VIK>>>
   Linha desconhecida e ignorada. Bloco ausente devolve objeto vazio — o
   que e normal e nao e erro: nem toda mensagem ensina alguma coisa. */
function extrairAprendizado(texto) {
  const out = { fatos: [], temas: [], objecoes: [], oferta: '' };
  const t = String(texto || '');
  const i = t.indexOf(ABRE);
  if (i < 0) return out;
  let corpo = t.slice(i + ABRE.length);
  const f = corpo.indexOf(FECHA);
  if (f >= 0) corpo = corpo.slice(0, f);

  corpo.split('\n').forEach((linha) => {
    const m = String(linha).match(/^\s*(fato|tema|objecao|objeção|oferta)\s*:\s*(.+)$/i);
    if (!m) return;
    const chave = m[1].toLowerCase().replace('ç', 'c').replace('ã', 'a');
    const valor = limpaLinha(m[2]);
    if (!valor) return;
    if (chave === 'fato' && out.fatos.length < 4) out.fatos.push(valor);
    else if (chave === 'tema' && out.temas.length < 3) out.temas.push(valor.toLowerCase());
    else if (chave === 'objecao' && out.objecoes.length < 2) out.objecoes.push(valor);
    else if (chave === 'oferta') out.oferta = valor.toLowerCase();
  });
  return out;
}

async function ler(uid) {
  try {
    const s = await db.collection('vik_memoria').doc(uid).get();
    return s.exists ? (s.data() || {}) : null;
  } catch (e) {
    console.error('[memoria] falhou ler:', e && e.message);
    return null;
  }
}

/* Junta o novo com o velho SEM duplicar e respeitando o teto. O item novo
   entra no fim: quando estoura o teto, quem cai fora e o mais antigo — o
   negocio da pessoa muda com o tempo, e o recente vale mais. */
function juntar(antes, novos, teto) {
  const lista = Array.isArray(antes) ? antes.slice() : [];
  (novos || []).forEach((n) => {
    const chave = String(n).toLowerCase();
    if (lista.some((x) => String(x).toLowerCase() === chave)) return;
    lista.push(n);
  });
  return lista.slice(-teto);
}

/* Grava o aprendizado. NUNCA lanca: memoria e um bonus, e o atendimento nao
   pode cair porque a memoria falhou. Mesmo contrato do lib/ga.js e do
   lib/meta.js do robo. */
async function gravar(uid, aprendido, ofertaId) {
  try {
    const temAlgo = (aprendido.fatos.length || aprendido.temas.length ||
                     aprendido.objecoes.length || aprendido.oferta || ofertaId);
    if (!temAlgo) return false;

    const atual = (await ler(uid)) || {};
    const dados = {
      uid: uid,
      fatos: juntar(atual.fatos, aprendido.fatos, MAX_FATOS),
      temas: juntar(atual.temas, aprendido.temas, MAX_TEMAS),
      objecoes: juntar(atual.objecoes, aprendido.objecoes, MAX_OBJECOES),
      conversas: (Number(atual.conversas) || 0) + 1,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Oferta: o que foi POSTO NA MESA nesta resposta, e o que a pessoa fez
    // com a oferta anterior. Recusada entra numa lista propria e nunca mais
    // e oferecida — insistir em oferta recusada e o jeito mais rapido de
    // fazer o lojista parar de abrir o chat.
    if (ofertaId) {
      dados.ultimaOferta = String(ofertaId);
      dados.ultimaOfertaEm = admin.firestore.FieldValue.serverTimestamp();
    }
    if (aprendido.oferta === 'recusada' && atual.ultimaOferta) {
      dados.recusadas = juntar(atual.recusadas, [String(atual.ultimaOferta)], 12);
    }
    if (aprendido.oferta === 'aceita' && atual.ultimaOferta) {
      dados.aceitas = juntar(atual.aceitas, [String(atual.ultimaOferta)], 12);
    }

    await db.collection('vik_memoria').doc(uid).set(dados, { merge: true });
    return true;
  } catch (e) {
    console.error('[memoria] falhou gravar (ignorado):', e && e.message);
    return false;
  }
}

/* Vira texto para entrar no prompt. Curto de proposito: memoria longa demais
   empurra o prompt de verdade para longe e a IA passa a responder pela
   memoria em vez de pelos dados da conta. */
function emTexto(mem) {
  if (!mem) return '';
  const l = [];
  if (Array.isArray(mem.fatos) && mem.fatos.length) {
    l.push('O que esta pessoa ja contou sobre o negocio dela:');
    mem.fatos.forEach((f) => l.push('- ' + f));
  }
  if (Array.isArray(mem.temas) && mem.temas.length) {
    l.push('Assuntos que ela ja trouxe antes: ' + mem.temas.join(', ') + '.');
  }
  if (Array.isArray(mem.objecoes) && mem.objecoes.length) {
    l.push('Objecoes que ela ja deu:');
    mem.objecoes.forEach((o) => l.push('- ' + o));
  }
  if (Array.isArray(mem.recusadas) && mem.recusadas.length) {
    l.push('OFERTAS JA RECUSADAS (nao ofereca de novo): ' + mem.recusadas.join(', ') + '.');
  }
  if (Number(mem.conversas) > 0) {
    l.push('Ja conversou com voce ' + mem.conversas + ' vez(es) antes.');
  }
  return l.join('\n');
}

module.exports = { limparResposta, extrairAprendizado, ler, gravar, emTexto, ABRE, FECHA };
