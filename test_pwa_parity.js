const test = require('node:test');
const assert = require('node:assert/strict');

require('./pwa/app.js');

const { generatePassword } = globalThis.HAnWordPWA;

test('pwa matches desktop output for default inputs', async () => {
  const password = await generatePassword('你好', 16);
  assert.equal(password, 'ge#dV0y|CUBf22=f');
});

test('pwa matches desktop output with mode and context', async () => {
  const password = await generatePassword('中国', 24, 'example.com', 'site');
  assert.equal(password, 'Em.#Lvny8}[O!kr1@e(PZqS3');
});

test('pwa normalization matches desktop output', async () => {
  const password = await generatePassword(' 你好 ', 16, ' GitHub.com ', 'site');
  assert.equal(password, 'B1BF:0H,65paHF5U');
});
