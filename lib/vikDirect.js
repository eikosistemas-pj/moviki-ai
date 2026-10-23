// lib/vikDirect.js  (repo: moviki-ai)  versao 2026-10-14-provisorio (teste gratis comeca no cadastro) | antes 2026-10-13-recusa
//
// 13/10/2026 — caso Lais no direct: "Nem tenho loja" recebeu do Vik a
// apresentacao antiga (food truck, carrinho, feirante, mapa) e ela xingou
// depois. O bloco do direct passa a: apresentar pela live de vendas, agradecer
// sem oferta a quem nao tem loja e parar sem insistir em quem recusa ou xinga.
// A automacao "Protecao - Pare e palavrao" do ManyChat pega esses casos antes
// (pausa o contato 1 dia); esta regra cobre o que escapar das palavras-chave.
//
// O Vik respondendo no DIRECT DO INSTAGRAM (@moviki.oficial), chamado pelo
// ManyChat (bloco "External Request") quando a mensagem da pessoa nao bate
// com nenhuma palavra-chave dos fluxos. Endpoint: api/manychat.js.
//
// POR QUE EXISTE — 09/10/2026
// Ate aqui, pergunta livre no direct ("serve para otica?", "aceita cartao?")
// caia na resposta padrao "uma pessoa responde" e esperava o Paulo. Dentro da
// janela de 24 h do Instagram o lead esfria rapido; o Vik responde na hora,
// com o mesmo conhecimento do atendente do WhatsApp, e devolve o botao de
// cadastro. Depois das 24 h a Meta proibe mensagem automatica — nem o Vik.
//
// Tudo que decide (chave, entrada, teto, texto final) mora aqui, sem
// Firestore nem rede, para ter teste de verdade (lib/vikDirect.test.js).

const crypto = require('crypto');
const { SYSTEM_PROMPT } = require('./promptAtendimento');

const LIMITE_CONTATO_PADRAO = 12;   // respostas do Vik por contato por dia
const TETO_GLOBAL_PADRAO = 300;     // respostas do Vik no direct, todas somadas, por dia
const MAX_RESPOSTA = 900;           // o Instagram corta mensagem acima de 1.000 caracteres
const MAX_PERGUNTA = 1000;

const RAMOS = {
  moda: 'loja de moda', calcados: 'loja de calçados', semijoias: 'semijoias',
  pet: 'pet shop', acai: 'açaí e lanches', confeitaria: 'doces e bolos',
  suplementos: 'suplementos', cosmeticos: 'cosméticos', bebe: 'bebê e infantil',
  utilidades: 'casa e utilidades',
};

/* Chave do ManyChat. O ManyChat nao assina as chamadas, entao a origem e
   provada por um cabecalho com um segredo que so a Vercel (env
   MANYCHAT_CHAVE) e o bloco do ManyChat conhecem.
   REGRA DE OURO (03/09): conferencia NUNCA falha aberto — sem a env, ninguem
   entra. */
function chaveValida(chaveEnv, chaveRecebida) {
  if (!chaveEnv || typeof chaveEnv !== 'string' || chaveEnv.length < 16) return false;
  if (!chaveRecebida || typeof chaveRecebida !== 'string') return false;
  const a = crypto.createHash('sha256').update(chaveEnv).digest();
  const b = crypto.createHash('sha256').update(chaveRecebida).digest();
  return crypto.timingSafeEqual(a, b);
}

/* Aceita os dois formatos que o ManyChat manda:
   1) corpo montado a mao: { contato, texto, ramo }
   2) "Add full contact data": { id, last_input_text, custom_fields: { ramo } }
   Nome, @ e foto NAO sao lidos nem guardados: o Vik nao precisa deles. */
function lerEntrada(corpo) {
  const c = corpo && typeof corpo === 'object' ? corpo : {};
  const cf = c.custom_fields && typeof c.custom_fields === 'object' ? c.custom_fields : {};
  const contato = String(c.contato || c.id || c.subscriber_id || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 64);
  let texto = c.texto != null ? c.texto : c.last_input_text;
  texto = String(texto == null ? '' : texto).trim();
  // Variavel do ManyChat sem valor chega crua: "{{last_input_text}}".
  if (/^\{\{.*\}\}$/.test(texto)) texto = '';
  texto = texto.slice(0, MAX_PERGUNTA);
  let ramo = String(c.ramo != null ? c.ramo : (cf.ramo || '')).toLowerCase().replace(/[^a-z]/g, '');
  if (!RAMOS[ramo]) ramo = '';
  return { contato, texto, ramo };
}

function numeroEnv(valor, padrao) {
  const n = Number(valor);
  return (Number.isFinite(n) && n > 0) ? n : padrao;
}

