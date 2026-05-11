import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServiceCommand } from '../src/services/actions.js';
import type { ServiceDefinition } from '../src/config/registry.js';

test('builds docker compose commands without shell strings', () => {
  const service: ServiceDefinition = {
    id: 'qa-agent',
    title: 'QA Agent',
    kind: 'docker_compose',
    composePath: '/root/climat-simf-qa-agent/docker-compose.yml',
    serviceName: 'qa-agent',
    actions: ['status', 'logs', 'restart']
  };

  assert.deepEqual(buildServiceCommand(service, 'restart'), {
    command: 'docker',
    args: ['compose', '-f', '/root/climat-simf-qa-agent/docker-compose.yml', 'restart', 'qa-agent'],
    timeoutMs: 120_000
  });
});

test('refuses actions not listed on the service', () => {
  const service: ServiceDefinition = {
    id: 'parser-admin-bot',
    title: 'Parser Bot',
    kind: 'systemd',
    unit: 'parser_admin_bot.service',
    actions: ['status']
  };

  assert.throws(() => buildServiceCommand(service, 'restart'), /Action restart is not allowed/);
});
