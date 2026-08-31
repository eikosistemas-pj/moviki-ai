// lib/segurancaVik.js  (repo: moviki-ai)
//
// SEGUNDA CAMADA DE CONFORMIDADE DO VIK — o filtro do servidor.
//
// ------------------------------------------------------------------
// POR QUE ISTO EXISTE
// ------------------------------------------------------------------
// O promptPainel.js ja proibe projetar ganho, prometer resultado, negociar
// preco e falar de tecnologia interna. Prompt, porem, NAO E TRAVA: e uma
// instrucao que o modelo cumpre quase sempre. "Quase sempre" nao serve para
// promessa de dinheiro por escrito, dentro do produto, para milhares de
// lojistas — foi exatamente esse tipo de frase que ja deixou uma conta de
// anuncios da Moviki RESTRITA na Meta.
//
// Aqui a resposta e conferida DEPOIS de pronta e ANTES de ser gravada. Se
// bater em qualquer padrao proibido, a resposta inteira e descartada e no
// lugar dela entra uma frase neutra de encaminhamento. O lojista nunca ve a
// frase problematica, e ela nunca existe no banco.
//
// ------------------------------------------------------------------
// AS DUAS REGRAS DE DESENHO
// ------------------------------------------------------------------
// 1. NA DUVIDA, BARRA. O prejuizo de barrar uma resposta boa e o lojista
//    esperar uma pessoa responder. O prejuizo de deixar passar uma promessa
//    de renda e juridico e de conta de anuncios. Nao sao comparaveis.
// 2. NUNCA barrar o que o proprio prompt manda dizer. Todo padrao daqui foi
//    conferido contra o texto do promptPainel.js: "gratis para sempre",
//    "15% recorrente", "nao e piramide ... sem compra de kit, estoque ou
//    investimento inicial", "minimo R$ 20", "R$ 37,90/mes" e a explicacao das
//    comissoes PASSAM. Ha teste automatico para isso — se alguem apertar um
//    padrao e quebrar uma frase legitima, o teste acusa.
//
// Mexeu aqui, roda: node lib/segurancaVik.test.js

/* Tira acento e caixa antes de comparar. Sem isto, "voce" escapa do padrao
   escrito com "você" e o filtro vira decoracao. */
