import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limit = rateLimit(`confirm:${getClientIp(req)}`, 8);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const body = await req.json();
  const email = String(body.email || '').toLowerCase().trim();
  const token = String(body.token || '');
  const newPassword = String(body.newPassword || '');
  if (!email || !token || newPassword.length < 8) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier !== `password-reset:${email}` || record.expires < new Date()) return NextResponse.json({ error: 'Link is invalid or expired.' }, { status: 400 });
  const user = await prisma.user.update({ where: { email }, data: { passwordHash: await hash(newPassword, 12) } });
  await prisma.verificationToken.deleteMany({ where: { identifier: `password-reset:${email}` } });
  await prisma.historyItem.create({ data: { userId: user.id, type: 'security', title: 'Credential updated' } });
  return NextResponse.json({ ok: true });
}
