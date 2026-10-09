// lib/anthropic.js  (repo: moviki-ai)
//
// Chamada minimalista à API da Anthropic (Claude), sem SDK — mesmo padrão do
// resto dos repos (fetch cru, como já é feito pro Telegram/Resend/Asaas).
//
// Env vars necessárias no Vercel (projeto moviki-ai):
//   ANTHROPIC_API_KEY   -> chave da API (console.anthropic.com)
//   ANTHROPIC_MODEL     -> opcional. Se não setar, usa o padrão abaixo.
//   ANTHROPIC_TIMEOUT   -> opcional, em ms. Padrão 20000.
//
// MODELO PADRÃO — 27/08/2026: era `claude-3-5-sonnet-20241022`, de 2024, que
// saiu do catálogo. Modelo aposentado faz a API recusar, o perguntarClaude
// devolver null e o atendente ficar MUDO sem mostrar erro nenhum na tela —
// exatamente o sintoma "a bolinha aparece e não dá em nada".
// Haiku 4.5 é a escolha certa para atendimento: o contexto da conta já vem
// mastigado pelo contextoUsuario.js, então o que se pede aqui é resposta
// rápida e barata, não raciocínio pesado. Para respostas mais elaboradas,
// trocar por `claude-sonnet-5` na env, sem novo deploy.
// Catálogo atual: platform.claude.com/docs/en/models/overview
//
// TIMEOUT É OBRIGATÓRIO AQUI, e é a única diferença de peso pra versão
// anterior: sem ele, uma chamada travada segura a função até o teto do
// Vercel e derruba o pedido inteiro com erro 504 — o oposto da regra de ouro
// "a IA nunca derruba o fluxo principal".
//
// CACHE DE PROMPT — 30/09/2026
// O system prompt do Vik do painel tem ~17 mil tokens (regras + catálogo) e
// era reenviado INTEIRO, pago cheio, a cada mensagem — e duas vezes quando a
// segurança pede a resposta corretiva. A Anthropic avisou em 27/09 que a
// taxa de acerto de cache estava baixa. Agora o prompt vai em blocos:
//   bloco 1 = tudo ANTES de "=== DADOS DESTA CONTA" (regras + catálogo, igual
//             para todo mundo do mesmo papel) -> marcado para cache;
//   bloco 2 = dados da conta (muda por pessoa) -> sem cache.
// Leitura de cache custa 10% do preço normal. Prompt sem o marcador (o do
// WhatsApp) vai num bloco só, também marcado. Prompt curto demais para o
// mínimo de cache do modelo é simplesmente não guardado — a API não dá erro.
//
// MEDIDOR — 30/09/2026
// Toda resposta grava no log do Vercel uma linha "[anthropic] uso" com
// modelo, tokens de entrada, saída, gravação e leitura de cache e o custo
// estimado em US$. Vercel > moviki-ai > Logs > buscar "[anthropic] uso".

const MODELO_PADRAO = 'claude-haiku-4-5-20251001';
const TIMEOUT_PADRAO = 20000;
const MARCADOR_DADOS = '=== DADOS DESTA CONTA';

// Preço por 1 milhão de tokens (US$): entrada, saída. Só para o medidor.
const PRECOS = [
  { chave: 'haiku', entrada: 1, saida: 5 },
  { chave: 'sonnet', entrada: 3, saida: 15 },
  { chave: 'opus', entrada: 5, saida: 25 },
];

function precoDo(modelo) {
  const m = String(modelo || '').toLowerCase();
  return PRECOS.find((p) => m.indexOf(p.chave) !== -1) || PRECOS[0];
}

// Transforma o system prompt (string) em blocos com cache no trecho fixo.
function blocosDoSystem(systemPrompt) {
  const texto = String(systemPrompt || '');
  if (!texto) return undefined;
  const i = texto.indexOf(MARCADOR_DADOS);
  if (i > 0) {
    const fixo = texto.slice(0, i);
    const variavel = texto.slice(i);
    return [
      { type: 'text', text: fixo, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: variavel },
    ];
  }
  return [{ type: 'text', text: texto, cache_control: { type: 'ephemeral' } }];
}

function registrarUso(modelo, usage) {
  try {
    if (!usage) return;
    const ent = Number(usage.input_tokens) || 0;
    const sai = Number(usage.output_tokens) || 0;
    const grav = Number(usage.cache_creation_input_tokens) || 0;
    const leit = Number(usage.cache_read_input_tokens) || 0;
    const p = precoDo(modelo);
    const custo = (ent * p.entrada + grav * p.entrada * 1.25 + leit * p.entrada * 0.1 + sai * p.saida) / 1e6;
    console.log('[anthropic] uso', JSON.stringify({
      modelo, entrada: ent, saida: sai, cacheGravado: grav, cacheLido: leit, usd: Number(custo.toFixed(5)),
    }));
  } catch (_) { /* medidor nunca derruba a resposta */ }
}

// historico: [{ role: 'user'|'assistant', texto: string }, ...]
// Retorna a string de resposta do assistente, ou null em erro.
async function perguntarClaude({ systemPrompt, historico, mensagemNova, maxTokens, timeoutMs }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('[anthropic] ANTHROPIC_API_KEY ausente.'); return null; }

  const modelo = process.env.ANTHROPIC_MODEL || MODELO_PADRAO;
  // timeoutMs (09/10/2026): o direct do Instagram (api/manychat.js) precisa
  // responder ao ManyChat em menos de 10 s; os outros usos seguem a env.
  const limite = Number(timeoutMs) || Number(process.env.ANTHROPIC_TIMEOUT || TIMEOUT_PADRAO);

  const messages = (historico || []).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.texto || ''),
  }));
  messages.push({ role: 'user', content: mensagemNova });

  const corpoPedido = {
    model: modelo,
    max_tokens: Number(maxTokens) || 700,
    messages,
  };
  const system = blocosDoSystem(systemPrompt);
  if (system) corpoPedido.system = system;

  const ctrl = new AbortController();
  const t = setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, limite);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(corpoPedido),
      signal: ctrl.signal,
    });

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      console.error('[anthropic] API recusou:', resp.status, String(corpo).slice(0, 400));
      return null;
    }

    const data = await resp.json();
    registrarUso(modelo, data.usage);
    const bloco = Array.isArray(data.content) ? data.content.find((b) => b.type === 'text') : null;
    return bloco && bloco.text ? String(bloco.text).trim() : null;
  } catch (e) {
    console.error('[anthropic] Erro ao chamar a API:', e && e.message ? e.message : e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

module.exports = { perguntarClaude };
