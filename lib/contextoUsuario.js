// lib/contextoUsuario.js  (repo: moviki-ai)
//
// Monta o RESUMO da pessoa que esta falando no chat do painel. E isto que
// separa este atendente do atendente do WhatsApp: la a IA da Meta responde
// duvida generica de produto; aqui o robo sabe QUEM esta perguntando e
// responde "sua comissao de agosto e R$ 34,15 e libera dia 12".
//
// REGRA DE OURO: este arquivo SO LE. Nunca escreve em colecao financeira
// (assinaturas, comissoes, saques, parceiros) — quem escreve dinheiro e o
// moviki-robo, com Admin SDK. Aqui e leitura pura, com try/catch em tudo:
// colecao fora do ar nao pode derrubar o atendimento, so empobrece a
// resposta.
//
// CUSTO POR PERGUNTA: 3 documentos (negocio, assinatura, parceiro) + ate 14
// dias de metricas + 1 resumo de avaliacoes + as consultas de comissao, saque
// e pontos quando fazem sentido. Fica na casa de 20 leituras por resposta —
// o mesmo que o painel ja gasta a cada abertura, e o teto de 40 respostas por
// conta/dia do api/chat.js limita o estrago.
// As comissoes SEMPRE vem agregadas em numeros, nunca lista item a item, e o
// desempenho e UMA consulta ordenada pelo id do documento no lugar dos 14
// getDoc que o painel faz.
//
// ------------------------------------------------------------------
// ATUALIZACAO DE 13/09/2026 — O QUE ENTROU E POR QUE
// ------------------------------------------------------------------
// O contexto dizia se a pessoa era lojista e se era parceira, mas nao dizia
// DE QUAL PAINEL ela estava falando — e o prompt, que atende os dois lados
// pela mesma caixa, respondia com o mapa do lojista para todo mundo. Foi o
// que produziu, em 09/09, a resposta em que o Vik ofereceu "Fotos" e "Logo
// propria no pino" a um parceiro que perguntava do cracha.
// Entraram tambem os campos das rodadas de 03 a 12/09, que existiam no
// painel e nao chegavam ao robo: foto do parceiro, aulas concluidas, aceite
// da conduta, nivel, e do lado do lojista os videos, a capa e a logo.
// SEM LEITURA NOVA: tudo sai dos MESMOS tres documentos que ja eram lidos
// (negocios, assinaturas, parceiros). A unica leitura acrescentada e a de
// configuracoes/liveTermos, com cache de 5 minutos no modulo — sem ela o Vik
// nao tem como saber se aquele lojista enxerga o botao de live.

const { admin, db } = require('./firebase');
const memoria = require('./memoria');
const oportunidade = require('./oportunidade');

/* Converte para milissegundos qualquer uma das tres formas em que uma data
   chega neste projeto: Timestamp do Firestore (o normal), string ISO (o
   parceiro.aulasEm e gravado pelo painel com toISOString) e numero. Antes so
   entendia Timestamp e devolvia 0 para o resto — o efeito era o Vik dizer
   "concluiu o treinamento" sem a data, que e justamente o que o parceiro
   pergunta. */
function ms(t) {
  try {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t === 'number') return t;
    if (typeof t === 'string') {
      const n = Date.parse(t);
      return isNaN(n) ? 0 : n;
    }
    if (t instanceof Date) return t.getTime();
    return 0;
  } catch (_) { return 0; }
}
function dataBrMs(m) {
  if (!m) return '';
  const d = new Date(m);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}