/* Decide, ANTES de chamar a IA (depois dela o dinheiro ja saiu), se esta
   mensagem pode ser respondida.
   r  documento vik_direct/{contato}   g  documento vik_direct/_global
   Devolve { status: 'ok'|'limite_contato'|'teto_global', usos, usosG, avisarTeto } */
function decidirReserva(r, g, dia, limite, tetoGlobal) {
  const rr = r || {}; const gg = g || {};
  const usos = rr.dia === dia ? (Number(rr.usos) || 0) : 0;
  const usosG = gg.dia === dia ? (Number(gg.usos) || 0) : 0;
  if (usos >= limite) return { status: 'limite_contato', usos, usosG, avisarTeto: false };
  if (usosG >= tetoGlobal) return { status: 'teto_global', usos, usosG, avisarTeto: gg.avisadoDia !== dia };
  return { status: 'ok', usos, usosG, avisarTeto: false };
}

/* Prompt do direct = prompt do atendente (mesma fonte de precos e regras) +
   o que muda no Instagram. As correcoes do bloco abaixo VALEM sobre o texto
   de cima quando os dois divergirem (o de cima foi escrito para o WhatsApp). */
function montarPrompt(ramo) {
  const nomeRamo = RAMOS[ramo] || '';
  return SYSTEM_PROMPT + '\n\n' + [
    '=== CANAL: DIRECT DO INSTAGRAM @moviki.oficial (vale sobre o texto acima) ===',
    'Você está respondendo no direct do Instagram. Quem escreve quase sempre é dono',
    'ou funcionário de loja que viu um post, um reel ou um anúncio do Moviki.',
    '- Responda em no máximo 4 frases curtas (até 600 caracteres), sem markdown,',
    '  sem lista longa e sem link: os botões "Criar conta grátis", "Ver live do meu',
    '  ramo" e "Falar com uma pessoa" aparecem logo abaixo da sua resposta.',
    '- Termine levando para o próximo passo: ver a live de exemplo ou criar a conta.',
    '- Teste grátis: 30 dias, sem cartão. Começa no cadastro; confirmar o e-mail',
    '  garante os 30 dias e libera a live aberta ao público (sem confirmar, vale 7',
    '  dias). No teste dá para fazer 2 lives e, antes delas, ensaios que ninguém',
    '  vê (até 10 minutos cada, 5 por dia) para pegar o jeito.',
    '- Cancelar: pelo próprio painel, em Meu Plano > "Cancelar a renovação", na hora',
    '  e sem multa (o plano segue até o fim do período pago). Nos 7 dias do 1º',
    '  pagamento, "Desistir e receber de volta" devolve tudo. Trocar de plano já pago',
    '  é pela equipe (suporte@moviki.com.br ou WhatsApp (41) 2018-6848). Assinar um',
    '  plano pela primeira vez é pelo próprio painel, em Meu Plano.',
    '- Como apresentar o Moviki AQUI (vale sobre "O QUE É A MOVIKI" acima): quem',
    '  chega pelo direct veio pela LIVE. Apresente como live de vendas pelo celular',
    '  para lojas (moda, calçados, semijoias, pet, cosméticos, bebê e outras), com',
    '  página própria e Pix na conta do lojista. Não abra falando de food truck,',
    '  carrinho, feirante ou mapa; o mapa só entra se a pessoa perguntar.',
    '- Nunca prometa vendas, faturamento ou resultado. Fale do que a ferramenta faz.',
    '- Se a pessoa não tem loja (é consumidora), agradeça em uma frase curta, sem',
    '  apresentar o produto e sem oferecer nada.',
    '- Se a pessoa disser que não quer, que não tem interesse, pedir para parar,',
    '  reclamar das mensagens ou xingar: peça desculpa em uma frase e diga que não',
    '  vai mais mandar mensagens. Sem oferta, sem pergunta, sem insistir.',
    '- Se pedirem algo que você não sabe, diga que vai passar para a equipe e que',
    '  ela responde aqui mesmo.',
    nomeRamo ? '- Esta pessoa disse que o negócio dela é: ' + nomeRamo + '. Use exemplos desse ramo.' : '',
  ].filter(Boolean).join('\n');
}

/* Texto final para o Instagram: sem markdown, sem cabecalho, ate MAX_RESPOSTA. */
function limparResposta(texto) {
  let t = String(texto == null ? '' : texto)
    .replace(/\*\*|__|`|^#+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (t.length > MAX_RESPOSTA) {
    const corte = t.slice(0, MAX_RESPOSTA);
    const fim = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
    t = (fim > 200 ? corte.slice(0, fim + 1) : corte.replace(/\s+\S*$/, '') + '…');
  }
  return t;
}

module.exports = {
  chaveValida, lerEntrada, decidirReserva, montarPrompt, limparResposta, numeroEnv,
  LIMITE_CONTATO_PADRAO, TETO_GLOBAL_PADRAO, MAX_RESPOSTA, RAMOS,
};
