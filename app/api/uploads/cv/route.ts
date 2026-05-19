import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

const CV_KEYWORDS = [
  'experience',
  'work history',
  'employment',
  'education',
  'skills',
  'projects',
  'certifications',
  'summary',
  'profile',
  'objective',
  'languages',
  'achievements',
  'responsibilities',
];

function looksLikeCv(text: string) {
  const cleaned = text.toLowerCase();
  const hits = CV_KEYWORDS.filter((k) => cleaned.includes(k)).length;
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /\+?\d[\d\s()\-]{7,}/.test(text);
  return text.trim().length > 300 && hits >= 2 && (hasEmail || hasPhone);
}

async function extractText(fileName: string, buffer: Buffer, mimeType: string) {
  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) return buffer.toString('utf-8');
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const data = await pdf(buffer);
    return data.text || '';
  }
  if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
    return '';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
  }
  return '';
}

export async function POST(req: NextRequest) {
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
    extractedText = await extractText(fileName, buffer, mimeType);
  } else if (typeof text === 'string') {
    fileName = 'cv.txt';
    mimeType = 'text/plain';
    extractedText = text;
    buffer = Buffer.from(text, 'utf-8');
  }

  if (!buffer) return NextResponse.json({ error: 'CV text or file is required.' }, { status: 400 });
  if (!extractedText.trim()) return NextResponse.json({ error: 'Could not read this file. Upload a text, PDF, or DOCX CV.' }, { status: 400 });

  const isValid = looksLikeCv(extractedText);
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

  await prisma.historyItem.create({
    data: {
      userId,
      type: 'upload',
      title: `CV upload: ${safeName}`,
      details: mimeType,
      payload: { cvSourceId: record.id },
    },
  });

  return NextResponse.json({ ok: true, cvSource: { id: record.id, fileName: record.fileName, createdAt: record.createdAt } });
}
