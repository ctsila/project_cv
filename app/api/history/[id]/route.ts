import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limit = rateLimit(`history-detail:${getClientIp(req)}`, 60);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const item = await prisma.historyItem.findFirst({ where: { id: params.id, userId } });
  if (!item) return NextResponse.json({ error: 'History item not found.' }, { status: 404 });
  const payload = item.payload as any;
  const [resume, coverLetter, jobPosting, cvSource] = await Promise.all([
    payload?.resumeVersionId ? prisma.resumeVersion.findFirst({ where: { id: payload.resumeVersionId, userId } }) : null,
    payload?.coverLetterVersionId ? prisma.coverLetterVersion.findFirst({ where: { id: payload.coverLetterVersionId, userId } }) : null,
    payload?.jobPostingId ? prisma.jobPosting.findFirst({ where: { id: payload.jobPostingId, userId } }) : null,
    payload?.cvSourceId ? prisma.cvSource.findFirst({ where: { id: payload.cvSourceId, userId } }) : null,
  ]);
  return NextResponse.json({ item, resume, coverLetter, jobPosting, cvSource });
}
