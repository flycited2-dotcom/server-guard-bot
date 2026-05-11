import type { ServiceAction, ServiceDefinition } from '../config/registry.js';

export type CommandSpec = {
  command: string;
  args: string[];
  timeoutMs: number;
};

export const mutatingActions = new Set<ServiceAction>(['start', 'restart', 'stop']);

export function buildServiceCommand(service: ServiceDefinition, action: ServiceAction, logLines = 80): CommandSpec {
  if (!service.actions.includes(action)) {
    throw new Error(`Action ${action} is not allowed for service ${service.id}`);
  }

  if (service.kind === 'docker_compose') {
    const base = ['compose', '-f', service.composePath];
    if (action === 'status') return { command: 'docker', args: [...base, 'ps', service.serviceName], timeoutMs: 30_000 };
    if (action === 'logs') return { command: 'docker', args: [...base, 'logs', '--tail', String(logLines), service.serviceName], timeoutMs: 30_000 };
    return { command: 'docker', args: [...base, action, service.serviceName], timeoutMs: 120_000 };
  }

  if (service.kind === 'systemd') {
    if (action === 'status') return { command: 'systemctl', args: ['status', service.unit, '--no-pager', '-l'], timeoutMs: 30_000 };
    if (action === 'logs') return { command: 'journalctl', args: ['-u', service.unit, '--no-pager', '-n', String(logLines)], timeoutMs: 30_000 };
    return { command: 'systemctl', args: [action, service.unit], timeoutMs: 120_000 };
  }

  if (action === 'status') return { command: 'pm2', args: ['describe', service.processName], timeoutMs: 30_000 };
  if (action === 'logs') return { command: 'pm2', args: ['logs', service.processName, '--lines', String(logLines), '--nostream'], timeoutMs: 30_000 };
  return { command: 'pm2', args: [action, service.processName], timeoutMs: 120_000 };
}

