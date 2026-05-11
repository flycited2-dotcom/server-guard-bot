import dotenv from 'dotenv';
import { parseIdSet } from './security/auth.js';

dotenv.config();

export type AppConfig = {
  telegramToken: string;
  allowedUserIds: Set<string>;
  allowedChatIds: Set<string>;
  totpSecret: string;
  registryPath: string;
  auditLogPath: string;
  logLinesDefault: number;
  mutationCooldownSeconds: number;
  useSudo: boolean;
};

export function readConfig(): AppConfig {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!telegramToken) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const totpSecret = process.env.TOTP_SECRET_BASE32 || '';
  if (!totpSecret) throw new Error('TOTP_SECRET_BASE32 is required');

  return {
    telegramToken,
    allowedUserIds: parseIdSet(process.env.ALLOWED_TELEGRAM_USER_IDS),
    allowedChatIds: parseIdSet(process.env.ALLOWED_CHAT_IDS),
    totpSecret,
    registryPath: process.env.SERVICE_REGISTRY_PATH || 'config/services.example.json',
    auditLogPath: process.env.AUDIT_LOG_PATH || 'audit/server-guard.jsonl',
    logLinesDefault: Number(process.env.LOG_LINES_DEFAULT || 80),
    mutationCooldownSeconds: Number(process.env.MUTATION_COOLDOWN_SECONDS || 60),
    useSudo: (process.env.USE_SUDO || 'false') === 'true'
  };
}
