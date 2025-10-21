import { createHmac } from 'crypto';

export function hashIp(ip: string, salt: string): string {
  const normalizedIp = typeof ip === 'string' ? ip.trim() : '';
  const normalizedSalt = typeof salt === 'string' ? salt : '';

  return createHmac('sha256', normalizedSalt)
    .update(normalizedIp)
    .digest('hex');
}
