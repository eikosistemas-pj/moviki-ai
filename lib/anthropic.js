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
// CONFIRA o id de modelo mais atual em
// https://docs.claude.com/en/docs/about-claude/models antes de ir pro ar. O
// padrão abaixo é um ponto de partida conservador, não necessariamente o
// mais novo disponível na sua conta — prefira fixar o id em ANTHROPIC_MODEL,
// que assim dá pra trocar de modelo sem novo deploy.
//
// TIMEOUT É OBRIGATÓRIO AQUI, e é a única diferença de peso pra versão
// anterior: sem ele, uma chamada travada segura a função até o teto do
// Vercel e derruba o pedido inteiro com erro 504 — o oposto da regra de ouro
// "a IA nunca derruba o fluxo principal".

const MODELO_PADRAO = 'claude-3-5-sonnet-20241022';
const TIMEOUT_PADRAO = 20000;

// historico: [{ role: 'user'|'assistant', texto: string }, ...]
// Retorna a string de resposta do assistente, ou null em erro.
async function perguntarClaude({ systemPrompt, historico, mensagemNova, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('[anthropic] ANTHROPIC_API_KEY ausente.'); return null; }

  const modelo = process.env.ANTHROPIC_MODEL || MODELO_PADRAO;
  const limite = Number(process.env.ANTHROPIC_TIMEOUT || TIMEOUT_PADRAO);

  const messages = (historico || []).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.texto || ''),
  }));
  messages.push({ role: 'user', content: mensagemNova });

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
      body: JSON.stringify({
        model: modelo,
        max_tokens: Number(maxTokens) || 700,
        system: systemPrompt,
        messages,
      }),
      signal: ctrl.signal,
    });

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      console.error('[anthropic] API recusou:', resp.status, String(corpo).slice(0, 400));
      return null;
    }

    const data = await resp.json();
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
