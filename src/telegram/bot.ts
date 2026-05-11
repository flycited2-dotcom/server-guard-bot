import { findServer, findService, type ServiceAction, type ServiceRegistry } from '../config/registry.js';
import { executeLocal } from '../executors/local-executor.js';
import type { AppConfig } from '../env.js';
import { isAllowedTelegramActor } from '../security/auth.js';
import { ActionCooldown } from '../security/rate-limit.js';
import { verifyTotp } from '../security/totp.js';
import { buildServiceCommand, mutatingActions } from '../services/actions.js';
import { writeAudit } from '../services/audit.js';
import { TelegramApi, type TelegramCallbackQuery, type TelegramMessage } from './api.js';
import { mainKeyboard, serverKeyboard, serviceKeyboard } from './keyboards.js';

type PendingAction = {
  chatId: string;
  userId: string;
  serverId: string;
  serviceId: string;
  action: ServiceAction;
  requestedAt: number;
};

export class ServerGuardBot {
  private readonly api: TelegramApi;
  private readonly cooldown: ActionCooldown;
  private readonly pending = new Map<string, PendingAction>();

  constructor(
    private readonly config: AppConfig,
    private readonly registry: ServiceRegistry
  ) {
    this.api = new TelegramApi(config.telegramToken);
    this.cooldown = new ActionCooldown(config.mutationCooldownSeconds);
  }

