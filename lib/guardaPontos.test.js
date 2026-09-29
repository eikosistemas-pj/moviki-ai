// Testes da conta de risco da Guarda anticlonagem.
// Rodar:  node --test lib/guardaPontos.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('./guardaPontos');

const T0 = Date.parse('2026-09-28T15:00:00Z');

function dia(lotes, extra) {
  let h = null;
  for (const l of lotes) h = G.somar(h, G.limparLote(l), T0);
  return { hoje: h, ...G.pontuar(h, extra) };
}

test('lojista comum configurando o painel: nao alerta', () => {
  const r = dia([{ c: { print: 3, sel_tudo: 1 }, max10: 14, telas: ['aaaa1', 'bbbb2'] }], { contaNovaH: 2 });
  assert.ok(r.pontos < 50, 'pontos ' + r.pontos);
  assert.equal(G.decidir({ pontos: r.pontos, cfg: {} }).estado, 'ok');
});

test('muitos prints sozinhos nunca travam (teto do sinal)', () => {
  const r = dia([{ c: { print: 50 } }, { c: { print: 50 } }], { contaNovaH: 1 });
  assert.equal(r.pontos, 15); // 10 de teto x 1,5 de conta nova
});

test('varredura sistematica em conta nova chega ao alerta', () => {
  const r = dia([{ max10: 35, c: { atalho_dev: 1 } }], { contaNovaH: 5 });
  assert.equal(r.pontos, Math.round((40 + 5) * 1.5));
  assert.equal(G.decidir({ pontos: r.pontos, cfg: {} }).estado, 'alerta');
});

test('clonador: varredura grande + ver fonte + salvar pagina -> congelado', () => {
  const r = dia([{ max10: 55, c: { ver_fonte: 1, salvar: 1, atalho_dev: 2 } }], { contaNovaH: 10 });
  const d = G.decidir({ pontos: r.pontos, cfg: {} });
  assert.equal(d.estado, 'congelado');
});

test('robo comprovado suspende na hora', () => {
  const d = G.decidir({ pontos: 0, robo: ['webdriver'], cfg: {} });
  assert.deepEqual([d.estado, d.mudou], ['suspenso', true]);
});

test('modo observar nunca trava', () => {
  const d = G.decidir({ pontos: 999, robo: ['webdriver'], cfg: { modo: 'observar' } });
  assert.equal(d.estado, 'alerta');
});

test('estado mais grave nunca volta sozinho', () => {
  const d = G.decidir({ pontos: 0, estadoAtual: 'banido', cfg: {} });
  assert.deepEqual([d.estado, d.mudou], ['banido', false]);
});

test('aparelho banido congela; aparelho so parecido apenas pontua', () => {
  assert.equal(G.decidir({ pontos: 0, aparelhoBanido: true, cfg: {} }).estado, 'congelado');
  const r = dia([{}], { parecidoBanido: true });
  assert.equal(r.pontos, 30);
  assert.equal(G.decidir({ pontos: r.pontos, cfg: {} }).estado, 'ok');
});

test('lote adulterado: nomes desconhecidos, negativos e exagero sao descartados', () => {
  const l = G.limparLote({ c: { print: -5, inventado: 99, salvar: 1e9 }, telas: ['<script>', 'ok12'], robo: [1, 'x'.repeat(90)] });
  assert.deepEqual(l.c, { salvar: 50 });
  assert.deepEqual(l.telas, ['ok12']);
  assert.equal(l.robo.length, 1);
  assert.equal(l.robo[0].length, 40);
});

test('dia virou: acumulado recomeca', () => {
  const ontem = { dia: '2026-09-27', c: { salvar: 9 }, telas: ['aaaa'], max10: 60, ritmo: true, robo: [] };
  const h = G.somar(ontem, G.limparLote({ c: { print: 1 } }), T0);
  assert.deepEqual(h.c, { print: 1 });
  assert.equal(h.max10, 0);
});

test('config: congelar nunca abaixo do alerta, opacidade limitada', () => {
  const c = G.cfgNormalizada({ alerta: 80, congelar: 20, opacidade: 5 });
  assert.equal(c.congelar, 80);
  assert.equal(c.opacidade, 0.12);
});

test('marca: 6 caracteres do alfabeto sem ambiguidade', () => {
  for (let i = 0; i < 200; i++) assert.ok(G.marcaValida(G.marcaNova()));
  assert.equal(G.marcaValida('ABC10O'), false);
});

test('alerta volta a ok quando o risco some (nao e trava)', () => {
  const d = G.decidir({ pontos: 0, estadoAtual: 'alerta', cfg: {} });
  assert.deepEqual([d.estado, d.mudou], ['ok', true]);
});
