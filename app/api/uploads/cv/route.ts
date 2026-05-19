import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { parseCvText, isProbablyCv } from '@/lib/cv-parser';
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
  if (lower.endsWith('.doc') || mimeType === 'application/msword') {
    throw new Error('Legacy .doc files are not reliably readable in this runtime. Save the CV as DOCX, PDF, or paste text.');
  }
  throw new Error('Unsupported file format. Upload PDF, DOCX, TXT, or paste CV text.');
}

async function persistParsedProfile(userId: string, parsedProfile: any, sourceName: string, extractedText: string, mimeType: string) {
  const profile = await prisma.careerProfile.upsert({
    where: { id: (await prisma.careerProfile.findFirst({ where: { userId }, select: { id: true } }))?.id || 'new-profile' },
    create: {
      userId,
      name: parsedProfile.name,
      title: parsedProfile.title,
      location: parsedProfile.location,
      links: parsedProfile.links || [],
      summary: parsedProfile.summary,
      skills: parsedProfile.skills || [],
      languages: parsedProfile.languages || [],
      evidence: parsedProfile.evidence || [],
    },
    update: {
      name: parsedProfile.name,
      title: parsedProfile.title,
      location: parsedProfile.location,
      links: parsedProfile.links || [],
      summary: parsedProfile.summary,
      skills: parsedProfile.skills || [],
      languages: parsedProfile.languages || [],
      evidence: parsedProfile.evidence || [],
    },
  });

  const exp = parsedProfile.experience?.[0];
  if (exp) {
    await prisma.experienceItem.create({
      data: {
        profileId: profile.id,
        company: exp.company || 'Company from CV',
        role: exp.role || parsedProfile.title || 'Role from CV',
        location: exp.location,
        startDate: exp.start || '',
        endDate: exp.end || '',
        bullets: exp.bullets || [],
        evidence: exp.evidence || ['Source: uploaded CV'],
      },
    });
  }

  const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const record = await prisma.cvSource.create({
    data: { userId, fileName: safeName, fileType: mimeType || 'text/plain', storagePath: safeName, extractedText, isValid: true },
  });
  await prisma.historyItem.create({
    data: { userId, type: 'upload', title: `CV upload: ${safeName}`, details: mimeType || 'text/plain', payload: { cvSourceId: record.id } },
  });
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

    const parsedProfile = parseCvText(extractedText);
    const session = await getServerSession(authOptions);
    let persistence = null;
    if (session?.user) {
      const userId = (session.user as any).id as string;
      try {
        persistence = await persistParsedProfile(userId, parsedProfile, sourceName, extractedText, mimeType);
      } catch (dbError) {
        console.error('CV parsed but database persistence failed:', dbError);
      }
    }

    return NextResponse.json({ ok: true, sourceName, extractedTextLength: extractedText.length, parsedProfile, persistence });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'CV upload failed. Try DOCX/TXT or paste the CV text manually.', detail: process.env.NODE_ENV === 'production' ? undefined : detail }, { status: 500 });
  }
}