  async pollForever(): Promise<void> {
    let offset = 0;
    while (true) {
      try {
        const updates = await this.api.getUpdates(offset);
        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.callback_query) await this.handleCallback(update.callback_query);
          if (update.message) await this.handleMessage(update.message);
        }
      } catch (error) {
        console.log(`Telegram polling error: ${(error as Error).message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private allowed(userId: string | number | undefined, chatId: string | number | undefined): boolean {
    const ok = isAllowedTelegramActor({
      userIds: this.config.allowedUserIds,
      chatIds: this.config.allowedChatIds
    }, { userId, chatId });
    if (!ok) {
      writeAudit(this.config.auditLogPath, { type: 'denied', userId: String(userId || ''), chatId: String(chatId || ''), message: 'Telegram actor rejected by allowlist' });
    }
    return ok;
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const userId = String(message.from?.id || '');
    const chatId = String(message.chat.id);
    if (!this.allowed(userId, chatId)) return;

    const text = (message.text || '').trim();
    const pending = this.pending.get(userId);
    if (pending && /^\d{6}$/.test(text)) {
      await this.confirmPending(pending, text);
      return;
    }

    await this.api.sendMessage(chatId, 'Server Guard Bot: РІС‹Р±РµСЂРёС‚Рµ СЃРµСЂРІРµСЂ РёР»Рё РґРµР№СЃС‚РІРёРµ.', mainKeyboard(this.registry));
  }

  private async handleCallback(callback: TelegramCallbackQuery): Promise<void> {
    const userId = String(callback.from.id);
    const chatId = String(callback.message?.chat.id || '');
    if (!this.allowed(userId, chatId)) return;
    await this.api.answerCallback(callback.id);

    const data = callback.data || '';
    if (data === 'menu:main') {
      await this.api.sendMessage(chatId, 'Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ.', mainKeyboard(this.registry));
      return;
    }

    if (data === 'health:all') {
      await this.sendAllStatuses(chatId);
      return;
    }

    if (data.startsWith('server:')) {
      const server = findServer(this.registry, data.slice('server:'.length));
      await this.api.sendMessage(chatId, server ? `РЎРµСЂРІРµСЂ: ${server.title}` : 'РЎРµСЂРІРµСЂ РЅРµ РЅР°Р№РґРµРЅ.', server ? serverKeyboard(server) : mainKeyboard(this.registry));
      return;
    }

    if (data.startsWith('service:')) {
      const [, serverId, serviceId] = data.split(':');
      const service = findService(this.registry, serverId, serviceId);
      await this.api.sendMessage(chatId, service ? `РЎРµСЂРІРёСЃ: ${service.title}` : 'РЎРµСЂРІРёСЃ РЅРµ РЅР°Р№РґРµРЅ.', service ? serviceKeyboard(serverId, service) : mainKeyboard(this.registry));
      return;
    }

    if (data.startsWith('action:')) {
      const [, serverId, serviceId, actionRaw] = data.split(':');
      await this.requestAction(chatId, userId, serverId, serviceId, actionRaw as ServiceAction);
    }
  }

  private async sendAllStatuses(chatId: string): Promise<void> {
    const lines: string[] = [];
    for (const server of this.registry.servers) {
      lines.push(`РЎРµСЂРІРµСЂ: ${server.title}`);
      for (const service of server.services) {
        if (!service.actions.includes('status')) continue;
        const result = await executeLocal(buildServiceCommand(service, 'status', this.config.logLinesDefault), { useSudo: this.config.useSudo });
        lines.push(`\n${service.title}\n${formatResult(result.stdout, result.stderr, result.code)}`);
      }
    }
    await this.api.sendMessage(chatId, lines.join('\n').slice(0, 3900), mainKeyboard(this.registry));
  }

  private async requestAction(chatId: string, userId: string, serverId: string, serviceId: string, action: ServiceAction): Promise<void> {
    const service = findService(this.registry, serverId, serviceId);
    if (!service) {
      await this.api.sendMessage(chatId, 'РЎРµСЂРІРёСЃ РЅРµ РЅР°Р№РґРµРЅ.', mainKeyboard(this.registry));
      return;
    }

    if (mutatingActions.has(action)) {
      const actionId = `${serverId}.${serviceId}.${action}`;
      const cooldown = this.cooldown.tryAcquire(userId, actionId);
      if (!cooldown.allowed) {
        await this.api.sendMessage(chatId, `РџРѕРІС‚РѕСЂРЅРѕРµ РѕРїР°СЃРЅРѕРµ РґРµР№СЃС‚РІРёРµ РІСЂРµРјРµРЅРЅРѕ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ. РџРѕРґРѕР¶РґРёС‚Рµ ${Math.ceil(cooldown.retryAfterMs / 1000)} СЃРµРє.`);
        return;
      }
      this.pending.set(userId, { chatId, userId, serverId, serviceId, action, requestedAt: Date.now() });
      writeAudit(this.config.auditLogPath, { type: 'requested', userId, chatId, serverId, serviceId, action, message: 'Mutation action requested and waiting for TOTP' });
      await this.api.sendMessage(chatId, `РџРѕРґС‚РІРµСЂРґРёС‚Рµ РґРµР№СЃС‚РІРёРµ "${action}" РґР»СЏ "${service.title}" TOTP-РєРѕРґРѕРј РёР· 6 С†РёС„СЂ.`);
      return;
    }

    await this.executeAction(chatId, userId, serverId, serviceId, action);
  }

  private async confirmPending(pending: PendingAction, code: string): Promise<void> {
    this.pending.delete(pending.userId);
    if (Date.now() - pending.requestedAt > 120_000) {
      await this.api.sendMessage(pending.chatId, 'РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ СѓСЃС‚Р°СЂРµР»Рѕ. РќР°Р¶РјРёС‚Рµ РґРµР№СЃС‚РІРёРµ Р·Р°РЅРѕРІРѕ.');
      return;
    }
    if (!verifyTotp(this.config.totpSecret, code)) {
      writeAudit(this.config.auditLogPath, { type: 'denied', userId: pending.userId, chatId: pending.chatId, serverId: pending.serverId, serviceId: pending.serviceId, action: pending.action, message: 'Invalid TOTP code' });
      await this.api.sendMessage(pending.chatId, 'РљРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РЅРµРІРµСЂРЅС‹Р№.');
      return;
    }
    writeAudit(this.config.auditLogPath, { type: 'confirmed', userId: pending.userId, chatId: pending.chatId, serverId: pending.serverId, serviceId: pending.serviceId, action: pending.action, message: 'Mutation action confirmed by TOTP' });
    await this.executeAction(pending.chatId, pending.userId, pending.serverId, pending.serviceId, pending.action);
  }

  private async executeAction(chatId: string, userId: string, serverId: string, serviceId: string, action: ServiceAction): Promise<void> {
    const service = findService(this.registry, serverId, serviceId);
    if (!service) throw new Error(`Service not found: ${serverId}/${serviceId}`);
    const command = buildServiceCommand(service, action, this.config.logLinesDefault);
    const result = await executeLocal(command, { useSudo: this.config.useSudo });
    const type = result.code === 0 ? 'executed' : 'failed';
    writeAudit(this.config.auditLogPath, { type, userId, chatId, serverId, serviceId, action, message: `Exit code ${result.code}` });
    await this.api.sendMessage(chatId, `${service.title}: ${action}\n${formatResult(result.stdout, result.stderr, result.code)}`, serviceKeyboard(serverId, service));
  }
}

function formatResult(stdout: string, stderr: string, code: number | null): string {
  const body = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  return `exit=${code}\n${body || 'РќРµС‚ РІС‹РІРѕРґР°.'}`.slice(0, 3500);
}