function normalizar(t) {
  return String(t == null ? '' : t)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ------------------------------------------------------------------
// OS PADROES PROIBIDOS
// Cada um tem motivo (vai para o log e para o painel do dono) e um
// comentario dizendo QUAL frase real ele existe para pegar.
// ------------------------------------------------------------------
const PADROES = [
  // --- 1. PROMESSA E PROJECAO DE GANHO -----------------------------
  // "voce vai ganhar", "voce pode faturar", "tu vais lucrar"
  { motivo: 'promessa_de_ganho',
    re: /\b(voce|vc|tu)\b[^.!?]{0,40}\b(vai|vao|ira|irao|pode|podera|consegue|conseguira)\b[^.!?]{0,25}\b(ganhar|faturar|lucrar|render|embolsar)\b/ },
  // "vai vender mais", "tende a vender mais", "passa a faturar bastante".
  // O verbo de futuro/tendencia importa menos do que o par verbo+mais: o
  // proprio prompt cita "voce vai vender mais" como o exemplo do que NAO
  // dizer, entao a frase nua ja e proibida.
  { motivo: 'promessa_de_resultado',
    re: /\b(vender|vende|venda|faturar|fatura|lucrar|lucra|crescer|cresce|bombar)\s+(muito\s+)?(mais|o dobro|em dobro|bastante|muito)\b/ },
  { motivo: 'promessa_de_resultado',
    re: /\b(vai|vao|ira|irao|tende a|passa a|costuma|comeca a|deve)\b[^.!?]{0,25}\b(vender|faturar|crescer|bombar|lucrar)\b/ },
  // Generalizacao em terceira pessoa e a mesma promessa com outra roupa:
  // "muita gente ganha", "nossos lojistas faturam", "da pra ganhar".
  { motivo: 'promessa_de_ganho',
    re: /\b(muita gente|muitos|a maioria|nossos? (lojistas?|clientes?|parceiros?|assinantes?)|tem gente que|o pessoal|quem assina|quem indica)\b[^.!?]{0,45}\b(ganha|ganham|ganhar|fatura|faturam|faturar|lucra|lucram|lucrar|tira|tiram)\b/ },
  { motivo: 'promessa_de_ganho',
    re: /\b(consegue|conseguem|da pra|de pra|e possivel|possivel|acaba)\b[^.!?]{0,25}\b(ganhar|faturar|lucrar|render)\b/ },
  // "dobrar seu faturamento", "triplicar suas vendas"
  { motivo: 'promessa_de_resultado',
    re: /\b(dobrar|triplicar|multiplicar|explodir)\b[^.!?]{0,20}\b(faturamento|vendas?|lucro|renda|ganhos?|clientes)\b/ },
  // "renda extra", "renda passiva", "ganho garantido", "lucro mensal de"
  // O qualificador nem sempre vem colado: "seu retorno e certo", "o ganho
  // mensal fica em". Por isso a janela curta em vez de \s* apenas.
  { motivo: 'projecao_de_renda',
    re: /\b(renda|ganho|ganhos|lucro|retorno|faturamento)\b[^.!?]{0,14}\b(extra|passiv[ao]|mensal|garantid[ao]|assegurad[ao]|cert[oa])\b/ },
  // "ate R$ 500 por mes", "R$ 1.000 mensais"
  { motivo: 'projecao_de_renda',
    re: /\bate\b[^.!?]{0,15}r\$\s*[\d.,]+[^.!?]{0,15}\b(por|ao|a cada|\/)\s*(mes|dia|semana|ano)\b/ },
  { motivo: 'projecao_de_renda',
    re: /r\$\s*[\d.,]+\s*(mensais|por mes de (lucro|ganho|renda)|de lucro por|de renda por)\b/ },
  // "30% a mais de clientes", "50% de retorno"
  // Sem \b depois do % de proposito: '%' nao e caractere de palavra, entao o
  // \b ali NUNCA casa quando vem espaco em seguida — foi assim que
  // "40% a mais de clientes" passou batido no primeiro teste.
  { motivo: 'projecao_de_renda',
    re: /\b\d{1,3}\s*%[^.!?]{0,20}\b(a mais|de aumento|de retorno|de lucro|de crescimento)\b/ },
  // "em 30 dias voce ja esta faturando"
  { motivo: 'promessa_de_prazo',
    re: /\bem\b\s*\d{1,3}\s*(dias?|semanas?|meses?)\b[^.!?]{0,30}\b(voce|vc)\b[^.!?]{0,25}\b(ganha|ganhando|fatura|faturando|lucra|lucrando|vende|vendendo)\b/ },

  // --- 2. GARANTIA E AUSENCIA DE RISCO -----------------------------
  // "resultado garantido", "garantimos", "eu garanto que"
  { motivo: 'garantia_indevida',
    re: /\b(garantid[ao]s?|garantimos|garanto|asseguro|assegurado)\b/ },
  { motivo: 'garantia_indevida',
    re: /\b(sem risco|risco zero|zero risco|nao tem risco|nao ha risco|100% seguro|totalmente seguro)\b/ },
  { motivo: 'garantia_indevida',
    re: /\b(com certeza|certeza absoluta|pode ter certeza)\b[^.!?]{0,30}\b(vai|ira|voce)\b[^.!?]{0,25}\b(ganhar|vender|faturar|lucrar|crescer)\b/ },

  // --- 3. ENQUADRAMENTO DE INVESTIMENTO / PIRAMIDE -----------------
  // Cuidado: o prompt legitimo diz "...sem compra de kit, estoque ou
  // investimento inicial". Por isso so pega investimento QUALIFICADO.
  { motivo: 'enquadramento_investimento',
    re: /\b(otimo|otima|excelente|melhor|bom|boa|grande|seguro|garantido|certo)\s+investimento\b/ },
  { motivo: 'enquadramento_investimento',
    re: /\binvestimento\s+(seguro|garantido|certo|sem risco|de baixo risco)\b/ },
  { motivo: 'enquadramento_investimento',
    re: /\b(invista|investir)\b[^.!?]{0,25}\b(e voce|que voce|para (ganhar|lucrar|faturar)|e (ganhe|lucre))\b/ },
  { motivo: 'enquadramento_investimento',
    re: /\b(dinheiro facil|grana facil|ganhe dinheiro|ganhar dinheiro facil|renda sem esforco|trabalhe de casa e ganhe)\b/ },
  { motivo: 'enquadramento_investimento',
    re: /\b(multinivel|marketing de rede|mmn|matriz de ganhos|rede de downlines?)\b/ },

  // --- 4. AGIR SOZINHO NO DINHEIRO DA PESSOA -----------------------
  // O Vik nao estorna, nao cancela e nao promete reembolso: isso e da lista
  // "passar para o time" do prompt. Se ele escrever, o lojista cobra depois.
  // ART = artigo/possessivo repetido: "o", "seu", "o seu", "a sua"...
  // Escrever "(o|seu)" pega "liberar o saque" e "liberar seu saque", mas NAO
  // pega "liberar o seu saque", que e como gente escreve de verdade.
  { motivo: 'promessa_financeira',
    re: /\b(vou|posso|ja|consigo)\b[^.!?]{0,20}\b(estornar|estornei|reembolsar|reembolsei|devolver\s+(?:(?:o|a|os|as|seu|sua|meu|minha)\s+)*dinheiro|cancelar\s+(?:(?:o|a|os|as|seu|sua)\s+)*(assinatura|cobranca)|cancelei\s+(?:(?:o|a|os|as|seu|sua)\s+)*(assinatura|cobranca)|liberar\s+(?:(?:o|a|os|as|seu|sua)\s+)*saque|antecipar\s+(?:(?:o|a|os|as|seu|sua)\s+)*(saque|pagamento|comissao))\b/ },
  { motivo: 'negociacao_de_preco',
    re: /\b(vou|posso|consigo|deixo|faco)\b[^.!?]{0,25}\b(um )?(desconto|preco especial|condicao especial|valor menor|de graca para voce|gratis para voce)\b/ },
  { motivo: 'negociacao_de_preco',
    re: /\b(desconto|cupom) (de|para|pra) voce\b/ },

  // --- 5. VAZAMENTO DE TRIPA INTERNA -------------------------------
  { motivo: 'vazou_tecnologia',
    re: /\b(firebase|firestore|vercel|asaas|anthropic|claude|chatgpt|openai|gpt-?\d|api key|chave de api|system prompt|prompt do sistema|modelo de linguagem|llm)\b/ },
  { motivo: 'vazou_prompt',
    re: /(<<<\s*vik|vik\s*>>>|=== dados desta conta|=== fim dos dados|=== a regra mais importante|dados desta conta \(lidos)/ },

  // --- 6. FINGIR SER GENTE -----------------------------------------
  { motivo: 'fingiu_ser_humano',
    re: /\b(sou (uma pessoa|humano|humana|gente|de carne)|nao sou (um )?(rob[oô]|bot|assistente|ia|inteligencia artificial)|falo com voce pessoalmente)\b/ },

  // --- 7. PEDIR DADO QUE O VIK NUNCA PODE PEDIR --------------------
  { motivo: 'pediu_dado_sensivel',
    re: /\b(me (informe|passe|manda|mande|envie|diga|fala)|preciso d[oa]|qual (e )?[oa]|digite (aqui )?[oa]?|confirma [oa])\b[^.!?]{0,30}\b(senha|cpf|cnpj|rg|numero do cartao|cartao de credito|cvv|codigo de seguranca|chave pix|conta bancaria|agencia|token de acesso)\b/ },
];

/* Frase que entra no lugar da resposta barrada. Precisa cumprir tres coisas:
   nao acusar a pessoa de nada, nao dizer que houve erro de sistema (que
   convidaria a tentar de novo com a mesma pergunta) e deixar claro que gente
   vai responder ali mesmo. */
const FRASE_HANDOFF =
  'Prefiro não responder isso por aqui pra não te passar informação errada. ' +
  'Vou passar para o time — alguém responde por esta mesma conversa.';

/* Confere a resposta pronta. Devolve sempre um objeto, nunca lanca: o
   atendimento nao pode cair por causa do filtro. Se algo explodir aqui, o
   catch barra do mesmo jeito — falhar fechado, nunca aberto. */
/* fraseAlternativa: cada canal tem a sua. No painel a pessoa esta logada e a
   conversa continua ali mesmo; no WhatsApp ela e um desconhecido e precisa de
   um caminho (suporte). Se nao vier nada, usa a do painel. */
function respostaSegura(texto, fraseAlternativa) {
  const SAIDA = String(fraseAlternativa || FRASE_HANDOFF);
  try {
    const original = String(texto == null ? '' : texto);
    const t = normalizar(original);
    if (!t.trim()) return { ok: false, motivo: 'resposta_vazia', texto: SAIDA };
    for (let i = 0; i < PADROES.length; i++) {
      const p = PADROES[i];
      const m = t.match(p.re);
      if (m) {
        return {
          ok: false,
          motivo: p.motivo,
          // trecho curto so para o log do servidor e para o painel do dono.
          // Nunca vai para o lojista.
          trecho: String(m[0]).slice(0, 120),
          texto: SAIDA,
        };
      }
    }
    return { ok: true, motivo: '', texto: original };
  } catch (e) {
    console.error('[segurancaVik] falhou conferir (barrando por seguranca):', e && e.message);
    return { ok: false, motivo: 'filtro_falhou', texto: SAIDA };
  }
}

module.exports = { respostaSegura, normalizar, FRASE_HANDOFF, PADROES };
