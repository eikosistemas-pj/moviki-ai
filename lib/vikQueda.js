// lib/vikQueda.js  (repo: moviki-ai) | 16/10/2026 vikqueda
//
// O VIK NUNCA MAIS FICA MUDO.
//
// POR QUE EXISTE — 16/10/2026
// Em 15/10 uma lojista real (teste gratis, e-mail ainda nao confirmado) fez 7
// perguntas seguidas. O Vik respondeu 5 e, na 6a ("Quero" fazer a live) e na
// 7a ("Como faco pra fazer a live no moviki"), saiu calado: bateu o teto de
// respostas de quem nao confirmou o e-mail. Ela ficou sem resposta no momento
// de maior vontade de usar o produto, e o dono nao soube de nada.
//
// Toda saida do api/chat.js que deixava a pergunta da pessoa sem resposta
// (teto do dia, teto global, IA fora do ar, resposta vazia, erro interno)
// passa a gravar UMA resposta pronta, escrita aqui, que:
//   1. diz o que aconteceu, sem jargao;
//   2. leva a pessoa ao lugar certo do painel para ela seguir sozinha;
//   3. avisa que alguem do Moviki responde por ali.
// E a conversa acende "o Vik foi barrado aqui — responda voce" no painel do
// dono (campo botFiltro, que o eikoadm01.html ja le desde 23/09).
//
// Texto pronto NAO chama a Anthropic: custo zero, entao pode existir mesmo
// quando o teto que protege a verba ja estourou.
//
// Tudo aqui e funcao pura (sem Firestore, sem rede) para ter teste de verdade:
// ver lib/vikQueda.test.js.

/* Motivos que viram resposta pronta. O valor vai para conversas/{uid}.botFiltro
   (string, a regra do Firestore so pede isso) e o painel do dono mostra o
   texto da tabela CV_MOTIVO, ou o proprio motivo com espacos no lugar de _. */
const MOTIVOS = ['limite_sem_email', 'limite_dia', 'teto_global', 'ia_indisponivel', 'resposta_vazia', 'erro_interno'];

/* Os motivos de TETO mandam a resposta pronta uma vez por dia (UTC); as
   mensagens seguintes do mesmo dia so reacendem o aviso do dono. Repetir o
   mesmo texto a cada mensagem seria spam e a pessoa entenderia que e robo
   quebrado. Os motivos de FALHA respondem a cada mensagem, a menos que a
   ultima resposta do Vik ja tenha sido essa mesma queda. */
const DE_TETO = { limite_sem_email: true, limite_dia: true, teto_global: true };

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* Caminho no painel para o assunto da pergunta. So caminhos que existem hoje,
   conferidos em lib/catalogoPainel.js (marca do lojista 2026-10-15-ramodepois).
   A ordem importa: a primeira regra que casa vence. */
const CAMINHOS_LOJISTA = [
  { re: /\blive|ao vivo|transmi|ensaio|estudio/,
    txt: 'Para fazer a live: no Início, toque em Ferramentas > "Fazer live" (no celular, é o botão redondo do meio da barra de baixo).',
    semEmail: ' O ensaio, que ninguém vê, já está liberado. A live aberta aos seus clientes pede o e-mail confirmado.' },
  { re: /\bpix\b|receb|financeiro|pagamento do cliente|cair na (minha )?conta/,
    txt: 'Para receber as vendas pelo Pix: menu Financeiro.' },
  { re: /pedido|entrega|frete|motoboy|separar/,
    txt: 'Seus pedidos ficam em Pedidos, o botão laranja da barra de baixo (Central de Pedidos).' },
  { re: /cardapio|produto|catalogo|foto d[oe] produto|preco d[oe]/,
    txt: 'Para cadastrar seus produtos: menu Cardápio, botões "+ Categoria" e "+ Produto".' },
  { re: /\bplano|assinar|assinatura|mensalidade|quanto custa|premium|enterprise|\bpro\b/,
    txt: 'Os planos e a assinatura ficam em Meu Plano.' },
  { re: /whats|\bzap\b|watts|\bwpp\b/,
    txt: 'O número que aparece para os seus clientes fica em WhatsApp, no menu.' },
  { re: /\blink\b|divulg|compartilh|\bqr\b/,
    txt: 'Seu link para divulgar fica no Início, em "Seu link pra divulgar" (botões Copiar e Ver página).' },
  { re: /mapa|localiza|endereco|aberto|fechado/,
    txt: 'Para aparecer no mapa: no Início, cartão "Seu negócio no mapa", botões Aberto e Fechado; o endereço fica em Localização.' },
];
const CAMINHO_PADRAO_LOJISTA = 'Cada parte do painel tem videoaula curta em Tutoriais, no menu.';
const CAMINHO_PADRAO_PARCEIRO = 'As aulas do seu painel de parceiro explicam cada parte passo a passo.';

