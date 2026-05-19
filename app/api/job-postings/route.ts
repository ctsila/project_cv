import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const limit = rateLimit(`job-read:${getClientIp(req)}`, 60);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const items = await prisma.jobPosting.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`job-write:${getClientIp(req)}`, 30);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const title = String(body.title || 'Parsed vacancy');
  const company = String(body.company || 'Target company');
  const sourceText = String(body.sourceText || '');
  if (!sourceText || sourceText.length < 80) return NextResponse.json({ error: 'Vacancy text is required.' }, { status: 400 });

  const job = await prisma.jobPosting.create({
    data: {
      userId,
      title,
      sourceUrl: body.sourceUrl || null,
      sourceText,
      language: body.language || 'en',
      targetMarket: body.targetMarket || 'EU',
      analysis: body.analysis || {},
      companySignals: body.companySignals || [],
    },
  });

  await prisma.historyItem.create({ data: { userId, type: 'vacancy', title, details: company } });
  return NextResponse.json({ job });
}
