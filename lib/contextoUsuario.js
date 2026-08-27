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
// TETO DE LEITURA: no maximo ~6 leituras + 2 consultas por pergunta. Sem
// isso, uma conversa longa vira conta de Firestore. As comissoes ja vem
// agregadas em numeros, nunca lista item a item.

const { db } = require('./firebase');

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

/* Monta o bloco de texto que entra no system prompt. Texto puro, curto,
   sem markdown: o painel renderiza a resposta como texto simples. */
async function montarContexto(uid, email) {
  const linhas = [];
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
    linhas.push('Fotos na galeria: ' + (Array.isArray(negocio.fotos) ? negocio.fotos.length : 0));
    if (!negocio.whatsapp) linhas.push('ATENCAO: nao ha WhatsApp cadastrado no negocio — o botao de contato da pagina publica nao aparece.');
  } else {
    linhas.push('');
    linhas.push('LOJISTA: nao tem negocio cadastrado.');
  }

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

  // ---- Lado PARCEIRO ----
  if (parceiro) {
    linhas.push('');
    linhas.push('PARCEIRO: sim.');
    linhas.push('Status do cadastro de parceiro: ' + (parceiro.status || 'desconhecido') +
      (parceiro.status === 'pendente' ? ' (ainda nao aprovado — nao gera nem saca comissao)' : ''));
    if (parceiro.slug) linhas.push('Link de indicacao: moviki.com.br/p/' + parceiro.slug + ' (para indicar comerciante) e moviki.com.br/pp/' + parceiro.slug + ' (para indicar outro parceiro)');
    linhas.push('Chave Pix cadastrada: ' + (parceiro.pix ? 'sim' : 'NAO — sem chave Pix o pagamento nao sai'));

    if (parceiro.status === 'aprovado') {
      const c = await resumoComissoes(uid);
      if (c) {
        linhas.push('Comissoes disponiveis para saque agora: ' + reais(c.disponivel));
        linhas.push('Comissoes ainda retidas (7 dias de retencao): ' + reais(c.retido));
        if (c.proximaLiberacaoMs) linhas.push('Proxima liberacao de comissao retida: ' + dataBrMs(c.proximaLiberacaoMs));
        linhas.push('Total ja recebido: ' + reais(c.recebido));
        linhas.push('Quantidade de comissoes geradas: ' + c.qtd + (c.truncado ? ' (ou mais)' : ''));
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

  return linhas.join('\n');
}

module.exports = { montarContexto, nomePlano, reais, dataBr };
