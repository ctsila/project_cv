const memory = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export function rateLimit(key: string, max = Number(process.env.RATE_LIMIT_MAX || 30), windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  entry.count += 1;
  memory.set(key, entry);
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt };
}
