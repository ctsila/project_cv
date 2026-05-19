import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const limit = rateLimit(`job-latest:${getClientIp(req)}`, 60);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const job = await prisma.jobPosting.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ job: job || null });
}
