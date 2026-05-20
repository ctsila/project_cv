import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];
const APPLICATION_SELECT_BASE = {
  id: true,
  userId: true,
  jobPostingId: true,
  resumeVersionId: true,
  coverLetterVersionId: true,
  status: true,
  notes: true,
  reminderAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
let interviewAtColumnExists: boolean | null = null;

function getApplicationSelect(includeInterviewAt: boolean) {
  return includeInterviewAt
    ? { ...APPLICATION_SELECT_BASE, interviewAt: true }
    : APPLICATION_SELECT_BASE;
}

function getApplicationWithJobSelect(includeInterviewAt: boolean) {
  return {
    ...getApplicationSelect(includeInterviewAt),
    jobPosting: {
      select: {
        id: true,
        title: true,
        targetMarket: true,
        language: true,
      },
    },
  };
}

async function hasInterviewAtColumn() {
  if (interviewAtColumnExists !== null) return interviewAtColumnExists;
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Application'
        AND column_name = 'interviewAt'
    ) AS "exists"
  `;
  interviewAtColumnExists = Boolean(result?.[0]?.exists);
  return interviewAtColumnExists;
}
function normalizeStatus(value: unknown) {
  const status = String(value || 'Saved');
  return STATUSES.includes(status) ? status : 'Saved';
}
function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function errorPayload(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  const migrationHint = /interviewAt|column|does not exist|Unknown arg|Unknown field/i.test(detail)
    ? 'Database schema is not up to date. Run: npx prisma migrate dev --name add_interview_at_to_applications && npx prisma generate'
    : undefined;
  return { error: 'Application tracker operation failed.', detail: process.env.NODE_ENV === 'production' ? undefined : detail, migrationHint };
}
function buildUpdateData(body: any, includeInterviewAt: boolean) {
  const data: any = {};
  if ('status' in body) data.status = normalizeStatus(body.status);
  if ('notes' in body) data.notes = body.notes || null;
  if ('reminderAt' in body) data.reminderAt = parseDate(body.reminderAt);
  if (includeInterviewAt && 'interviewAt' in body) data.interviewAt = parseDate(body.interviewAt);
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const limit = rateLimit(`apps-read:${getClientIp(req)}`, 60);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
    const includeInterviewAt = await hasInterviewAtColumn();
    const items = await prisma.application.findMany({ where: { userId }, select: getApplicationWithJobSelect(includeInterviewAt), orderBy: { updatedAt: 'desc' }, take: 100 });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(errorPayload(error), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`apps-write:${getClientIp(req)}`, 30);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
    const body = await req.json();
    const includeInterviewAt = await hasInterviewAtColumn();
    const status = normalizeStatus(body.status || 'Saved');
    const jobPostingId = String(body.jobPostingId || '').trim();
    if (!jobPostingId) return NextResponse.json({ error: 'Select a parsed vacancy before saving to tracker.' }, { status: 400 });

    const job = await prisma.jobPosting.findFirst({ where: { id: jobPostingId, userId }, select: { id: true, title: true } });
    if (!job) return NextResponse.json({ error: 'Selected vacancy was not found for this account. Re-select the vacancy or parse it again.' }, { status: 404 });

    const existing = await prisma.application.findFirst({ where: { userId, jobPostingId }, select: { id: true } });
    const data: any = {
      resumeVersionId: body.resumeVersionId || null,
      coverLetterVersionId: body.coverLetterVersionId || null,
      status,
      notes: body.notes || null,
      reminderAt: parseDate(body.reminderAt),
    };
    if (includeInterviewAt) data.interviewAt = parseDate(body.interviewAt);

    const select = getApplicationSelect(includeInterviewAt);

    const application: any = existing
      ? await prisma.application.update({ where: { id: existing.id }, data, select })
      : await prisma.application.create({ data: { userId, jobPostingId, ...data }, select });

    const payload: any = { applicationId: application.id, jobPostingId };
    if (includeInterviewAt) payload.interviewAt = application.interviewAt || null;
    await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application: ${application.status}`, details: body.title || job.title || null, payload } });
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(errorPayload(error), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const limit = rateLimit(`apps-update:${getClientIp(req)}`, 40);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
    const body = await req.json();
    const includeInterviewAt = await hasInterviewAtColumn();
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

    const existing = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const application: any = await prisma.application.update({ where: { id }, data: buildUpdateData(body, includeInterviewAt), select: getApplicationSelect(includeInterviewAt) });
    const payload: any = { applicationId: application.id, status: application.status, reminderAt: application.reminderAt };
    if (includeInterviewAt) payload.interviewAt = application.interviewAt || null;
    await prisma.historyItem.create({ data: { userId, type: 'application', title: `Application updated: ${application.status}`, details: application.notes || null, payload } });
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(errorPayload(error), { status: 500 });
  }
}
