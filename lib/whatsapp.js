// lib/whatsapp.js  (repo: moviki-robo)
// Helper minimalista pro WhatsApp Cloud API (Meta oficial) — enviar mensagem
// de texto. Sem SDK, mesmo padrão fetch cru do resto do repo.
//
// Env vars necessárias no Vercel (projeto moviki-robo):
//   WHATSAPP_TOKEN     -> access token permanente (System User, Meta Business)
//   WHATSAPP_PHONE_ID  -> phone_number_id do número conectado (Cloud API)

const GRAPH_VERSION = 'v20.0';

async function enviarTextoWhatsapp(paraTelefone, texto) {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) { console.error('[whatsapp] WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID ausente.'); return false; }

  try {
    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: paraTelefone,
        type: 'text',
        text: { body: texto, preview_url: false },
      }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      console.error('[whatsapp] Meta recusou o envio:', resp.status, corpo);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[whatsapp] Erro ao chamar a Cloud API:', e);
    return false;
  }
}

module.exports = { enviarTextoWhatsapp };
