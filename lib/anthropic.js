// lib/anthropic.js  (repo: moviki-robo)
// Chamada minimalista à API da Anthropic (Claude), sem SDK — mesmo padrão do
// resto do repo (fetch cru, como já é feito pro Telegram/Resend/Asaas).
//
// Env vars necessárias no Vercel (projeto moviki-robo):
//   ANTHROPIC_API_KEY -> chave da API da Anthropic (console.anthropic.com)
//   ANTHROPIC_MODEL    -> opcional. Se não setar, usa o padrão abaixo.
//
// IMPORTANTE: confira o id de modelo mais atual em
// https://docs.claude.com/en/docs/about-claude/models antes de ir pro ar —
// o padrão aqui é um ponto de partida seguro, não necessariamente o mais
// novo disponível na sua conta.

const MODELO_PADRAO = 'claude-3-5-sonnet-20241022';

// historico: [{ role: 'user'|'assistant', texto: string }, ...]
// Retorna a string de resposta do assistente, ou null em erro.
async function perguntarClaude({ systemPrompt, historico, mensagemNova }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('[anthropic] ANTHROPIC_API_KEY ausente.'); return null; }

  const modelo = process.env.ANTHROPIC_MODEL || MODELO_PADRAO;

  const messages = (historico || []).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.texto || ''),
  }));
  messages.push({ role: 'user', content: mensagemNova });

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
        max_tokens: 700,
        system: systemPrompt,
        messages,
      }),
    });

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      console.error('[anthropic] API recusou:', resp.status, corpo);
      return null;
    }

    const data = await resp.json();
    const bloco = Array.isArray(data.content) ? data.content.find((b) => b.type === 'text') : null;
    return bloco && bloco.text ? String(bloco.text).trim() : null;
  } catch (e) {
    console.error('[anthropic] Erro ao chamar a API:', e);
    return null;
  }
}

module.exports = { perguntarClaude };
