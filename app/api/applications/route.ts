import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const limit = rateLimit(`apps-read:${getClientIp(req)}`, 60);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const items = await prisma.application.findMany({
    where: { userId },
    include: { jobPosting: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`apps-write:${getClientIp(req)}`, 30);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const status = String(body.status || 'Saved');
  const jobPostingId = body.jobPostingId || null;

  const application = await prisma.application.create({
    data: {
      userId,
      jobPostingId,
      resumeVersionId: body.resumeVersionId || null,
      coverLetterVersionId: body.coverLetterVersionId || null,
      status,
      notes: body.notes || null,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
    },
  });

  await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application: ${status}`, details: body.title || null } });
  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest) {
  const limit = rateLimit(`apps-update:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  await prisma.application.updateMany({
    where: { id, userId },
    data: {
      status: body.status || undefined,
      notes: body.notes || undefined,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : undefined,
    },
  });

  const application = await prisma.application.findFirst({ where: { id, userId } });
  if (!application) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application updated: ${application.status}` } });
  return NextResponse.json({ application });
}
