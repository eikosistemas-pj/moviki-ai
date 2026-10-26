// lib/vikDirect.test.js — node --test lib/vikDirect.test.js
const test = require('node:test');
const assert = require('node:assert');
const V = require('./vikDirect');

test('chave: sem env, curta ou diferente nunca passa (nao falha aberto)', () => {
  assert.strictEqual(V.chaveValida('', 'qualquer'), false);
  assert.strictEqual(V.chaveValida(undefined, undefined), false);
  assert.strictEqual(V.chaveValida('curta', 'curta'), false);
  assert.strictEqual(V.chaveValida('uma-chave-bem-longa-123', ''), false);
  assert.strictEqual(V.chaveValida('uma-chave-bem-longa-123', 'uma-chave-bem-longa-124'), false);
  assert.strictEqual(V.chaveValida('uma-chave-bem-longa-123', 'uma-chave-bem-longa-123'), true);
});

test('entrada: corpo montado a mao', () => {
  const e = V.lerEntrada({ contato: '123456', texto: '  serve para otica?  ', ramo: 'Moda' });
  assert.deepStrictEqual(e, { contato: '123456', texto: 'serve para otica?', ramo: 'moda' });
});

test('entrada: full contact data do ManyChat, sem guardar nome nem @', () => {
  const e = V.lerEntrada({ id: 987, first_name: 'Ana', ig_username: 'ana.loja', last_input_text: 'aceita cartao?', custom_fields: { ramo: 'pet' } });
  assert.deepStrictEqual(e, { contato: '987', texto: 'aceita cartao?', ramo: 'pet' });
});

test('entrada: variavel vazia do ManyChat, ramo desconhecido e id com lixo', () => {
  const e = V.lerEntrada({ contato: '12;DROP 3', texto: '{{last_input_text}}', ramo: 'outro' });
  assert.deepStrictEqual(e, { contato: '12DROP3', texto: '', ramo: '' });
});

test('entrada: texto longo e cortado', () => {
  const e = V.lerEntrada({ contato: '1', texto: 'a'.repeat(5000) });
  assert.strictEqual(e.texto.length, 1000);
});

test('reserva: contador de ontem nao conta; limite do contato e teto global', () => {
  assert.strictEqual(V.decidirReserva({ dia: '2026-10-08', usos: 99 }, {}, '2026-10-09', 12, 300).status, 'ok');
  assert.strictEqual(V.decidirReserva({ dia: '2026-10-09', usos: 12 }, {}, '2026-10-09', 12, 300).status, 'limite_contato');
  const g = V.decidirReserva({}, { dia: '2026-10-09', usos: 300 }, '2026-10-09', 12, 300);
  assert.strictEqual(g.status, 'teto_global');
  assert.strictEqual(g.avisarTeto, true);
  const g2 = V.decidirReserva({}, { dia: '2026-10-09', usos: 300, avisadoDia: '2026-10-09' }, '2026-10-09', 12, 300);
  assert.strictEqual(g2.avisarTeto, false);
  const ok = V.decidirReserva({ dia: '2026-10-09', usos: 3 }, { dia: '2026-10-09', usos: 40 }, '2026-10-09', 12, 300);
  assert.deepStrictEqual([ok.status, ok.usos, ok.usosG], ['ok', 3, 40]);
});

test('env invalida nao desliga o teto', () => {
  assert.strictEqual(V.numeroEnv('abc', 12), 12);
  assert.strictEqual(V.numeroEnv('0', 12), 12);
  assert.strictEqual(V.numeroEnv('-5', 12), 12);
  assert.strictEqual(V.numeroEnv('20', 12), 20);
});

test('prompt: canal Instagram, regras corrigidas e ramo', () => {
  const p = V.montarPrompt('moda');
  assert.ok(p.includes('DIRECT DO INSTAGRAM'));
  assert.ok(p.includes('Cancelar a renovação'));
  assert.ok(p.includes('loja de moda'));
  assert.ok(!/\btrial\b/i.test(p.split('=== CANAL')[1]));
  assert.ok(!V.montarPrompt('').includes('Esta pessoa disse'));
});

