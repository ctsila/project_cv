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
    phone: profile.phone || '',
    links: profile.links || [],
    summary: profile.summary || '',
    skills: profile.skills || [],
    languages: profile.languages || [],
    evidence: profile.evidence || [],
    education: (profile.education || []).map((e: any) => ({ id: e.id, school: e.school, degree: e.degree || '', field: e.field || '', start: e.startDate || '', end: e.endDate || '' })),
    projects: (profile.projects || []).map((p: any) => ({ id: p.id, name: p.name, summary: p.summary || '', skills: p.skills || [], evidence: p.evidence || [] })),
    certifications: (profile.certifications || []).map((c: any) => ({ id: c.id, name: c.name, issuer: c.issuer || '', issuedAt: c.issuedAt || '' })),
    experience: (profile.experiences || []).map((e: any) => ({ id: e.id, company: e.company, role: e.role, location: e.location || '', start: e.startDate || '', end: e.endDate || '', bullets: e.bullets || [], evidence: e.evidence || [] })),
  };
}

export async function GET(req: NextRequest) {
  const limit = rateLimit(`profile-read:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const profile = await prisma.careerProfile.findFirst({ where: { userId }, include: { experiences: true, education: true, projects: true, certifications: true, user: true }, orderBy: { createdAt: 'desc' } });
  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: toClientProfile(profile) });
}

export async function PUT(req: NextRequest) {
  const limit = rateLimit(`profile-write:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  if (!body) return NextResponse.json({ error: 'Profile payload is required.' }, { status: 400 });
  const existing = await prisma.careerProfile.findFirst({ where: { userId } });
  const profile = await prisma.careerProfile.upsert({
    where: { id: existing?.id || 'missing' },
    create: { userId, name: body.name || null, title: body.title || null, location: body.location || null, phone: body.phone || null, summary: body.summary || null, links: body.links || [], skills: body.skills || [], languages: body.languages || [], evidence: body.evidence || [] },
    update: { name: body.name || null, title: body.title || null, location: body.location || null, phone: body.phone || null, summary: body.summary || null, links: body.links || [], skills: body.skills || [], languages: body.languages || [], evidence: body.evidence || [] },
  });
  await prisma.experienceItem.deleteMany({ where: { profileId: profile.id } });
  const experience = Array.isArray(body.experience) ? body.experience : [];
  if (experience.length) await prisma.experienceItem.createMany({ data: experience.map((e: any) => ({ profileId: profile.id, company: e.company || 'Company', role: e.role || 'Role', location: e.location || null, startDate: e.start || null, endDate: e.end || null, bullets: e.bullets || [], evidence: e.evidence || [] })) });
  await prisma.educationItem.deleteMany({ where: { profileId: profile.id } });
  const education = Array.isArray(body.education) ? body.education : [];
  if (education.length) await prisma.educationItem.createMany({ data: education.map((e: any) => ({ profileId: profile.id, school: e.school || 'Education', degree: e.degree || null, field: e.field || null, startDate: e.start || null, endDate: e.end || null })) });
  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  const projects = Array.isArray(body.projects) ? body.projects : [];
  if (projects.length) await prisma.project.createMany({ data: projects.map((p: any) => ({ profileId: profile.id, name: p.name || 'Project', summary: p.summary || null, skills: p.skills || [], evidence: p.evidence || [] })) });
  await prisma.certification.deleteMany({ where: { profileId: profile.id } });
  const certifications = Array.isArray(body.certifications) ? body.certifications : [];
  if (certifications.length) await prisma.certification.createMany({ data: certifications.map((c: any) => ({ profileId: profile.id, name: c.name || 'Certification', issuer: c.issuer || null, issuedAt: c.issuedAt || null })) });
  const fresh = await prisma.careerProfile.findUnique({ where: { id: profile.id }, include: { experiences: true, education: true, projects: true, certifications: true, user: true } });
  return NextResponse.json({ profile: fresh ? toClientProfile(fresh) : null });
}
