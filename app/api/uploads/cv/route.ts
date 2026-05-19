import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isProbablyCv } from '@/lib/cv-parser';
import { parseCvStructured } from '@/lib/cv-structured-parser';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractText(fileName: string, buffer: Buffer, mimeType: string) {
  const lower = fileName.toLowerCase();
  if (mimeType === 'text/plain' || lower.endsWith('.txt')) return buffer.toString('utf-8');
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return (await pdf(buffer)).text || '';
  if (lower.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return (await mammoth.extractRawText({ buffer })).value || '';
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
  await prisma.educationItem.deleteMany({ where: { profileId: profile.id } });
  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  await prisma.certification.deleteMany({ where: { profileId: profile.id } });
  const experience = Array.isArray(parsedProfile.experience) ? parsedProfile.experience : [];
  if (experience.length) await prisma.experienceItem.createMany({ data: experience.map((x: any) => ({ profileId: profile.id, company: x.company || 'Company from CV', role: x.role || parsedProfile.title || 'Role from CV', location: x.location || null, startDate: x.start || null, endDate: x.end || null, bullets: x.bullets || [], evidence: x.evidence || ['Source: uploaded CV'] })) });
  const education = Array.isArray(parsedProfile.education) ? parsedProfile.education : [];
  if (education.length) await prisma.educationItem.createMany({ data: education.map((x: any) => ({ profileId: profile.id, school: x.school || 'Education from CV', degree: x.degree || null, field: x.field || null, startDate: x.start || null, endDate: x.end || null })) });
  const projects = Array.isArray(parsedProfile.projects) ? parsedProfile.projects : [];
  if (projects.length) await prisma.project.createMany({ data: projects.map((x: any) => ({ profileId: profile.id, name: x.name || 'Project from CV', summary: x.summary || null, skills: x.skills || [], evidence: x.evidence || ['Source: uploaded CV'] })) });
  const certifications = Array.isArray(parsedProfile.certifications) ? parsedProfile.certifications : [];
  if (certifications.length) await prisma.certification.createMany({ data: certifications.map((x: any) => ({ profileId: profile.id, name: x.name || 'Certification from CV', issuer: x.issuer || null, issuedAt: x.issuedAt || null })) });
  const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const record = await prisma.cvSource.create({ data: { userId, fileName: safeName, fileType: mimeType || 'text/plain', storagePath: safeName, extractedText, isValid: true } });
  await prisma.historyItem.create({ data: { userId, type: 'upload', title: `CV upload: ${safeName}`, details: mimeType || 'text/plain', payload: { cvSourceId: record.id, parsedProfile } } });
  return { profileId: profile.id, cvSourceId: record.id };
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`cv-upload:${getClientIp(req)}`, 20);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many CV upload attempts. Try again later.' }, { status: 429 });
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
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
      extractedText = (await extractText(sourceName, Buffer.from(await file.arrayBuffer()), mimeType)).trim();
    }
    if (!extractedText) return NextResponse.json({ error: 'Could not extract text from this CV. Try DOCX/TXT or paste the text manually.' }, { status: 400 });
    if (!isProbablyCv(extractedText)) return NextResponse.json({ error: 'This does not look like a CV. Upload a resume with experience, education, skills, or contact details.', extractedPreview: extractedText.slice(0, 300) }, { status: 400 });
    const parsed = await parseCvStructured(extractedText);
    const parsedProfile = parsed.profile;
    const persistence = await persistParsedProfile(userId, parsedProfile, sourceName, extractedText, mimeType);
    return NextResponse.json({ ok: true, sourceName, extractedTextLength: extractedText.length, parsedProfile, persistence, parser: parsed.parser, parserWarning: parsed.warning, counts: { experience: parsedProfile.experience?.length || 0, education: parsedProfile.education?.length || 0, skills: parsedProfile.skills?.length || 0, projects: parsedProfile.projects?.length || 0, certifications: parsedProfile.certifications?.length || 0, languages: parsedProfile.languages?.length || 0 } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'CV upload failed. Try DOCX/TXT or paste the CV text manually.', detail: process.env.NODE_ENV === 'production' ? undefined : detail }, { status: 500 });
  }
}
