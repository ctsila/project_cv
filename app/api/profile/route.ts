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
<<<<<<< HEAD
    accountName: profile.user?.name || '',
    accountImage: profile.user?.image || '',
=======
    photoDataUrl: profile.user?.image || '',
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
    location: profile.location || '',
    phone: profile.phone || '',
    links: profile.links || [],
    summary: profile.summary || '',
    skills: profile.skills || [],
    languages: profile.languages || [],
    evidence: profile.evidence || [],
<<<<<<< HEAD
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
    education: (profile.education || []).map((e: any) => ({
      id: e.id,
      school: e.school,
      degree: e.degree || '',
      field: e.field || '',
      start: e.startDate || '',
      end: e.endDate || '',
    })),
    projects: (profile.projects || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      summary: item.summary || '',
      skills: item.skills || [],
      evidence: item.evidence || [],
    })),
    certifications: (profile.certifications || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      issuer: item.issuer || '',
      issuedAt: item.issuedAt || '',
    })),
=======
    education: (profile.education || []).map((e: any) => ({ id: e.id, school: e.school, degree: e.degree || '', field: e.field || '', start: e.startDate || '', end: e.endDate || '' })),
    projects: (profile.projects || []).map((p: any) => ({ id: p.id, name: p.name, summary: p.summary || '', skills: p.skills || [], evidence: p.evidence || [] })),
    certifications: (profile.certifications || []).map((c: any) => ({ id: c.id, name: c.name, issuer: c.issuer || '', issuedAt: c.issuedAt || '' })),
    experience: (profile.experiences || []).map((e: any) => ({ id: e.id, company: e.company, role: e.role, location: e.location || '', start: e.startDate || '', end: e.endDate || '', bullets: e.bullets || [], evidence: e.evidence || [] })),
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
  };
}

export async function GET(req: NextRequest) {
  const limit = rateLimit(`profile-read:${getClientIp(req)}`, 40);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
<<<<<<< HEAD
  const profile = await prisma.careerProfile.findFirst({
    where: { userId },
    include: { experiences: true, education: true, projects: true, certifications: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return NextResponse.json({ profile: null, user: user ? { name: user.name || '', image: user.image || '', email: user.email } : null });
  }
=======
  const profile = await prisma.careerProfile.findFirst({ where: { userId }, include: { experiences: true, education: true, projects: true, certifications: true, user: true }, orderBy: { createdAt: 'desc' } });
  if (!profile) return NextResponse.json({ profile: null });
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
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
<<<<<<< HEAD

  if (typeof body.accountName === 'string') {
    await prisma.user.update({ where: { id: userId }, data: { name: body.accountName.trim() || null } });
  }

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
      languages: body.languages || [],
      evidence: body.evidence || [],
    },
    update: {
      name: body.name || null,
      title: body.title || null,
      location: body.location || null,
      summary: body.summary || null,
      links: body.links || [],
      skills: body.skills || [],
      languages: body.languages || [],
      evidence: body.evidence || [],
    },
=======
  if (typeof body.photoDataUrl === 'string') {
    if (!body.photoDataUrl || body.photoDataUrl.startsWith('data:image/')) {
      if (body.photoDataUrl.length > 2_500_000) return NextResponse.json({ error: 'Profile photo is too large. Use an image under about 2 MB.' }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { image: body.photoDataUrl || null } });
    }
  }
  const existing = await prisma.careerProfile.findFirst({ where: { userId } });
  const profile = await prisma.careerProfile.upsert({
    where: { id: existing?.id || 'missing' },
    create: { userId, name: body.name || null, title: body.title || null, location: body.location || null, phone: body.phone || null, summary: body.summary || null, links: body.links || [], skills: body.skills || [], languages: body.languages || [], evidence: body.evidence || [] },
    update: { name: body.name || null, title: body.title || null, location: body.location || null, phone: body.phone || null, summary: body.summary || null, links: body.links || [], skills: body.skills || [], languages: body.languages || [], evidence: body.evidence || [] },
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
  });
  await prisma.experienceItem.deleteMany({ where: { profileId: profile.id } });
  await prisma.educationItem.deleteMany({ where: { profileId: profile.id } });
  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  await prisma.certification.deleteMany({ where: { profileId: profile.id } });

  const experience = Array.isArray(body.experience) ? body.experience : [];
<<<<<<< HEAD
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

  const education = Array.isArray(body.education) ? body.education : [];
  if (education.length) {
    await prisma.educationItem.createMany({
      data: education.map((e: any) => ({
        profileId: profile.id,
        school: e.school || 'School',
        degree: e.degree || null,
        field: e.field || null,
        startDate: e.start || null,
        endDate: e.end || null,
      })),
    });
  }

  const projects = Array.isArray(body.projects) ? body.projects : [];
  if (projects.length) {
    await prisma.project.createMany({
      data: projects.map((item: any) => ({
        profileId: profile.id,
        name: item.name || 'Project',
        summary: item.summary || null,
        skills: item.skills || [],
        evidence: item.evidence || [],
      })),
    });
  }

  const certifications = Array.isArray(body.certifications) ? body.certifications : [];
  if (certifications.length) {
    await prisma.certification.createMany({
      data: certifications.map((item: any) => ({
        profileId: profile.id,
        name: item.name || 'Certification',
        issuer: item.issuer || null,
        issuedAt: item.issuedAt || null,
      })),
    });
  }

  const fresh = await prisma.careerProfile.findUnique({
    where: { id: profile.id },
    include: { experiences: true, education: true, projects: true, certifications: true, user: true },
  });
=======
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
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
  return NextResponse.json({ profile: fresh ? toClientProfile(fresh) : null });
}
