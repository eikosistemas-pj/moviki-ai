// lib/oportunidade.js  (repo: moviki-ai)
//
// O QUE O VIK PODE PROPOR — e, principalmente, QUANDO ELE NAO PODE.
//
// Funcao pura: entra o retrato da conta, sai NO MAXIMO uma oportunidade.
// Nao le banco, nao escreve nada, nao chama IA. Toda a decisao comercial do
// Vik mora aqui, num lugar so, para poder ser lida e discutida sem abrir o
// prompt.
//
// ------------------------------------------------------------------
// AS DUAS REGRAS QUE SUSTENTAM ISTO
// ------------------------------------------------------------------
// 1. ATIVACAO ANTES DE VENDA. Quem nao usa o que ja paga nao faz upgrade —
//    faz cancelamento. Entao um Pro com cardapio vazio recebe ajuda para
//    preencher o cardapio, nunca convite para o Premium. So sobe de plano
//    quem ja esta espremendo o plano atual.
//
// 2. GATILHO OBJETIVO OU NADA. Cada oportunidade exige um numero real do
//    contador ou um campo vazio no cadastro. Sem gatilho, devolve null e o
//    Vik nao oferece coisa nenhuma. Assistente que empurra plano em toda
//    conversa queima a confianca que o atendimento acabou de construir, e
//    confianca e a unica razao de o lojista abrir esta caixa.
//
// Quem barra o resto:
//   - oferta ja recusada nunca volta (lista `recusadas` da vik_memoria);
//   - conversa sobre dinheiro, cobranca, saque ou problema nao recebe oferta
//     nenhuma — isso e decidido no promptPainel.js, que ve o teor da
//     conversa; aqui a gente so escolhe QUAL seria a oferta.
//
// Mexer nos numeros abaixo muda a agressividade comercial do Vik inteiro.

// Visitas em 7 dias que provam que a pagina do Basico ja tem publico.
// Abaixo disso, oferecer Pro e vender relatorio para quem nao tem o que
// relatar.
const VISITAS_PARA_PRO = 20;

// Visitas em 14 dias que justificam falar de reputacao (avaliacoes) e marca
// propria no pino, que e o que o Premium entrega.
const VISITAS_PARA_PREMIUM = 60;

// Movimento que costuma vir de quem ja atende em mais de um lugar.
const VISITAS_PARA_ENTERPRISE = 150;

/* c = retrato da conta:
     { planoId, planoAtivo, temNegocio, temLocalizacao, temWhatsapp,
       itensCardapio, fotos, temHorario, ehParceiro, parceiroAprovado,
       comissoesQtd, temPix, views7, views14, recusadas: [ids] }         */