function dataBr(t) { return dataBrMs(ms(t)); }
function reais(v) {
  const n = Number(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

/* Nome do plano em portugues de gente. O banco guarda 'pro'/'premium'/
   'enterprise'; o lojista nao conhece esses codigos. */
function nomePlano(p) {
  const m = { pro: 'Pró', premium: 'Premium', enterprise: 'Enterprise', basico: 'Básico' };
  return m[String(p || '').toLowerCase()] || 'Básico';
}

/* Modo Live: alem do plano (Premium/Enterprise), ha uma lista de beta
   fechado em configuracoes/liveTermos.liveBeta. Lista vazia = liberado para
   todo mundo que tem plano. Quem nao esta liberado NAO VE o botao — e o Vik
   precisa saber disso, senao manda a pessoa clicar num botao que nao existe
   na tela dela.
   Cache no escopo do modulo (a funcao serverless e reaproveitada): sem ele,
   seria +1 leitura em toda mensagem de toda conta. */
const LIVE_TTL_MS = 300000;
let _liveCache = { em: 0, beta: [], desligada: false };

async function estadoLive(uid) {
  const agora = Date.now();
  if (agora - _liveCache.em > LIVE_TTL_MS) {
    try {
      const s = await db.collection('configuracoes').doc('liveTermos').get();
      const d = (s.exists && s.data()) || {};
      _liveCache = {
        em: agora,
        beta: Array.isArray(d.liveBeta) ? d.liveBeta : [],
        desligada: d.liveDesligada === true,
      };
    } catch (e) {
      // Falhou a leitura: NAO afirme nada sobre a live. Melhor o Vik nao
      // falar do assunto do que mandar procurar um botao invisivel.
      console.error('[contexto] liveTermos (ignorado):', e && e.message);
      _liveCache = { em: agora, beta: null, desligada: false };
    }
  }
  if (_liveCache.beta === null) return null;
  if (_liveCache.desligada) return false;
  return _liveCache.beta.length === 0 || _liveCache.beta.indexOf(uid) >= 0;
}

/* Pecas da criadora (22/09/2026). SO para quem tem parceiros/{uid}.criador.
   Uma consulta, agregada: contagem por situacao, autorizacao vigente e os
   ultimos motivos de recusa (texto escrito pelo dono — entra como DADO).
   Nunca a URL do arquivo: o Vik nao precisa dela e ela e credencial. */
const CRIADOR_VALIDADE_MS = 365 * 24 * 3600 * 1000;
async function resumoPecasCriador(uid) {
  try {
    const qs = await db.collection('criador_pecas').where('uid', '==', uid).limit(100).get();
    const agora = Date.now();
    const r = { total: 0, aguardando: 0, aprovada: 0, recusada: 0, suspensa: 0,
                autorizadas: 0, semAutorizacao: 0, liberadas: 0, motivos: [], truncado: qs.size >= 100 };
    const recusas = [];
    qs.forEach((d) => {
      const x = d.data() || {};
      r.total++;
      if (r[x.status] !== undefined && typeof r[x.status] === 'number') r[x.status]++;
      const em = ms(x.autorizaRedesEm);
      const aut = x.autorizaRedes === true && em > 0 && !(ms(x.revogadaEm) > em) && agora < em + CRIADOR_VALIDADE_MS;
      if (aut) r.autorizadas++; else r.semAutorizacao++;
      if (aut && x.status === 'aprovada') r.liberadas++;
      if (x.status === 'recusada' && x.motivoRecusa) {
        recusas.push({ em: ms(x.avaliadaEm), titulo: String(x.titulo || 'sem titulo').slice(0, 60), motivo: String(x.motivoRecusa).slice(0, 200) });
      }
    });
    recusas.sort((a, b) => b.em - a.em);
    r.motivos = recusas.slice(0, 3);
    return r;
  } catch (_) { return null; }
}

/* Posts do robo social com peca da criadora (23/09/2026). O historico do robo
   mora no repositorio publico moviki-assistente-social (estado/historico.json),
   nao no Firestore. Sem isto o Vik respondia "liberada para sair" a quem
   perguntava "minha peca saiu?" — e ela JA tinha saido.
   Cache de 5 min no modulo; 3 s de limite. Falhou, devolve null e o Vik
   manda olhar Meus resultados — nunca inventa. */
const HIST_URL = 'https://raw.githubusercontent.com/eikosistemas-pj/moviki-assistente-social/main/estado/historico.json';
let histCache = { em: 0, dados: null };
async function historicoRobo() {
  if (histCache.dados && Date.now() - histCache.em < 5 * 60000) return histCache.dados;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 3000);
  try {
    const r = await fetch(HIST_URL, { signal: ctl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const lista = Array.isArray(d) ? d : [];
    histCache = { em: Date.now(), dados: lista };
    return lista;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
const NOME_FORMATO = { feed: 'post no feed', story: 'story', reel: 'reel' };
const NOME_REDE = { facebook: 'Pagina do Facebook', instagram: 'Instagram' };
async function postsDaCriadora(uid) {
  const h = await historicoRobo();
  if (!h) return null;
  const meus = h.filter((x) => x && x.origem === 'criador' && x.criador === uid)
    .sort((a, b) => String(b.quando || '').localeCompare(String(a.quando || '')));
  return { total: meus.length, ultimos: meus.slice(0, 3) };
}

async function lerDoc(colecao, id) {
  try {
    const s = await db.collection(colecao).doc(id).get();
    return s.exists ? (s.data() || {}) : null;
  } catch (e) {
    console.error('[contexto] falhou ler ' + colecao + '/' + id + ':', e && e.message);
    return null;
  }
}

/* Comissoes: SEMPRE agregadas. Um parceiro com centenas de comissoes nao
   pode virar centenas de linhas no prompt — nem em custo de token nem em
   leitura. Os tres numeros que a pessoa realmente pergunta:
     disponivel = nao paga, nao estornada, ja passou da retencao de 7 dias
     retido     = nao paga, nao estornada, ainda dentro dos 7 dias
     recebido   = ja paga
   A data da PROXIMA liberacao vai junto, porque "quando cai?" e a pergunta
   numero 1 do parceiro. */
async function resumoComissoes(uid) {
  try {
    const qs = await db.collection('comissoes').where('parceiroUid', '==', uid).limit(500).get();
    const agora = Date.now();
    let disponivel = 0, retido = 0, recebido = 0, qtd = 0, proxima = 0;
    qs.forEach((d) => {
      const c = d.data() || {};
      if (c.estornada) return;
      qtd++;
      const v = Number(c.valor) || 0;
      if (c.pago) { recebido += v; return; }
      const lib = ms(c.liberaEm);
      if (lib && lib > agora) {
        retido += v;
        if (!proxima || lib < proxima) proxima = lib;
      } else {
        disponivel += v;
      }
    });
    return {
      qtd,
      disponivel: Math.round(disponivel * 100) / 100,
      retido: Math.round(retido * 100) / 100,
      recebido: Math.round(recebido * 100) / 100,
      proximaLiberacaoMs: proxima || 0,
      truncado: qs.size >= 500,
    };
  } catch (e) {
    console.error('[contexto] comissoes:', e && e.message);
    return null;
  }
}

/* Ultimo saque: so o mais recente. Historico inteiro nao ajuda a responder
   e custa leitura. Sem orderBy de proposito — ordenar por 'pedidoEm' exigiria
   indice composto com o where, e indice faltando derruba a consulta calada. */
async function ultimoSaque(uid) {
  try {
    const qs = await db.collection('saques').where('parceiroUid', '==', uid).limit(30).get();
    let melhor = null, melhorMs = -1;
    qs.forEach((d) => {
      const s = d.data() || {};
      const m = ms(s.pedidoEm);
      if (m > melhorMs) { melhorMs = m; melhor = Object.assign({ id: d.id }, s); }
    });
    return melhor;
  } catch (e) {
    console.error('[contexto] saques:', e && e.message);
    return null;
  }
}


const DIAS_SEM = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

/* DESEMPENHO — metricas/{uid}/dias/{AAAA-MM-DD}.
   O painel le 14 documentos, um por dia, com 14 getDoc. Aqui e UMA consulta
   ordenada pelo id do documento (que e a propria data, em AAAA-MM-DD, entao
   ordem alfabetica = ordem cronologica). 1 consulta no lugar de 14 leituras.

   A TRAVA DE PLANO E COPIADA DO PAINEL, de proposito. Basico ve so as visitas
   dos ultimos 7 dias; Pro pra cima ve os 4 numeros, 14 dias, melhor dia e
   horario de pico. Se o robo contasse tudo para o Basico, ele viraria um
   atalho para furar a trava — e o "Seu desempenho" trancado e justamente o
   melhor argumento de venda do Pro. */
async function desempenho(uid, liberado) {
  try {
    const qs = await db.collection('metricas').doc(uid).collection('dias')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(14).get();
    if (qs.empty) return { vazio: true };

    let views = 0, whats = 0, rota = 0, card = 0, views7 = 0;
    const porSemana = [0,0,0,0,0,0,0], faixas = new Array(12).fill(0);
    let i = 0;
    qs.forEach((d) => {
      const x = d.data() || {};
      const v = Number(x.views || 0);
      views += v; whats += Number(x.whats || 0);
      rota += Number(x.rota || 0); card += Number(x.cardapio || 0);
      if (i < 7) views7 += v;                       // a consulta vem do mais novo
      const partes = String(d.id).split('-');
      if (partes.length === 3) {
        const dia = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        porSemana[dia.getDay()] += v;
      }
      for (let b = 0; b < 12; b++) faixas[b] += Number(x['b' + b] || 0);
      i++;
    });

    if (!liberado) return { basico: true, views7 };

    let melhorD = 0; for (let k = 1; k < 7; k++) if (porSemana[k] > porSemana[melhorD]) melhorD = k;
    let melhorF = 0; for (let k = 1; k < 12; k++) if (faixas[k] > faixas[melhorF]) melhorF = k;
    return {
      views, whats, rota, card, views7,
      melhorDia: DIAS_SEM[melhorD],
      pico: (melhorF * 2) + 'h as ' + (melhorF * 2 + 2) + 'h',
      temMovimento: (views + whats + rota + card) > 0,
    };
  } catch (e) {
    console.error('[contexto] metricas:', e && e.message);
    return null;
  }
}

/* Nota media do negocio. Vem do documento de RESUMO, nunca da lista de
   avaliacoes — ler avaliacao por avaliacao foi exatamente o custo que a
   Fase 6 matou. */
async function notaMedia(uid) {
  try {
    const s = await db.collection('negocios').doc(uid).collection('resumo').doc('avaliacoes').get();
    if (!s.exists) return null;
    const d = s.data() || {};
    const n = Number(d.n || 0), soma = Number(d.soma || 0);
    if (!n) return null;
    return { n, media: Math.round((soma / n) * 10) / 10 };
  } catch (e) { return null; }
}

/* Pontos do Enterprise. ownerUid e o campo, igual ao pontos.js do robo. */
async function pontosDoDono(uid) {
  try {
    const qs = await db.collection('pontos').where('ownerUid', '==', uid).limit(30).get();
    let ativos = 0;
    const nomes = [];
    qs.forEach((d) => {
      const x = d.data() || {};
      if (x.ativo === true) ativos++;
      if (nomes.length < 10 && x.nome) nomes.push(x.nome);
    });
    return { total: qs.size, ativos, nomes };
  } catch (e) { return null; }
}

/* Monta o bloco de texto que entra no system prompt. Texto puro, curto,
   sem markdown: o painel renderiza a resposta como texto simples. */
async function montarContexto(uid, email, opcoes) {
  const opts = (opcoes && typeof opcoes === 'object') ? opcoes : {};
  const linhas = [];
  // Guarda o retrato numerico da conta enquanto as linhas de texto sao
  // montadas. E daqui que o lib/oportunidade.js decide o que pode ser
  // proposto — sem ler o banco de novo.
  const retrato = {};
  let criador = false;
  linhas.push('E-mail da conta: ' + (email || 'nao informado'));
  linhas.push('Identificador interno (nunca repita para a pessoa): ' + uid);
  // De qual das duas caixas de mensagem esta pergunta saiu. O painel manda no
  // corpo do pedido; painel antigo (antes de 13/09) nao manda nada, e ai o
  // papel e deduzido logo abaixo, pelos documentos da conta.
  if (opts.painel === 'parceiro') {
    linhas.push('PAINEL DE ONDE ELA ESTA FALANDO AGORA: painel do PARCEIRO. Responda com as telas do painel do parceiro.');
  } else if (opts.painel === 'lojista') {
    linhas.push('PAINEL DE ONDE ELA ESTA FALANDO AGORA: painel do NEGOCIO (lojista). Responda com as telas do painel do lojista.');
  } else {
    linhas.push('PAINEL DE ONDE ELA ESTA FALANDO AGORA: nao informado. Se a duvida servir para os dois lados, pergunte se e no painel do negocio ou no de parceiro antes de dar o caminho.');
  }

  const [negocio, assinatura, parceiro] = await Promise.all([
    lerDoc('negocios', uid),
    lerDoc('assinaturas', uid),
    lerDoc('parceiros', uid),
  ]);

  // ---- Lado LOJISTA ----
  if (negocio) {
    linhas.push('');
    linhas.push('LOJISTA: sim.');
    if (negocio.nome) linhas.push('Nome do negocio: ' + negocio.nome);
    if (negocio.slug) linhas.push('Link publico: moviki.com.br/' + negocio.slug);
    if (negocio.status) linhas.push('Status no mapa agora: ' + negocio.status);
    if (negocio.segmento) linhas.push('Segmento: ' + negocio.segmento);
    linhas.push('Cardapio cadastrado: ' + (Array.isArray(negocio.cardapio) && negocio.cardapio.length ? negocio.cardapio.length + ' itens' : 'nenhum item ainda'));
    linhas.push('Promocoes cadastradas: ' + (Array.isArray(negocio.promocoes) ? negocio.promocoes.length : 0));
    linhas.push('Eventos na agenda: ' + (Array.isArray(negocio.eventos) ? negocio.eventos.length : 0));
    linhas.push('Fotos na galeria: ' + (Array.isArray(negocio.fotos) ? negocio.fotos.length : 0) + ' (limite 12; fotos aparecem no site a partir do Premium)');
    linhas.push('Videos cadastrados (links de YouTube, Instagram ou TikTok): ' + (Array.isArray(negocio.videos) ? negocio.videos.length : 0) + ' (limite 6; recurso Premium)');
    linhas.push('Foto de capa da pagina: ' + (negocio.capa ? 'definida' : 'nao definida — sem capa o site usa a 1a foto da galeria') + ' (recurso Premium)');
    linhas.push('Logo propria no pino do mapa: ' + (negocio.markerLogo ? 'enviada' : 'nao enviada') + ' (recurso Premium; da para enviar antes de assinar)');
    if (negocio.recado) linhas.push('Recado do dia preenchido: sim');
    linhas.push('Horario de funcionamento preenchido: ' + (negocio.horario ? 'sim' : 'nao'));
    linhas.push('Endereco escrito preenchido: ' + (negocio.endereco ? 'sim' : 'nao'));
    linhas.push('Localizacao no mapa: ' + ((negocio.lat && negocio.lng) ? 'definida' : 'NAO definida — sem ela o negocio nao aparece no mapa'));
    if (!negocio.whatsapp) linhas.push('ATENCAO: nao ha WhatsApp cadastrado no negocio — o botao de contato da pagina publica nao aparece.');
    else linhas.push('WhatsApp cadastrado: sim');
    retrato.temNegocio = true;
    retrato.temLocalizacao = !!(negocio.lat && negocio.lng);
    retrato.temWhatsapp = !!negocio.whatsapp;
    retrato.temHorario = !!negocio.horario;
    retrato.itensCardapio = Array.isArray(negocio.cardapio) ? negocio.cardapio.length : 0;
    retrato.fotos = Array.isArray(negocio.fotos) ? negocio.fotos.length : 0;
  } else {
    linhas.push('');
    linhas.push('LOJISTA: nao tem negocio cadastrado.');
  }

  const planoId = String((assinatura && assinatura.plano) || 'basico').toLowerCase();
  const planoAtivo = !!(assinatura && assinatura.ativo === true);
  // Mesma regra do painel: Pro, Premium e Enterprise ATIVOS liberam o
  // desempenho completo. Basico (ou plano vencido) ve so as visitas de 7 dias.
  const desempLiberado = planoAtivo && ['pro','premium','enterprise'].indexOf(planoId) >= 0;
  retrato.planoId = planoId;
  retrato.planoAtivo = planoAtivo;

  if (assinatura) {
    const plano = nomePlano(assinatura.plano);
    const ativo = assinatura.ativo === true;
    linhas.push('Plano: ' + plano + (ativo ? ' ATIVO' : ' INATIVO (caiu para o Basico)'));
    if (assinatura.periodo) linhas.push('Periodicidade: ' + (assinatura.periodo === 'trial' ? 'teste gratis de 30 dias' : assinatura.periodo));
    if (assinatura.vence_em) linhas.push('Valido ate: ' + dataBr(assinatura.vence_em));
    if (assinatura.trial === true || assinatura.emTrial === true) linhas.push('Esta em periodo de teste gratis — periodo de teste NAO gera comissao para quem indicou.');
  } else {
    linhas.push('Plano: Basico (nunca ativou plano pago nem o teste gratis).');
  }

  // ---- DESEMPENHO DA PAGINA (so faz sentido se ha negocio) ----
  if (negocio) {
    const [d, nota] = await Promise.all([desempenho(uid, desempLiberado), notaMedia(uid)]);
    linhas.push('');
    if (!d || d.vazio) {
      linhas.push('DESEMPENHO: ainda nao ha nenhuma visita registrada na pagina publica.');
    } else if (d.basico) {
      linhas.push('DESEMPENHO (plano Basico — o painel so mostra 7 dias):');
      linhas.push('Visitas na pagina nos ultimos 7 dias: ' + d.views7);
      retrato.views7 = d.views7; retrato.views14 = d.views7;
      linhas.push('TRAVA DE PLANO: cliques no WhatsApp, pedidos de rota, aberturas do cardapio, melhor dia da semana e horario de pico ficam TRANCADOS no Basico. Voce SABE esses numeros, mas NAO PODE dize-los — o painel mostra borrado de proposito. Se perguntarem, diga que esses dados existem e sao liberados a partir do plano Pro.');
    } else {
      linhas.push('DESEMPENHO (ultimos 14 dias, numeros reais do contador):');
      linhas.push('Visitas na pagina publica: ' + d.views + ' (sendo ' + d.views7 + ' nos ultimos 7 dias)');
      retrato.views7 = d.views7; retrato.views14 = d.views;
      linhas.push('Clicaram no botao de WhatsApp: ' + d.whats);
      linhas.push('Pediram a rota no mapa: ' + d.rota);
      linhas.push('Abriram o cardapio: ' + d.card);
      linhas.push('Melhor dia da semana: ' + d.melhorDia);
      linhas.push('Horario de pico: ' + d.pico);
      if (!d.temMovimento) linhas.push('OBS: nenhum movimento registrado ainda no periodo.');
    }
    if (nota) {
      linhas.push('Avaliacoes de clientes: nota media ' + String(nota.media).replace('.', ',') + ' em ' + nota.n + ' avaliacao(oes).');
    } else {
      linhas.push('Avaliacoes de clientes: nenhuma ainda.');
    }
  }

  // ---- MODO LIVE ----
  if (negocio) {
    const podeLive = await estadoLive(uid);
    const planoLive = planoAtivo && ['premium', 'enterprise'].indexOf(planoId) >= 0;
    if (podeLive === null) {
      // Nao deu para conferir: nao afirme nada sobre a live.
      linhas.push('MODO LIVE: nao foi possivel conferir agora. Nao afirme se ela tem ou nao tem o botao; se ela perguntar, peca para ela dizer se ve o botao "Fazer live" no Inicio.');
    } else if (!planoLive) {
      linhas.push('MODO LIVE: nao liberado para esta conta (a live e do Premium e do Enterprise; as ferramentas de venda dentro da live sao do Enterprise). Ela NAO ve o botao "Fazer live".');
    } else if (!podeLive) {
      linhas.push('MODO LIVE: o plano dela permite, mas a conta ainda nao entrou na abertura gradual — ela NAO ve o botao "Fazer live". Diga que a live esta sendo aberta aos poucos e que voce anota o interesse dela por aqui. Nao mande procurar o botao.');
    } else {
      linhas.push('MODO LIVE: liberado para esta conta. O botao "Fazer live" aparece no Inicio, na grade Ferramentas, e no botao redondo do meio no celular.');
    }
  }

  // ---- PONTOS (Enterprise) ----
  if (negocio && planoId === 'enterprise' && planoAtivo) {
    const p = await pontosDoDono(uid);
    if (p) {
      linhas.push('');
      linhas.push('PONTOS (multi-ponto Enterprise): ' + p.total + ' cadastrado(s), ' + p.ativos + ' ativo(s). 3 pontos estao inclusos no plano; do 4o em diante sao R$ 19,90/mes cada.');
      if (p.nomes.length) linhas.push('Nomes dos pontos: ' + p.nomes.join(', '));
    }
  }

  // ---- Lado PARCEIRO ----
  if (parceiro) {
    linhas.push('');
    linhas.push('PARCEIRO: sim.');
    linhas.push('Status do cadastro de parceiro: ' + (parceiro.status || 'desconhecido') +
      (parceiro.status === 'pendente' ? ' (ainda nao aprovado — nao gera nem saca comissao)' : ''));
    if (parceiro.slug) linhas.push('Link de indicacao: moviki.com.br/p/' + parceiro.slug + ' (para indicar comerciante) e moviki.com.br/pp/' + parceiro.slug + ' (para indicar outro parceiro)');
    linhas.push('Chave Pix cadastrada: ' + (parceiro.pix ? 'sim' : 'NAO — sem chave Pix o pagamento nao sai'));
    if (parceiro.arroba) linhas.push('@ do Instagram no cadastro: @' + String(parceiro.arroba).replace(/^@/, '') + ' (nao e editavel pelo painel)');
    linhas.push('Foto propria enviada em Meus dados: ' + (parceiro.foto
      ? 'sim — e ela que aparece no cracha e na pagina de verificacao'
      : 'nao — o cracha esta usando a foto do Instagram dela ou a inicial do nome. Caminho para trocar: Meus dados, bloco "Sua foto", botao "Trocar foto".'));

    // Aulas: o total publicado vive no painel, nao aqui. Por isso o texto fala
    // de CONCLUIU ou NAO, nunca de "N de 12" — numero errado sobre trava e
    // pior do que numero nenhum.
    const aulasVistas = Array.isArray(parceiro.aulasVistas) ? parceiro.aulasVistas.length : 0;
    if (parceiro.aulasEm) {
      linhas.push('Treinamento (as aulas): CONCLUIDO em ' + (dataBr(parceiro.aulasEm) || 'data registrada') + '. O link de indicacao esta liberado e nunca mais tranca — aula nova nao retranca ninguem, so deixa o selo com pendencia.');
    } else {
      linhas.push('Treinamento (as aulas): NAO concluido (' + aulasVistas + ' aula(s) marcada(s) como assistida). Enquanto nao terminar, a secao Divulgacao fica trancada: link de indicacao, cracha e download do material de apoio nao abrem. Caminho: botao "Ver as aulas".');
    }

    // Aceite da conduta: a outra porta da Divulgacao. Sem ele, os botoes
    // existem na tela mas ficam desabilitados — e a pessoa jura que o painel
    // esta com defeito.
    const cond = parceiro.aceiteConduta && parceiro.aceiteConduta.versao;
    linhas.push('Compromisso de divulgacao ("Li e concordo", na secao Divulgacao): ' + (cond
      ? 'aceito'
      : 'NAO aceito — por isso os botoes de copiar o link, o "Baixar como imagem" do cracha e o download do material ficam desabilitados.'));

    if (parceiro.nivelNome || parceiro.nivel) {
      linhas.push('Nivel do parceiro: ' + (parceiro.nivelNome || parceiro.nivel) +
        (typeof parceiro.nivelAtivos === 'number' ? ' (' + parceiro.nivelAtivos + ' cliente(s) indicado(s) pagando no mes)' : '') +
        '. O nivel e recalculado mes a mes e conta so indicado direto pagante.');
    } else {
      linhas.push('Nivel do parceiro: ainda sem nivel — a primeira indicacao pagante abre o Bronze.');
    }
    // ---- CRIADORA (22/09/2026) ----
    if (parceiro.criador === true) {
      criador = true;
      linhas.push('');
      linhas.push('CRIADOR: sim — tem a Area do criador no painel de parceiro.');
      if (parceiro.slug) linhas.push('Link de criador: moviki.com.br/c/' + parceiro.slug);
      const pc = await resumoPecasCriador(uid);
      if (pc) {
        linhas.push('Pecas enviadas: ' + pc.total + (pc.truncado ? ' (ou mais)' : '') +
          ' · em analise: ' + pc.aguardando + ' · aprovadas: ' + pc.aprovada +
          ' · recusadas: ' + pc.recusada + ' · suspensas: ' + pc.suspensa + '.');
        linhas.push('Autorizacao para as redes: ' + pc.autorizadas + ' autorizada(s) em vigor, ' +
          pc.semAutorizacao + ' sem autorizacao (nunca autorizou, revogou ou venceu).');
        linhas.push('Liberadas para o robo (aprovada E autorizada): ' + pc.liberadas +
          '. Dia e hora de publicacao sao do robo — nao existe data marcada.');
        pc.motivos.forEach((m) => {
          linhas.push('Recusa: peca "' + m.titulo + '"' + (m.em ? ' em ' + dataBrMs(m.em) : '') + ' — motivo escrito pela equipe: ' + m.motivo);
        });
      } else {
        linhas.push('Pecas: nao consegui ler agora — oriente pela aba Minhas pecas.');
      }
      const po = await postsDaCriadora(uid);
      if (po) {
        if (po.total) {
          linhas.push('Posts JA PUBLICADOS pelo Moviki com peca dela: ' + po.total + '.');
          po.ultimos.forEach((x) => {
            linhas.push('Publicado: ' + (NOME_FORMATO[x.formato] || x.formato || 'post') + ' na ' +
              (NOME_REDE[x.rede] || x.rede || 'rede do Moviki') + ' em ' + (dataBr(x.quando) || 'data registrada') +
              (x.descricao ? ' — "' + String(x.descricao).slice(0, 60) + '"' : '') + '.');
          });
          linhas.push('Story fica no ar 24 horas e depois some da rede; post de feed e reel ficam.');
        } else {
          linhas.push('Posts ja publicados pelo Moviki com peca dela: nenhum ainda.');
        }
      } else {
        linhas.push('Posts ja publicados: nao consegui consultar agora — mande ver em Meus resultados, bloco "Posts do Moviki com peca sua".');
      }
    } else {
      linhas.push('CRIADOR: nao — a Area do criador nao aparece para esta pessoa. O acesso de criador e liberado pela equipe.');
    }

    retrato.ehParceiro = true;
    retrato.temPix = !!parceiro.pix;
    retrato.parceiroAprovado = parceiro.status === 'aprovado';

    if (parceiro.status === 'aprovado') {
      const c = await resumoComissoes(uid);
      if (c) {
        linhas.push('Comissoes disponiveis para saque agora: ' + reais(c.disponivel));
        linhas.push('Comissoes ainda retidas (7 dias de retencao): ' + reais(c.retido));
        if (c.proximaLiberacaoMs) linhas.push('Proxima liberacao de comissao retida: ' + dataBrMs(c.proximaLiberacaoMs));
        linhas.push('Total ja recebido: ' + reais(c.recebido));
        linhas.push('Quantidade de comissoes geradas: ' + c.qtd + (c.truncado ? ' (ou mais)' : ''));
        retrato.comissoesQtd = c.qtd;
        if (c.disponivel < 20) linhas.push('OBS: o minimo para pedir saque e R$ 20,00 — esta pessoa ainda nao atingiu.');
      }
      const s = await ultimoSaque(uid);
      if (s) {
        linhas.push('Ultimo saque: ' + reais(s.valorSolicitado) + ', status "' + (s.status || '?') + '", pedido em ' + (dataBr(s.pedidoEm) || 'data desconhecida') + '.');
      } else {
        linhas.push('Ultimo saque: nunca pediu saque.');
      }
    }
  } else {
    linhas.push('');
    linhas.push('PARCEIRO: nao esta no Programa de Parceiros.');
  }

  // ---- MEMORIA DO VIK (o que ele ja aprendeu desta pessoa) ----
  const mem = await memoria.ler(uid);
  const memTexto = memoria.emTexto(mem);
  if (memTexto) {
    linhas.push('');
    linhas.push('=== MEMORIA: CONVERSAS ANTERIORES COM ESTA PESSOA ===');
    linhas.push(memTexto);
  }

  // ---- OPORTUNIDADE (no maximo uma, e so com gatilho real) ----
  retrato.recusadas = (mem && Array.isArray(mem.recusadas)) ? mem.recusadas : [];
  const op = oportunidade.escolher(retrato);
  linhas.push('');
  linhas.push(oportunidade.emTexto(op));

  // A funcao devolve o TEXTO, o id da oferta posta na mesa e o PAPEL. O id
  // volta porque o api/chat.js precisa gravar QUAL oferta foi feita — sem
  // isso, um "nao" da pessoa na proxima mensagem nao teria a que se referir.
  // O papel volta porque e ele que escolhe QUAL painel sera descrito no
  // prompt quando o navegador nao informar de onde veio a pergunta.
  const papel = (negocio && parceiro) ? 'ambos'
    : parceiro ? 'parceiro'
    : negocio ? 'lojista'
    : 'nenhum';

  return { texto: linhas.join('\n'), ofertaId: op ? op.id : '', papel: papel, criador: criador };
}

module.exports = { montarContexto, nomePlano, reais, dataBr };
