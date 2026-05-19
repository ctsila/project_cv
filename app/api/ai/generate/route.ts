import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { samplePack } from '@/lib/storage';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const limit = rateLimit(`ai:${getClientIp(req)}`, 15);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many generation requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const key = process.env.OPENAI_API_KEY;
  const coverLetterEnabled = body.coverLetterEnabled !== false;
  const coverLetterLanguage = body.coverLetterLanguage || body.language || 'English';
  if (!key) {
    const demoPack = coverLetterEnabled
      ? { ...samplePack, resume: samplePack.resume + '\n\n[Demo mode: set OPENAI_API_KEY to generate live AI output.]' }
      : { ...samplePack, resume: samplePack.resume + '\n\n[Demo mode: set OPENAI_API_KEY to generate live AI output.]', coverLetter: '' };
    return NextResponse.json({ pack: demoPack });
  }
  const client = new OpenAI({ apiKey: key });
  const prompt = `You are an evidence-first resume and cover letter generation system. Never invent facts. Use No Lies Mode. Return strict JSON with fields: atsScore number, localeScore number, truthRisk low|medium|high, matched string[], missing string[], weakEvidence string[], resume string, coverLetter string, interviewQuestions string[], suggestions array of {original,rewrite,why,evidence,risk}. Profile: ${JSON.stringify(body.profile)} Job: ${JSON.stringify(body.job)} Market: ${body.market} Language: ${body.language}`;
  const out = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', messages: [{ role: 'system', content: 'Return JSON only. Be conservative with claims.' }, { role: 'user', content: prompt }], temperature: .25, response_format: { type: 'json_object' } });
  let pack;
  try { pack = JSON.parse(out.choices[0].message.content || '{}'); } catch { pack = samplePack; }
  const resume = await prisma.resumeVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Resume for ${body.job?.title || 'job'}`, content: pack.resume || '', language: body.language || 'English', market: body.market || 'EU', score: { atsScore: pack.atsScore, localeScore: pack.localeScore, truthRisk: pack.truthRisk }, suggestions: pack.suggestions || [] } });
  if (coverLetterEnabled) {
    await prisma.coverLetterVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Cover letter for ${body.job?.title || 'job'}`, content: pack.coverLetter || '', language: coverLetterLanguage, tone: body.tone || 'professional' } });
  }
  await prisma.historyItem.create({ data: { userId, type: 'resume', title: resume.title, details: `ATS ${pack.atsScore || 'n/a'}` } });
  return NextResponse.json({ pack: coverLetterEnabled ? pack : { ...pack, coverLetter: '' } });
}
