import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { extractCvText, looksLikeCv, parseCvText } from '@/lib/cv-parser';

export const runtime = 'nodejs';

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
    languages: profile.languages || [],
    evidence: profile.evidence || [],
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
  };
}

async function persistParsedProfile(userId: string, parsed: ReturnType<typeof parseCvText>) {
  const existing = await prisma.careerProfile.findFirst({ where: { userId } });
  const profile = await prisma.careerProfile.upsert({
    where: { id: existing?.id || 'missing' },
    create: {
      userId,
      name: parsed.name || null,
      title: parsed.title || null,
      location: parsed.location || null,
      summary: parsed.summary || null,
      links: parsed.links || [],
      skills: parsed.skills || [],
      languages: parsed.languages || [],
      evidence: parsed.evidence || [],
    },
    update: {
      name: parsed.name || null,
      title: parsed.title || null,
      location: parsed.location || null,
      summary: parsed.summary || null,
      links: parsed.links || [],
      skills: parsed.skills || [],
      languages: parsed.languages || [],
      evidence: parsed.evidence || [],
    },
  });

  await prisma.experienceItem.deleteMany({ where: { profileId: profile.id } });
  await prisma.educationItem.deleteMany({ where: { profileId: profile.id } });
  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  await prisma.certification.deleteMany({ where: { profileId: profile.id } });

  if (parsed.experience.length) {
    await prisma.experienceItem.createMany({
      data: parsed.experience.map((entry) => ({
        profileId: profile.id,
        company: entry.company || 'Company',
        role: entry.role || 'Role',
        location: entry.location || null,
        startDate: entry.start || null,
        endDate: entry.end || null,
        bullets: entry.bullets || [],
        evidence: entry.evidence || [],
      })),
    });
  }

  if (parsed.education.length) {
    await prisma.educationItem.createMany({
      data: parsed.education.map((entry) => ({
        profileId: profile.id,
        school: entry.school || 'School',
        degree: entry.degree || null,
        field: entry.field || null,
        startDate: entry.start || null,
        endDate: entry.end || null,
      })),
    });
  }

  if (parsed.projects.length) {
    await prisma.project.createMany({
      data: parsed.projects.map((entry) => ({
        profileId: profile.id,
        name: entry.name || 'Project',
        summary: entry.summary || null,
        skills: entry.skills || [],
        evidence: entry.evidence || [],
      })),
    });
  }

  if (parsed.certifications.length) {
    await prisma.certification.createMany({
      data: parsed.certifications.map((entry) => ({
        profileId: profile.id,
        name: entry.name || 'Certification',
        issuer: entry.issuer || null,
        issuedAt: entry.issuedAt || null,
      })),
    });
  }

  const fresh = await prisma.careerProfile.findUnique({
    where: { id: profile.id },
    include: {
      experiences: true,
      education: true,
      projects: true,
      certifications: true,
      user: true,
    },
  });

  return fresh ? toClientProfile(fresh) : null;
}

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`cv-upload:${getClientIp(req)}`, 12);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many uploads.' }, { status: 429 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
    const formData = await req.formData();
    const file = formData.get('file');
    const text = formData.get('text');

    let fileName = '';
    let mimeType = '';
    let buffer: Buffer | null = null;
    let extractedText = '';

    if (file && file instanceof File) {
      fileName = file.name || 'cv';
      mimeType = file.type || 'application/octet-stream';
      buffer = Buffer.from(await file.arrayBuffer());
      extractedText = await extractCvText(fileName, buffer, mimeType);
    } else if (typeof text === 'string') {
      fileName = 'cv.txt';
      mimeType = 'text/plain';
      extractedText = text;
      buffer = Buffer.from(text, 'utf-8');
    }

    extractedText = extractedText.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();

    if (!buffer) return NextResponse.json({ error: 'CV text or file is required.' }, { status: 400 });
    if (!extractedText.trim()) return NextResponse.json({ error: 'Could not read this file. Upload a text, PDF, DOCX, or DOC CV.' }, { status: 400 });

    const isValid = looksLikeCv(extractedText) || (mimeType !== 'text/plain' && extractedText.trim().length > 80);
    if (!isValid) return NextResponse.json({ error: 'This does not look like a CV. Include summary, experience, education, or skills sections.' }, { status: 400 });

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName = `${crypto.randomUUID()}-${safeName}`;
    const storagePath = path.join(uploadDir, storedName);
    await writeFile(storagePath, buffer);

    const record = await prisma.cvSource.create({
      data: {
        userId,
        fileName: safeName,
        fileType: mimeType,
        storagePath,
        extractedText,
        isValid,
      },
    });

    const parsedProfile = await persistParsedProfile(userId, parseCvText(extractedText));

    await prisma.historyItem.create({
      data: {
        userId,
        type: 'upload',
        title: `CV upload: ${safeName}`,
        details: mimeType,
        payload: { cvSourceId: record.id },
      },
    });

    return NextResponse.json({ ok: true, cvSource: { id: record.id, fileName: record.fileName, createdAt: record.createdAt }, profile: parsedProfile });
  } catch (error) {
    console.error('CV upload failed:', error);
    return NextResponse.json({ error: 'CV upload failed. Please try again.' }, { status: 500 });
  }
}
