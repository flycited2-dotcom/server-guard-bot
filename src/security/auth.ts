export type TelegramAuthPolicy = {
  userIds: Set<string>;
  chatIds: Set<string>;
};

export type TelegramActor = {
  userId?: number | string;
  chatId?: number | string;
};

export function parseIdSet(value: string | undefined): Set<string> {
  return new Set((value || '').split(',').map(item => item.trim()).filter(Boolean));
}

export function isAllowedTelegramActor(policy: TelegramAuthPolicy, actor: TelegramActor): boolean {
  if (!actor.userId || !actor.chatId) return false;
  if (!policy.userIds.size || !policy.chatIds.size) return false;
  return policy.userIds.has(String(actor.userId)) && policy.chatIds.has(String(actor.chatId));
}

