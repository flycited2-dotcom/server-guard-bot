import type { ServiceRegistry, ServerDefinition, ServiceDefinition, ServiceAction } from '../config/registry.js';
import type { InlineKeyboard } from './api.js';

export function mainKeyboard(registry: ServiceRegistry): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: 'РЎС‚Р°С‚СѓСЃ СЃРµСЂРІРµСЂРѕРІ', callback_data: 'health:all' }],
      ...registry.servers.map(server => [{ text: server.title, callback_data: `server:${server.id}` }])
    ]
  };
}

export function serverKeyboard(server: ServerDefinition): InlineKeyboard {
  return {
    inline_keyboard: [
      ...server.services.map(service => [{ text: service.title, callback_data: `service:${server.id}:${service.id}` }]),
      [{ text: 'РќР°Р·Р°Рґ', callback_data: 'menu:main' }]
    ]
  };
}

const actionLabels: Record<ServiceAction, string> = {
  status: 'РЎС‚Р°С‚СѓСЃ',
  logs: 'Р›РѕРіРё',
  start: 'Р—Р°РїСѓСЃС‚РёС‚СЊ',
  restart: 'РџРµСЂРµР·Р°РїСѓСЃС‚РёС‚СЊ',
  stop: 'РћСЃС‚Р°РЅРѕРІРёС‚СЊ'
};

export function serviceKeyboard(serverId: string, service: ServiceDefinition): InlineKeyboard {
  return {
    inline_keyboard: [
      service.actions.map(action => ({ text: actionLabels[action], callback_data: `action:${serverId}:${service.id}:${action}` })),
      [{ text: 'РќР°Р·Р°Рґ', callback_data: `server:${serverId}` }]
    ]
  };
}

