import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedTelegramActor } from '../src/security/auth.js';
import { verifyTotp, generateTotp } from '../src/security/totp.js';
import { ActionCooldown } from '../src/security/rate-limit.js';

test('allows only configured Telegram users and chats', () => {
  const policy = {
    userIds: new Set(['1001']),
    chatIds: new Set(['-2002'])
  };

  assert.equal(isAllowedTelegramActor(policy, { userId: 1001, chatId: -2002 }), true);
  assert.equal(isAllowedTelegramActor(policy, { userId: 9999, chatId: -2002 }), false);
  assert.equal(isAllowedTelegramActor(policy, { userId: 1001, chatId: -9999 }), false);
});

test('verifies TOTP codes without storing a reusable password', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const now = 1_763_000_000_000;
  const code = generateTotp(secret, now);

  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, '000000', now), false);
});

test('cooldown blocks repeated dangerous actions', () => {
  const cooldown = new ActionCooldown(60);
  const now = 1_000_000;

  assert.equal(cooldown.tryAcquire('1001', 'qa-agent.restart', now).allowed, true);
  assert.equal(cooldown.tryAcquire('1001', 'qa-agent.restart', now + 10_000).allowed, false);
  assert.equal(cooldown.tryAcquire('1001', 'qa-agent.restart', now + 61_000).allowed, true);
});
