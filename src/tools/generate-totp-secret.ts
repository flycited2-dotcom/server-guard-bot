import crypto from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(buffer: Buffer): string {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let offset = 0; offset < bits.length; offset += 5) {
    const chunk = bits.slice(offset, offset + 5).padEnd(5, '0');
    output += alphabet[Number.parseInt(chunk, 2)];
  }
  return output;
}

const secret = toBase32(crypto.randomBytes(20));
console.log(secret);
console.log(`otpauth://totp/ServerGuardBot?secret=${secret}&issuer=ServerGuardBot`);

