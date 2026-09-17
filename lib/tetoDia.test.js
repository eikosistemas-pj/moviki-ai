// Testes do teto de uso por dia do atendente do WhatsApp.
// Rodar:  node --test lib/tetoDia.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decidirTeto } = require('./tetoDia');

const HOJE = '2026-09-17';
const ONTEM = '2026-09-16';

test('conversa nova: passa e nao avisa', () => {
  const r = decidirTeto({}, HOJE, 30);
  assert.deepEqual(r, { usadas: 0, bloquear: false, avisar: false });
});

test('documento inexistente nao quebra', () => {
  assert.equal(decidirTeto(undefined, HOJE, 30).bloquear, false);
});

test('abaixo do teto: passa', () => {
  const r = decidirTeto({ botDia: HOJE, botUsos: 29 }, HOJE, 30);
  assert.equal(r.bloquear, false);
  assert.equal(r.usadas, 29);
});

test('no teto: bloqueia e avisa uma vez', () => {
  const r = decidirTeto({ botDia: HOJE, botUsos: 30 }, HOJE, 30);
  assert.equal(r.bloquear, true);
  assert.equal(r.avisar, true);
});

test('depois de avisar, fica calado', () => {
  const r = decidirTeto({ botDia: HOJE, botUsos: 45, botAvisoLimite: true }, HOJE, 30);
  assert.equal(r.bloquear, true);
  assert.equal(r.avisar, false, 'nao pode mandar mensagem a cada tentativa');
});

test('virada do dia zera o contador', () => {
  const r = decidirTeto({ botDia: ONTEM, botUsos: 999, botAvisoLimite: true }, HOJE, 30);
  assert.equal(r.usadas, 0);
  assert.equal(r.bloquear, false);
  assert.equal(r.avisar, false, 'o aviso de ontem nao vale hoje');
});

test('contador corrompido nao libera passe livre', () => {
  for (const lixo of ['muitas', null, NaN, {}, -5]) {
    const r = decidirTeto({ botDia: HOJE, botUsos: lixo }, HOJE, 30);
    assert.equal(r.bloquear, false, 'valor invalido vira 0, nunca bloqueio eterno');
    assert.ok(r.usadas >= -5, 'usadas segue numerico');
  }
});

test('teto zero bloqueia tudo (desliga o atendente pela variavel)', () => {
  const r = decidirTeto({}, HOJE, 0);
  assert.equal(r.bloquear, true);
  assert.equal(r.avisar, true);
});
