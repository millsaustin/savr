import { guardrailsConfig } from '../config/guardrails';
import { hashIp } from '../lib/ip';

type RateWindow = {
  window30s: number[];
  windowDay: number[];
};

const THIRTY_SECONDS_MS = 30_000;
const DAY_MS = 86_400_000;

const rateStore = new Map<string, RateWindow>();

function buildKey(userId: string | undefined, ipHash: string): string {
  return `user:${userId ?? 'anon'}|ip:${ipHash}`;
}

function getOrInitWindow(key: string): RateWindow {
  let entry = rateStore.get(key);
  if (!entry) {
    entry = { window30s: [], windowDay: [] };
    rateStore.set(key, entry);
  }
  return entry;
}

function pruneWindows(entry: RateWindow, now: number) {
  entry.window30s = entry.window30s.filter(
    (timestamp) => now - timestamp < THIRTY_SECONDS_MS,
  );
  entry.windowDay = entry.windowDay.filter(
    (timestamp) => now - timestamp < DAY_MS,
  );
}

export async function hashClientIp(ip: string): Promise<string> {
  const safeIp =
    typeof ip === 'string' && ip.trim().length > 0 ? ip.trim() : 'unknown';
  return hashIp(safeIp, guardrailsConfig.ipHashSalt);
}

async function evaluateLimit(
  userId: string | undefined,
  ipHash: string,
): Promise<{ hit: boolean; window: string }> {
  const key = buildKey(userId, ipHash);
  const now = Date.now();
  const entry = getOrInitWindow(key);

  pruneWindows(entry, now);

  if (entry.window30s.length >= guardrailsConfig.requestsPer30s) {
    return { hit: true, window: '30s' };
  }

  if (entry.windowDay.length >= guardrailsConfig.requestsPerDay) {
    return { hit: true, window: '24h' };
  }

  entry.window30s.push(now);
  entry.windowDay.push(now);

  return { hit: false, window: 'ok' };
}

export async function checkRateLimit({
  userId,
  ip,
}: {
  userId?: string;
  ip: string;
}): Promise<{ hit: boolean; window: string }> {
  const ipHash = await hashClientIp(ip);
  return evaluateLimit(userId, ipHash);
}

export async function checkRateLimitWithHash({
  userId,
  ipHash,
}: {
  userId?: string;
  ipHash: string;
}): Promise<{ hit: boolean; window: string }> {
  return evaluateLimit(userId, ipHash);
}
