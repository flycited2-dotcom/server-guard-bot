import fs from 'node:fs';

export type ServiceAction = 'status' | 'logs' | 'start' | 'restart' | 'stop';
export type ServiceKind = 'docker_compose' | 'systemd' | 'pm2';
export type ServerTransport = 'local';

export type BaseServiceDefinition = {
  id: string;
  title: string;
  kind: ServiceKind;
  actions: ServiceAction[];
};

export type DockerComposeService = BaseServiceDefinition & {
  kind: 'docker_compose';
  composePath: string;
  serviceName: string;
};

export type SystemdService = BaseServiceDefinition & {
  kind: 'systemd';
  unit: string;
};

export type Pm2Service = BaseServiceDefinition & {
  kind: 'pm2';
  processName: string;
};

export type ServiceDefinition = DockerComposeService | SystemdService | Pm2Service;

export type ServerDefinition = {
  id: string;
  title: string;
  transport: ServerTransport;
  services: ServiceDefinition[];
};

export type ServiceRegistry = {
  servers: ServerDefinition[];
};

const allowedActions = new Set<ServiceAction>(['status', 'logs', 'start', 'restart', 'stop']);
const allowedKinds = new Set<ServiceKind>(['docker_compose', 'systemd', 'pm2']);

function requireString(object: Record<string, unknown>, key: string): string {
  const value = object[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing string field: ${key}`);
  return value;
}

function parseActions(value: unknown): ServiceAction[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Service actions must be a non-empty array');
  return value.map(action => {
    if (typeof action !== 'string' || !allowedActions.has(action as ServiceAction)) {
      throw new Error(`Unsupported action: ${String(action)}`);
    }
    return action as ServiceAction;
  });
}

function parseService(raw: unknown): ServiceDefinition {
  if (!raw || typeof raw !== 'object') throw new Error('Service must be an object');
  const object = raw as Record<string, unknown>;
  const kind = object.kind;
  if (typeof kind !== 'string' || !allowedKinds.has(kind as ServiceKind)) throw new Error(`Unsupported service kind: ${String(kind)}`);
  const base = {
    id: requireString(object, 'id'),
    title: requireString(object, 'title'),
    kind: kind as ServiceKind,
    actions: parseActions(object.actions)
  };

  if (base.kind === 'docker_compose') {
    return { ...base, kind: 'docker_compose', composePath: requireString(object, 'composePath'), serviceName: requireString(object, 'serviceName') };
  }
  if (base.kind === 'systemd') {
    return { ...base, kind: 'systemd', unit: requireString(object, 'unit') };
  }
  return { ...base, kind: 'pm2', processName: requireString(object, 'processName') };
}

export function parseRegistry(raw: unknown): ServiceRegistry {
  if (!raw || typeof raw !== 'object') throw new Error('Registry must be an object');
  const serversRaw = (raw as Record<string, unknown>).servers;
  if (!Array.isArray(serversRaw) || !serversRaw.length) throw new Error('Registry must contain servers');

  const serverIds = new Set<string>();
  const servers = serversRaw.map(serverRaw => {
    if (!serverRaw || typeof serverRaw !== 'object') throw new Error('Server must be an object');
    const object = serverRaw as Record<string, unknown>;
    const id = requireString(object, 'id');
    if (serverIds.has(id)) throw new Error(`Duplicate server id: ${id}`);
    serverIds.add(id);
    if (object.transport !== 'local') throw new Error(`Unsupported transport: ${String(object.transport)}`);

    const serviceIds = new Set<string>();
    const servicesRaw = object.services;
    if (!Array.isArray(servicesRaw) || !servicesRaw.length) throw new Error(`Server ${id} must contain services`);
    const services = servicesRaw.map(parseService).map(service => {
      if (serviceIds.has(service.id)) throw new Error(`Duplicate service id: ${service.id}`);
      serviceIds.add(service.id);
      return service;
    });

    return {
      id,
      title: requireString(object, 'title'),
      transport: 'local' as const,
      services
    };
  });

  return { servers };
}

export function readRegistry(filePath: string): ServiceRegistry {
  return parseRegistry(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

export function findServer(registry: ServiceRegistry, serverId: string): ServerDefinition | undefined {
  return registry.servers.find(server => server.id === serverId);
}

export function findService(registry: ServiceRegistry, serverId: string, serviceId: string): ServiceDefinition | undefined {
  return findServer(registry, serverId)?.services.find(service => service.id === serviceId);
}

