import crypto from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(value: string): Buffer {
  const clean = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

export function generateTotp(secretBase32: string, nowMs = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(nowMs / 1000 / stepSeconds);
  return hotp(base32Decode(secretBase32), counter);
}

export function verifyTotp(secretBase32: string, code: string, nowMs = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const stepSeconds = 30;
  const baseCounter = Math.floor(nowMs / 1000 / stepSeconds);
  const secret = base32Decode(secretBase32);
  for (let offset = -window; offset <= window; offset++) {
    if (hotp(secret, baseCounter + offset) === code) return true;
  }
  return false;
}

