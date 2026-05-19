import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

function toClientProfile(profile: any) {
  return {
    id: profile.id,
    name: profile.name || '',
    title: profile.title || '',
    email: profile.user?.email || '',
    location: profile.location || '',
    links: profile.links || [],
    summary: profile.summary || '',
    skills: profile.skills || [],
    experience: (profile.experiences || []).map((e: any) => ({
      id: e.id,
      company: e.company,
      role: e.role,
      location: e.location || '',
      start: e.startDate || '',
      end: e.endDate || '',
      bullets: e.bullets || [],
      evidence: e.evidence || [],
    })),
  };
}

export async function GET(req: NextRequest) {
  const limit = rateLimit(`profile-read:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const profile = await prisma.careerProfile.findFirst({
    where: { userId },
    include: { experiences: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: toClientProfile(profile) });
}

export async function PUT(req: NextRequest) {
  const limit = rateLimit(`profile-write:${getClientIp(req)}`, 20);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  if (!body) return NextResponse.json({ error: 'Profile payload is required.' }, { status: 400 });

  const existing = await prisma.careerProfile.findFirst({ where: { userId } });
  const profile = await prisma.careerProfile.upsert({
    where: { id: existing?.id || 'missing' },
    create: {
      userId,
      name: body.name || null,
      title: body.title || null,
      location: body.location || null,
      summary: body.summary || null,
      links: body.links || [],
      skills: body.skills || [],
      evidence: body.evidence || [],
    },
    update: {
      name: body.name || null,
      title: body.title || null,
      location: body.location || null,
      summary: body.summary || null,
      links: body.links || [],
      skills: body.skills || [],
      evidence: body.evidence || [],
    },
  });

  await prisma.experienceItem.deleteMany({ where: { profileId: profile.id } });
  const experience = Array.isArray(body.experience) ? body.experience : [];
  if (experience.length) {
    await prisma.experienceItem.createMany({
      data: experience.map((e: any) => ({
        profileId: profile.id,
        company: e.company || 'Company',
        role: e.role || 'Role',
        location: e.location || null,
        startDate: e.start || null,
        endDate: e.end || null,
        bullets: e.bullets || [],
        evidence: e.evidence || [],
      })),
    });
  }

  const fresh = await prisma.careerProfile.findUnique({
    where: { id: profile.id },
    include: { experiences: true, user: true },
  });
  return NextResponse.json({ profile: fresh ? toClientProfile(fresh) : null });
}