function escolher(c) {
  c = c || {};
  const recusadas = Array.isArray(c.recusadas) ? c.recusadas : [];
  const jaRecusou = (id) => recusadas.indexOf(id) >= 0;

  const plano = String(c.planoId || 'basico').toLowerCase();
  const pago = c.planoAtivo === true && plano !== 'basico';
  const cand = [];

  // ---------- ATIVACAO — sempre na frente de qualquer venda ----------

  // Sem localizacao o negocio simplesmente NAO EXISTE no mapa. E o defeito
  // mais grave possivel e o mais silencioso: o lojista acha que esta no ar.
  if (c.temNegocio && !c.temLocalizacao) {
    cand.push({
      id: 'ativar_localizacao',
      prioridade: 1,
      gatilho: 'negocio sem latitude/longitude definidas',
      proposta: 'A localizacao dela nao esta definida, entao o negocio NAO aparece no mapa. Explique que e so abrir a secao Localizacao do painel, marcar o ponto e salvar. Isto vem antes de qualquer outra coisa.',
    });
  }

  // Sem WhatsApp o botao de contato nao aparece: a pagina tem visita e nao
  // tem conversa.
  if (c.temNegocio && !c.temWhatsapp) {
    cand.push({
      id: 'ativar_whatsapp',
      prioridade: 2,
      gatilho: 'negocio sem numero de WhatsApp',
      proposta: 'Nao ha WhatsApp cadastrado, entao o botao de contato nao aparece para o cliente na pagina publica. Diga onde cadastrar (secao WhatsApp do painel) e o que isso destrava.',
    });
  }

  // Ja paga pelo cardapio e nao usa. Este e o perfil que cancela no mes
  // seguinte, e o mais barato de salvar.
  if (pago && Number(c.itensCardapio) === 0) {
    cand.push({
      id: 'ativar_cardapio',
      prioridade: 3,
      gatilho: 'plano pago com cardapio vazio',
      proposta: 'Ela paga por um plano que inclui cardapio e nao cadastrou nenhum item. Ofereca ajuda para montar o primeiro — sem cardapio o cliente nao sabe o que ela vende nem o preco.',
    });
  }

  // Parceiro aprovado com o link parado: dinheiro na mesa que ninguem pegou.
  if (c.parceiroAprovado && Number(c.comissoesQtd) === 0) {
    cand.push({
      id: 'ativar_parceiro',
      prioridade: 4,
      gatilho: 'parceiro aprovado sem nenhuma comissao gerada',
      proposta: 'O cadastro de parceiro dela esta aprovado mas nunca gerou comissao. Lembre do link de indicacao e de onde ele fica no painel do parceiro. Fale de como funciona, nunca de quanto ela pode ganhar.',
    });
  }

  // Parceiro sem chave Pix: mesmo gerando comissao, o pagamento nao sai.
  if (c.ehParceiro && !c.temPix) {
    cand.push({
      id: 'ativar_pix',
      prioridade: 4,
      gatilho: 'parceiro sem chave Pix cadastrada',
      proposta: 'Nao ha chave Pix no cadastro de parceiro dela — sem isso o pagamento de comissao nao sai. Diga onde cadastrar.',
    });
  }

  // ---------- VENDA — so com publico comprovado ----------

  if (plano === 'basico' && Number(c.views7) >= VISITAS_PARA_PRO) {
    cand.push({
      id: 'upgrade_pro',
      prioridade: 6,
      gatilho: c.views7 + ' visitas em 7 dias no plano Basico',
      proposta: 'A pagina dela ja tem publico de verdade. Comente o numero de visitas que ela JA TEM e explique que o Pro mostra quantos clicaram no WhatsApp, quantos pediram rota, o melhor dia e o horario de pico — alem de liberar cardapio, promocoes, eventos e fotos. Nao prometa aumento de venda.',
    });
  }

  if (plano === 'pro' && c.planoAtivo && Number(c.views14) >= VISITAS_PARA_PREMIUM) {
    cand.push({
      id: 'upgrade_premium',
      prioridade: 7,
      gatilho: c.views14 + ' visitas em 14 dias no plano Pro',
      proposta: 'Com esse movimento, reputacao passa a valer dinheiro: o Premium libera avaliacoes de clientes na pagina, logo propria no pino do mapa e cor personalizada. Cite o numero real de visitas dela.',
    });
  }

  if (plano === 'premium' && c.planoAtivo && Number(c.views14) >= VISITAS_PARA_ENTERPRISE) {
    cand.push({
      id: 'upgrade_enterprise',
      prioridade: 8,
      gatilho: c.views14 + ' visitas em 14 dias no plano Premium',
      proposta: 'Se ela atende em mais de um lugar, o Enterprise da ponto proprio com link, localizacao e WhatsApp separados (3 inclusos). PERGUNTE se ela atende em mais de um ponto antes de propor — nao afirme que atende.',
    });
  }

  // ---------- CADASTRO INCOMPLETO — o de menor prioridade ----------

  if (c.temNegocio && c.temLocalizacao && !c.temHorario) {
    cand.push({
      id: 'ativar_horario',
      prioridade: 9,
      gatilho: 'sem horario de funcionamento preenchido',
      proposta: 'O horario de funcionamento esta vazio. Cliente que abre a pagina e nao sabe se esta aberto costuma desistir. Fica na secao Informacoes.',
    });
  }

  if (pago && Number(c.fotos) === 0) {
    cand.push({
      id: 'ativar_fotos',
      prioridade: 10,
      gatilho: 'plano pago sem nenhuma foto na galeria',
      proposta: 'A galeria dela esta vazia e o plano ja inclui fotos. Perfil com foto passa mais confianca. Ate 12 fotos.',
    });
  }

  const viaveis = cand.filter((o) => !jaRecusou(o.id));
  if (!viaveis.length) return null;
  viaveis.sort((a, b) => a.prioridade - b.prioridade);
  return viaveis[0];
}

/* Vira o trecho que entra no prompt. O texto deixa explicito que e uma
   POSSIBILIDADE, nunca uma ordem de vender: quem decide se cabe naquela
   conversa e o Vik, lendo o teor do que a pessoa escreveu. */
function emTexto(op) {
  if (!op) return 'OPORTUNIDADE: nenhuma agora. Nao ofereca nada, so responda o que foi perguntado.';
  return 'OPORTUNIDADE (id ' + op.id + ')\n' +
    'Gatilho real: ' + op.gatilho + '\n' +
    'O que cabe propor: ' + op.proposta + '\n' +
    'Isto e uma possibilidade, nao uma ordem. Se a conversa for sobre problema, ' +
    'cobranca, saque ou documento, NAO proponha nada — resolva o que ela trouxe e pare.';
}

module.exports = { escolher, emTexto, VISITAS_PARA_PRO, VISITAS_PARA_PREMIUM, VISITAS_PARA_ENTERPRISE };
