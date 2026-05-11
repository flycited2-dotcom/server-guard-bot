import fs from 'node:fs';
import path from 'node:path';

export type AuditEvent = {
  type: 'allowed' | 'denied' | 'requested' | 'confirmed' | 'executed' | 'failed';
  userId?: string;
  chatId?: string;
  serverId?: string;
  serviceId?: string;
  action?: string;
  message: string;
  at?: string;
};

export function writeAudit(filePath: string, event: AuditEvent): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const line = JSON.stringify({ ...event, at: event.at || new Date().toISOString() });
  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

