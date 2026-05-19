import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];
function normalizeStatus(value: unknown) {
  const status = String(value || 'Saved');
  return STATUSES.includes(status) ? status : 'Saved';
}
function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function buildUpdateData(body: any) {
  const data: any = {};
  if ('status' in body) data.status = normalizeStatus(body.status);
  if ('notes' in body) data.notes = body.notes || null;
  if ('reminderAt' in body) data.reminderAt = parseDate(body.reminderAt);
  if ('interviewAt' in body) data.interviewAt = parseDate(body.interviewAt);
  return data;
}

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
    take: 100,
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
  const status = normalizeStatus(body.status || 'Saved');
  const jobPostingId = body.jobPostingId || null;

  const existing = jobPostingId ? await prisma.application.findFirst({ where: { userId, jobPostingId } }) : null;
  const baseData: any = {
    userId,
    jobPostingId,
    resumeVersionId: body.resumeVersionId || null,
    coverLetterVersionId: body.coverLetterVersionId || null,
    status,
    notes: body.notes || null,
    reminderAt: parseDate(body.reminderAt),
    interviewAt: parseDate(body.interviewAt),
  };

  const application = existing
    ? await prisma.application.update({ where: { id: existing.id }, data: { ...baseData, userId: undefined, jobPostingId: undefined } })
    : await prisma.application.create({ data: baseData });

  await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application: ${application.status}`, details: body.title || null, payload: { applicationId: application.id, jobPostingId } } });
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

  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const application = await prisma.application.update({ where: { id }, data: buildUpdateData(body) });
  await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application updated: ${application.status}`, details: application.notes || null, payload: { applicationId: application.id, status: application.status, interviewAt: application.interviewAt, reminderAt: application.reminderAt } } });
  return NextResponse.json({ application });
}
