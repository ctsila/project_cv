import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limit = rateLimit(`reset:${getClientIp(req)}`, 8);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many password reset attempts. Try again later.' }, { status: 429 });
  const { email } = await req.json();
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return NextResponse.json({ ok: true });
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.verificationToken.create({ data: { identifier: `password-reset:${normalizedEmail}`, token, expires: new Date(Date.now() + 1000 * 60 * 30) } });
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  await sendPasswordResetEmail(normalizedEmail, `${base}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`);
  await prisma.historyItem.create({ data: { userId: user.id, type: 'security', title: 'Password reset requested' } });
  return NextResponse.json({ ok: true });
}
