import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
<<<<<<< HEAD
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
=======
import { isProbablyCv } from '@/lib/cv-parser';
import { parseCvStructured } from '@/lib/cv-structured-parser';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractText(fileName: string, buffer: Buffer, mimeType: string) {
  const lower = fileName.toLowerCase();
  if (mimeType === 'text/plain' || lower.endsWith('.txt')) return buffer.toString('utf-8');
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const parsed = await pdf(buffer);
    return parsed.text || '';
  }
  if (lower.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || '';
  }
  if (lower.endsWith('.doc') || mimeType === 'application/msword') throw new Error('Legacy .doc files are not reliably readable. Save as DOCX, PDF, or paste text.');
  throw new Error('Unsupported file format. Upload PDF, DOCX, TXT, or paste CV text.');
}

async function persistParsedProfile(userId: string, parsedProfile: any, sourceName: string, extractedText: string, mimeType: string) {
  const existing = await prisma.careerProfile.findFirst({ where: { userId }, select: { id: true } });
  const profile = await prisma.careerProfile.upsert({
    where: { id: existing?.id || 'new-profile' },
    create: { userId, name: parsedProfile.name || null, title: parsedProfile.title || null, phone: parsedProfile.phone || null, location: parsedProfile.location || null, links: parsedProfile.links || [], summary: parsedProfile.summary || null, skills: parsedProfile.skills || [], languages: parsedProfile.languages || [], evidence: parsedProfile.evidence || [] },
    update: { name: parsedProfile.name || null, title: parsedProfile.title || null, phone: parsedProfile.phone || null, location: parsedProfile.location || null, links: parsedProfile.links || [], summary: parsedProfile.summary || null, skills: parsedProfile.skills || [], languages: parsedProfile.languages || [], evidence: parsedProfile.evidence || [] },
  });

  await prisma.experienceItem.deleteMany({ where: { profileId: profile.id } });
  const experience = Array.isArray(parsedProfile.experience) ? parsedProfile.experience : [];
  if (experience.length) await prisma.experienceItem.createMany({ data: experience.map((exp: any) => ({ profileId: profile.id, company: exp.company || 'Company from CV', role: exp.role || parsedProfile.title || 'Role from CV', location: exp.location || null, startDate: exp.start || null, endDate: exp.end || null, bullets: exp.bullets || [], evidence: exp.evidence || ['Source: uploaded CV'] })) });

  await prisma.educationItem.deleteMany({ where: { profileId: profile.id } });
  const education = Array.isArray(parsedProfile.education) ? parsedProfile.education : [];
  if (education.length) await prisma.educationItem.createMany({ data: education.map((edu: any) => ({ profileId: profile.id, school: edu.school || 'Education from CV', degree: edu.degree || null, field: edu.field || null, startDate: edu.start || null, endDate: edu.end || null })) });

  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  const projects = Array.isArray(parsedProfile.projects) ? parsedProfile.projects : [];
  if (projects.length) await prisma.project.createMany({ data: projects.map((project: any) => ({ profileId: profile.id, name: project.name || 'Project from CV', summary: project.summary || null, skills: project.skills || [], evidence: project.evidence || ['Source: uploaded CV'] })) });

  await prisma.certification.deleteMany({ where: { profileId: profile.id } });
  const certifications = Array.isArray(parsedProfile.certifications) ? parsedProfile.certifications : [];
  if (certifications.length) await prisma.certification.createMany({ data: certifications.map((cert: any) => ({ profileId: profile.id, name: cert.name || 'Certification from CV', issuer: cert.issuer || null, issuedAt: cert.issuedAt || null })) });

  const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const record = await prisma.cvSource.create({ data: { userId, fileName: safeName, fileType: mimeType || 'text/plain', storagePath: safeName, extractedText, isValid: true } });
  await prisma.historyItem.create({ data: { userId, type: 'upload', title: `CV upload: ${safeName}`, details: mimeType || 'text/plain', payload: { cvSourceId: record.id, parsedProfile } } });
  return { profileId: profile.id, cvSourceId: record.id };
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`cv-upload:${getClientIp(req)}`, 20);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many CV upload attempts. Try again later.' }, { status: 429 });
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const pastedText = String(formData.get('text') || '');
    let sourceName = 'pasted-cv.txt';
    let mimeType = 'text/plain';
    let extractedText = pastedText.trim();
    if (file instanceof File) {
      sourceName = file.name || 'cv';
      mimeType = file.type || 'application/octet-stream';
      if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'File is too large. Upload a CV below 8 MB.' }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      extractedText = (await extractText(sourceName, buffer, mimeType)).trim();
    }
    if (!extractedText) return NextResponse.json({ error: 'Could not extract text from this CV. Try DOCX/TXT or paste the text manually.' }, { status: 400 });
    if (!isProbablyCv(extractedText)) return NextResponse.json({ error: 'This does not look like a CV. Upload a resume with experience, education, skills, or contact details.', extractedPreview: extractedText.slice(0, 300) }, { status: 400 });
    const parsed = await parseCvStructured(extractedText);
    const parsedProfile = parsed.profile;
    const session = await getServerSession(authOptions);
    let persistence = null;
    if (session?.user) {
      const userId = (session.user as any).id as string;
      persistence = await persistParsedProfile(userId, parsedProfile, sourceName, extractedText, mimeType);
    }
    return NextResponse.json({ ok: true, sourceName, extractedTextLength: extractedText.length, parsedProfile, persistence, parser: parsed.parser, parserWarning: parsed.warning, counts: { experience: parsedProfile.experience?.length || 0, education: parsedProfile.education?.length || 0, skills: parsedProfile.skills?.length || 0, projects: parsedProfile.projects?.length || 0, certifications: parsedProfile.certifications?.length || 0, languages: parsedProfile.languages?.length || 0 } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'CV upload failed. Try DOCX/TXT or paste the CV text manually.', detail: process.env.NODE_ENV === 'production' ? undefined : detail }, { status: 500 });
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
  }
}
