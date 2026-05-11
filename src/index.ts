import { readRegistry } from './config/registry.js';
import { readConfig } from './env.js';
import { ServerGuardBot } from './telegram/bot.js';

const config = readConfig();
const registry = readRegistry(config.registryPath);

console.log(`Server Guard Bot started. Servers: ${registry.servers.map(server => server.id).join(', ')}`);
await new ServerGuardBot(config, registry).pollForever();

