export type CooldownResult = {
  allowed: boolean;
  retryAfterMs: number;
};

export class ActionCooldown {
  private readonly lastSeen = new Map<string, number>();

  constructor(private readonly cooldownSeconds: number) {}

  tryAcquire(actorId: string, actionId: string, nowMs = Date.now()): CooldownResult {
    const key = `${actorId}:${actionId}`;
    const previous = this.lastSeen.get(key) || 0;
    const cooldownMs = this.cooldownSeconds * 1000;
    const elapsed = nowMs - previous;
    if (previous && elapsed < cooldownMs) {
      return { allowed: false, retryAfterMs: cooldownMs - elapsed };
    }
    this.lastSeen.set(key, nowMs);
    return { allowed: true, retryAfterMs: 0 };
  }
}

