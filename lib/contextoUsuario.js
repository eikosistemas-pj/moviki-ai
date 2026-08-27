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

const { admin, db } = require('./firebase');
const memoria = require('./memoria');
const oportunidade = require('./oportunidade');

function ms(t) {
  try { return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; } catch (_) { return 0; }
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
async function montarContexto(uid, email) {
  const linhas = [];
  // Guarda o retrato numerico da conta enquanto as linhas de texto sao
  // montadas. E daqui que o lib/oportunidade.js decide o que pode ser
  // proposto — sem ler o banco de novo.
  const retrato = {};
  linhas.push('E-mail da conta: ' + (email || 'nao informado'));
  linhas.push('Identificador interno (nunca repita para a pessoa): ' + uid);

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
    linhas.push('Fotos na galeria: ' + (Array.isArray(negocio.fotos) ? negocio.fotos.length : 0) + ' (limite 12)');
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
    if (assinatura.periodo) linhas.push('Periodicidade: ' + assinatura.periodo);
    if (assinatura.vence_em) linhas.push('Valido ate: ' + dataBr(assinatura.vence_em));
    if (assinatura.trial === true || assinatura.emTrial === true) linhas.push('Esta em periodo de teste (trial) — trial NAO gera comissao para quem indicou.');
  } else {
    linhas.push('Plano: Basico (nunca ativou plano pago nem trial).');
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

  // A funcao devolve o TEXTO e o id da oferta posta na mesa. O id volta
  // porque o api/chat.js precisa gravar QUAL oferta foi feita — sem isso,
  // um "nao" da pessoa na proxima mensagem nao teria a que se referir.
  return { texto: linhas.join('\n'), ofertaId: op ? op.id : '' };
}

module.exports = { montarContexto, nomePlano, reais, dataBr };
