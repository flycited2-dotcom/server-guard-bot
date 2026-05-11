import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistry } from '../src/config/registry.js';

test('parses the initial service registry', () => {
  const registry = parseRegistry({
    servers: [{
      id: 'main-vps',
      title: 'Main VPS',
      transport: 'local',
      services: [{
        id: 'qa-agent',
        title: 'QA Agent',
        kind: 'docker_compose',
        composePath: '/root/climat-simf-qa-agent/docker-compose.yml',
        serviceName: 'qa-agent',
        actions: ['status', 'logs', 'restart']
      }]
    }]
  });

  assert.equal(registry.servers[0].services[0].id, 'qa-agent');
});

test('rejects duplicate service ids and unknown actions', () => {
  assert.throws(() => parseRegistry({
    servers: [{
      id: 'main-vps',
      title: 'Main VPS',
      transport: 'local',
      services: [
        {
          id: 'qa-agent',
          title: 'QA Agent',
          kind: 'docker_compose',
          composePath: '/x/docker-compose.yml',
          serviceName: 'qa-agent',
          actions: ['restart']
        },
        {
          id: 'qa-agent',
          title: 'Duplicate',
          kind: 'systemd',
          unit: 'x.service',
          actions: ['restart']
        }
      ]
    }]
  }), /Duplicate service id/);

  assert.throws(() => parseRegistry({
    servers: [{
      id: 'main-vps',
      title: 'Main VPS',
      transport: 'local',
      services: [{
        id: 'bad',
        title: 'Bad',
        kind: 'systemd',
        unit: 'bad.service',
        actions: ['exec']
      }]
    }]
  }), /Unsupported action/);
});
