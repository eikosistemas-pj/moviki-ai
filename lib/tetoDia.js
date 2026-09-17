// lib/tetoDia.js  (repo: moviki-ai)
//
// TETO DE USO POR DIA do atendente do WhatsApp (api/atendimento.js).
//
// POR QUE EXISTE — 17/09/2026
// O Vik do painel ja tinha teto (CHAT_LIMITE_DIA). O do WhatsApp, que fala
// com DESCONHECIDO, nao tinha nenhum. A assinatura da Meta impede que alguem
// FORJE uma chamada, mas nao impede uma pessoa real mandar mensagem sem
// parar — e cada mensagem e uma chamada paga a Anthropic.
//
// A decisao mora aqui, separada do endpoint, para ter teste de verdade:
// o endpoint depende de Firestore e da Meta; esta funcao nao depende de nada.

/* conv    documento de atendimentos_bot/{telefone} (ou {} se nao existe)
   dia     dia de hoje em UTC, no formato AAAA-MM-DD
   limite  quantas mensagens por dia

   Devolve:
     usadas    quantas ja foram HOJE — contador de ontem nao conta
     bloquear  esta mensagem NAO deve chegar na IA
     avisar    e a hora de mandar o caminho humano (uma vez por dia)   */
function decidirTeto(conv, dia, limite) {
  const c        = conv || {};
  const mesmoDia = c.botDia === dia;
  const usadas   = mesmoDia ? (Number(c.botUsos) || 0) : 0;
  const bloquear = usadas >= limite;
  const jaAvisou = mesmoDia && c.botAvisoLimite === true;
  return { usadas, bloquear, avisar: bloquear && !jaAvisou };
}

module.exports = { decidirTeto };
