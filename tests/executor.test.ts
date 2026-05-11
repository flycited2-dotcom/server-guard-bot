import test from 'node:test';
import assert from 'node:assert/strict';
import { executeLocal } from '../src/executors/local-executor.js';

test('local executor can run a command without shell expansion', async () => {
  const result = await executeLocal({
    command: process.execPath,
    args: ['-e', 'console.log("ok")'],
    timeoutMs: 10_000
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), 'ok');
  assert.equal(result.stderr.trim(), '');
});
