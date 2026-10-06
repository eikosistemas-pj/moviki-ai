// lib/admin.test.js (repo: moviki-ai) | 06/10/2026
// Dono so pelo Google: mesma regra do moviki-robo. Roda com: npm run teste
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { conferirAdmin } = require('./admin');

function dbFalso(admins) {
  return { collection: () => ({ doc: (uid) => ({ get: async () => ({ exists: admins.includes(uid) }) }) }) };
}
const db = dbFalso(['DONO']);

test('sem sessao: 401', async () => {
  assert.deepStrictEqual((await conferirAdmin(db, null)).status, 401);
});
test('nao admin: 403 nao_admin, mesmo pelo Google', async () => {
  const r = await conferirAdmin(db, { uid: 'OUTRO', firebase: { sign_in_provider: 'google.com' } });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.erro, 'nao_admin');
});
test('dono por senha: recusado', async () => {
  delete process.env.ADMIN_ACEITA_SENHA;
  const r = await conferirAdmin(db, { uid: 'DONO', firebase: { sign_in_provider: 'password' } });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.erro, 'entre_com_google');
});
test('dono pelo Google: aceito', async () => {
  const r = await conferirAdmin(db, { uid: 'DONO', firebase: { sign_in_provider: 'google.com' } });
  assert.strictEqual(r.ok, true);
});
test('emergencia ADMIN_ACEITA_SENHA=1: aceita senha', async () => {
  process.env.ADMIN_ACEITA_SENHA = '1';
  const r = await conferirAdmin(db, { uid: 'DONO', firebase: { sign_in_provider: 'password' } });
  delete process.env.ADMIN_ACEITA_SENHA;
  assert.strictEqual(r.ok, true);
});