test('prompt: direct apresenta pela live e para quando a pessoa recusa', () => {
  const canal = V.montarPrompt('').split('=== CANAL')[1];
  assert.ok(canal.includes('live de vendas pelo celular'));
  assert.ok(canal.includes('Não abra falando de food truck'));
  assert.ok(canal.includes('sem\n  apresentar o produto'));
  assert.ok(canal.includes('Sem oferta, sem pergunta, sem insistir'));
});

test('resposta: sem markdown e ate 900 caracteres terminando em frase', () => {
  assert.strictEqual(V.limparResposta('**Sim!** Funciona.\n\n\n\nTeste'), 'Sim! Funciona.\n\nTeste');
  const longa = ('Frase completa aqui. ').repeat(80);
  const r = V.limparResposta(longa);
  assert.ok(r.length <= 900);
  assert.ok(r.endsWith('.'));
});

test('prompt: direct nao manda para a calculadora de taxas (25/10/2026)', () => {
  const { SYSTEM_PROMPT } = require('./promptAtendimento');
  assert.ok(SYSTEM_PROMPT.includes('calculadora-taxas-live-shop'));
  const p = V.montarPrompt('moda');
  assert.ok(!p.includes('calculadora-taxas-live-shop'));
  assert.ok(p.includes('Como recebo minha comissão?'));
  assert.ok(p.includes('NÃO mande para a calculadora'));
});

// --- 26/10/2026: caso "Perfeito" -> "Estou pronto para atender..." --------
const { respostaSegura } = require('./segurancaVik');

test('confirmacao curta: perfeito, ok, obrigada e emoji nao vao para a IA', () => {
  ['Perfeito', 'ok', 'Obrigada!!', 'show de bola', 'blz, vou dar uma olhada', '👍', 'kkk valeu'].forEach((t) => {
    assert.strictEqual(V.ehConfirmacaoCurta(t, ''), true, t);
  });
});

test('confirmacao curta: pergunta, frase com conteudo e "ok" depois de pergunta do Vik vao para a IA', () => {
  assert.strictEqual(V.ehConfirmacaoCurta('perfeito, e quanto custa?', ''), false);
  assert.strictEqual(V.ehConfirmacaoCurta('serve para otica', ''), false);
  assert.strictEqual(V.ehConfirmacaoCurta('sim', ''), false);
  assert.strictEqual(V.ehConfirmacaoCurta('ok', 'Quer ver a live de exemplo do seu ramo?'), false);
  assert.strictEqual(V.ehConfirmacaoCurta('', ''), false);
});

test('resposta de confirmacao: uma frase, sem falar de si e sem vistos', () => {
  ['Perfeito', 'obrigada', 'ok'].forEach((t, i) => {
    const r = V.respostaConfirmacao(t, 'c' + i, i);
    assert.ok(r.length < 120, r);
    assert.ok(respostaSegura(r).ok, r);
    assert.ok(!/✅|pronto/i.test(r), r);
  });
  assert.match(V.respostaConfirmacao('valeu', 'x', 0), /nada|Imagina/);
});

test('historico: resposta que falou de si sai junto com a mensagem que a provocou', () => {
  const ehMeta = (t) => { const c = respostaSegura(t); return !c.ok && c.motivo === 'resposta_meta'; };
  const h = [
    { role: 'user', texto: 'serve pra moda?' },
    { role: 'assistant', texto: 'Serve sim: você mostra as peças ao vivo e recebe no Pix.' },
    { role: 'user', texto: 'Perfeito' },
    { role: 'assistant', texto: 'Ótimo! Estou pronto para atender no WhatsApp, Instagram Direct ou qualquer canal da Moviki. Resumo do que tenho: ✅ planos ✅ parceiros ✅ teste' },
  ];
  const l = V.limparHistorico(h, ehMeta);
  assert.strictEqual(l.length, 2);
  assert.strictEqual(l[1].role, 'assistant');
});

test('prompt do direct abre pela situacao real e nao diz WhatsApp no papel', () => {
  const p = V.montarPrompt('moda');
  assert.ok(p.startsWith('=== SITUAÇÃO'));
  assert.ok(p.indexOf('respondendo pelo WhatsApp') === -1);
  assert.ok(p.indexOf('NUNCA, em hipótese alguma') !== -1);
});

test('limparResposta tira os vistos de lista', () => {
  const r = V.limparResposta('Planos:\n- ✅ Pró\n- ✅ Premium');
  assert.ok(r.indexOf('✅') === -1);
});
