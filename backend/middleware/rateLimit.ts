import { NextRequest, NextResponse } from 'next/server';

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: NextRequest, limit = 30, windowMs = 60_000) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  return null;
}
