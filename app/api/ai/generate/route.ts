import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { buildNoLiesPack } from '@/lib/no-lies-generator';

export async function POST(req: NextRequest) {
  const limit = rateLimit(`ai:${getClientIp(req)}`, 15);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many generation requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const language = body.language || 'English';
  const market = body.market || 'EU';
  const deterministicPack = buildNoLiesPack(body.profile || {}, body.job || {}, language, market);
  const key = process.env.OPENAI_API_KEY;
  let pack = deterministicPack;
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const prompt = `Generate a truthful tailored CV and optional cover letter in ${language}. Target market: ${market}. Use only facts from PROFILE. Do not invent metrics, tools, dates, employers, certifications or impact. Tailor to JOB by reordering and selecting relevant facts. Return strict JSON with fields: atsScore number, localeScore number, truthRisk low|medium|high, matched string[], missing string[], weakEvidence string[], resume string, coverLetter string, interviewQuestions string[], suggestions array of {original,rewrite,why,evidence,risk}. PROFILE=${JSON.stringify(body.profile)} JOB=${JSON.stringify(body.job)} BASELINE_NO_LIES_PACK=${JSON.stringify(deterministicPack)}`;
      const out = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', messages: [{ role: 'system', content: `You are a strict No Lies Mode career document generator. Output language must be ${language}. If a job requirement is not supported by profile facts, put it in missing or weakEvidence; never add it to the resume as experience.` }, { role: 'user', content: prompt }], temperature: .2, response_format: { type: 'json_object' } });
      pack = JSON.parse(out.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI generation failed, using deterministic No Lies generator:', error);
      pack = deterministicPack;
    }
  }
  const resume = await prisma.resumeVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Resume for ${body.job?.title || 'job'}`, content: pack.resume || deterministicPack.resume, language, market, score: { atsScore: pack.atsScore, localeScore: pack.localeScore, truthRisk: pack.truthRisk }, suggestions: pack.suggestions || [] } });
  const cover = await prisma.coverLetterVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Cover letter for ${body.job?.title || 'job'}`, content: pack.coverLetter || deterministicPack.coverLetter, language, tone: body.tone || 'professional' } });
  await prisma.historyItem.create({ data: { userId, type: 'resume', title: resume.title, details: `ATS ${pack.atsScore || 'n/a'} · ${language} · ${market}`, payload: { resumeVersionId: resume.id, coverLetterVersionId: cover.id, jobPostingId: body.jobPostingId || null, pack } } });
  return NextResponse.json({ pack: { ...deterministicPack, ...pack } });
}
