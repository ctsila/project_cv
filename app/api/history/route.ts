import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const limit = rateLimit(`history-read:${getClientIp(req)}`, 60);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const items = await prisma.historyItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`history-write:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { type, title, details, payload } = await req.json();
  if (!type || !title) return NextResponse.json({ error: 'type and title are required.' }, { status: 400 });
  const item = await prisma.historyItem.create({ data: { userId, type, title, details, payload: payload || {} } });
  return NextResponse.json({ item });
}
