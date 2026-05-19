import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`register:${getClientIp(req)}`, 10);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
    const { name, country, email, password, uiLanguage } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    if (password && String(password).length < 8) return NextResponse.json({ error: 'Password must contain at least 8 characters.' }, { status: 400 });
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    const userData: any = { email: normalizedEmail, uiLanguage: uiLanguage || 'en', name: String(name || '').trim() || null, country: String(country || '').trim() || null };
    if (password) userData.passwordHash = await hash(password, 12);
    const user = await prisma.user.create({ data: userData });

    try {
      await prisma.historyItem.create({ data: { userId: user.id, type: 'account', title: 'Account created', details: country || null } });
    } catch (historyError) {
      console.error('Failed to record account history item:', historyError);
    }

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, country: user.country } });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
