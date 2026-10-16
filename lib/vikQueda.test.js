// lib/vikQueda.test.js  (repo: moviki-ai) — roda offline: npm run teste
const test = require('node:test');
const assert = require('node:assert');
const q = require('./vikQueda');

const carimbo = (iso) => ({ toMillis: () => new Date(iso).getTime() });

test('caso real de 15/10: "Quero" + "Como faco pra fazer a live" leva ao estudio', () => {
  const msgs = [
    { de: 'lojista', texto: 'As live eu posso fazer no Instagram e devo fazer o que pra eles entrarem' },
    { de: 'bot', texto: 'Voce pode fazer live no Instagram...' },
    { de: 'lojista', texto: 'Quero' },
    { de: 'lojista', texto: 'Como faço pra fazer a live no moviki' },
  ];
  const t = q.textoQueda('limite_sem_email', { pergunta: q.assuntoRecente(msgs), emailOk: false, painel: 'lojista' });
  assert.match(t, /confirmar o seu e-mail/);
  assert.match(t, /Não recebi — enviar de novo/);
  assert.match(t, /Ferramentas > "Fazer live"/);
  assert.match(t, /ensaio, que ninguém vê, já está liberado/);
  assert.match(t, /alguém do Moviki responde por aqui/);
});

test('com e-mail confirmado o caminho da live nao fala de confirmar', () => {
  const c = q.caminhoPainel('quero fazer uma live', { emailOk: true, painel: 'lojista' });
  assert.match(c, /Fazer live/);
  assert.doesNotMatch(c, /e-mail/);
});

test('assuntos levam ao lugar certo', () => {
  const o = { emailOk: true, painel: 'lojista' };
  assert.match(q.caminhoPainel('como recebo no pix', o), /Financeiro/);
  assert.match(q.caminhoPainel('onde vejo meus pedidos', o), /Pedidos/);
  assert.match(q.caminhoPainel('como cadastro produto no cardápio', o), /Cardápio/);
  assert.match(q.caminhoPainel('quanto custa o premium', o), /Meu Plano/);
  assert.match(q.caminhoPainel('e como sei que chega cliente pra meu watts', o), /WhatsApp/);
  assert.match(q.caminhoPainel('onde pego meu link', o), /Seu link pra divulgar/);
  assert.match(q.caminhoPainel('sumi do mapa', o), /Seu negócio no mapa/);
  assert.match(q.caminhoPainel('bom dia', o), /Tutoriais/);
  assert.match(q.caminhoPainel('live', { painel: 'parceiro' }), /parceiro/);
});

test('texto pronto nunca tem markdown nem promessa', () => {
  for (const m of q.MOTIVOS) {
    const t = q.textoQueda(m, { pergunta: 'live pix pedido', emailOk: false, painel: 'lojista' });
    assert.doesNotMatch(t, /\*\*|^#/m);
    assert.doesNotMatch(t, /garant|venda mais|vender mais|lucro/i);
    assert.ok(q.ehTextoQueda(t), 'reconhece o proprio texto: ' + m);
  }
});

test('teto: texto uma vez por dia, depois so aviso ao dono', () => {
  const dia = '2026-10-16';
  assert.strictEqual(q.deveEscrever({}, 'limite_sem_email', dia, ''), true);
  const conv = { botFiltro: 'limite_sem_email', botFiltroEm: carimbo('2026-10-16T02:01:05Z') };
  assert.strictEqual(q.deveEscrever(conv, 'limite_sem_email', dia, ''), false);
  assert.strictEqual(q.deveEscrever(conv, 'limite_sem_email', '2026-10-17', ''), true);
  // motivo diferente no mesmo dia escreve
  assert.strictEqual(q.deveEscrever(conv, 'teto_global', dia, ''), true);
});

test('falha: escreve, menos se a ultima resposta ja foi a queda', () => {
  const ja = q.textoQueda('ia_indisponivel', { pergunta: 'x' });
  assert.strictEqual(q.deveEscrever({}, 'ia_indisponivel', 'd', 'Resposta normal do Vik'), true);
  assert.strictEqual(q.deveEscrever({}, 'ia_indisponivel', 'd', ja), false);
  assert.strictEqual(q.deveEscrever({}, 'erro_interno', 'd', ja), false);
});

test('limparFormatacao tira a marcacao e mantem o conteudo', () => {
  assert.strictEqual(q.limparFormatacao('- **iPhone**: abra o painel'), '- iPhone: abra o painel');
  assert.strictEqual(q.limparFormatacao('## Titulo\ntexto __sub__'), 'Titulo\ntexto sub');
  assert.strictEqual(q.limparFormatacao('sobrou ** solto'), 'sobrou  solto');
  assert.strictEqual(q.limparFormatacao('preco 2*3 fica'), 'preco 2*3 fica');
});

test('assuntoRecente pega so a pessoa, ate 3 mensagens', () => {
  const s = q.assuntoRecente([
    { de: 'lojista', texto: 'a' }, { de: 'bot', texto: 'b' },
    { de: 'lojista', texto: 'c' }, { de: 'lojista', texto: 'd' }, { de: 'lojista', texto: 'e' },
  ]);
  assert.strictEqual(s, 'c d e');
});