/* texto: o que a pessoa escreveu (de preferencia as ultimas mensagens juntas,
   porque "Quero" sozinho nao diz o assunto — o assunto estava na anterior).
   opcoes: { emailOk, painel } */
function caminhoPainel(texto, opcoes) {
  const o = opcoes || {};
  if (o.painel === 'parceiro') return CAMINHO_PADRAO_PARCEIRO;
  const t = semAcento(texto);
  for (const c of CAMINHOS_LOJISTA) {
    if (c.re.test(t)) return c.txt + ((c.semEmail && o.emailOk === false) ? c.semEmail : '');
  }
  return CAMINHO_PADRAO_LOJISTA;
}

const RODAPE = 'Sua mensagem ficou registrada e alguém do Moviki responde por aqui mesmo.';

/* Texto da resposta pronta. Texto puro: o painel do lojista nao desenha
   markdown (mostraria os asteriscos). */
function textoQueda(motivo, opcoes) {
  const o = opcoes || {};
  const caminho = caminhoPainel(o.pergunta, o);
  let abre;
  if (motivo === 'limite_sem_email') {
    abre = 'Para eu continuar respondendo hoje, falta só uma coisa: confirmar o seu e-mail. ' +
      'É rápido e ainda libera os 30 dias do teste grátis e a live aberta aos seus clientes.\n\n' +
      'O link foi enviado no seu cadastro (veja também o spam e a aba Promoções). Não achou? ' +
      'No alto do Início tem o botão "Não recebi — enviar de novo". Confirmou, eu volto a responder na hora.';
  } else if (motivo === 'limite_dia' || motivo === 'teto_global') {
    abre = 'Hoje já conversamos bastante por aqui, então eu faço uma pausa até amanhã.';
  } else {
    abre = 'Tive uma instabilidade para responder agora. Se quiser, mande de novo daqui a alguns minutos.';
  }
  return abre + '\n\n' + caminho + '\n\n' + RODAPE;
}

/* Primeira frase de cada texto — serve para reconhecer, no historico, que a
   ultima resposta do Vik ja foi uma queda (sem precisar de campo novo na
   conversa: campo fora do hasOnly de conversas/{uid} trava a caixa inteira). */
function ehTextoQueda(texto) {
  const t = String(texto || '');
  return t.indexOf('Para eu continuar respondendo hoje') === 0 ||
         t.indexOf('Hoje já conversamos bastante por aqui') === 0 ||
         t.indexOf('Tive uma instabilidade para responder agora') === 0;
}

/* Dia UTC (AAAA-MM-DD) de um carimbo do Firestore. */
function diaUtc(carimbo) {
  try {
    const msv = carimbo && typeof carimbo.toMillis === 'function' ? carimbo.toMillis() : 0;
    if (!msv) return '';
    return new Date(msv).toISOString().slice(0, 10);
  } catch (_) { return ''; }
}

/* Decide se esta queda grava texto novo na conversa ou so reacende o aviso
   do dono.
   conv          documento conversas/{uid}
   motivo        um dos MOTIVOS
   dia           hoje em UTC
   ultimaDoBot   texto da ultima mensagem de:'bot' do historico ('' se nao ha) */
function deveEscrever(conv, motivo, dia, ultimaDoBot) {
  const c = conv || {};
  if (DE_TETO[motivo]) {
    return !(c.botFiltro === motivo && diaUtc(c.botFiltroEm) === dia);
  }
  return !ehTextoQueda(ultimaDoBot);
}

/* Junta o texto das ultimas mensagens da pessoa (ate 3, da mais antiga para a
   mais nova) para achar o assunto. */
function assuntoRecente(msgs) {
  const da = (msgs || []).filter((m) => m && m.de === 'lojista' && m.texto).slice(-3);
  return da.map((m) => String(m.texto)).join(' ').slice(0, 1000);
}

/* O prompt pede texto puro, mas o modelo as vezes escapa com **negrito**,
   __sublinhado__ e titulo com #. O painel mostra os simbolos crus — em 15/10
   a lojista leu "**iPhone**". Tira so a marcacao, nunca o conteudo. */
function limparFormatacao(texto) {
  return String(texto || '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

module.exports = {
  MOTIVOS, caminhoPainel, textoQueda, ehTextoQueda, deveEscrever,
  assuntoRecente, limparFormatacao, diaUtc,
};
