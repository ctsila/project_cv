import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { buildNoLiesPack } from '@/lib/no-lies-generator';

function wantsRussian(language: string) { return language.toLowerCase().includes('russian') || language.toLowerCase() === 'ru'; }
function wantsSpanish(language: string) { return language.toLowerCase().includes('spanish') || language.toLowerCase() === 'es'; }
function wrongLanguage(pack: any, language: string) {
  const text = `${pack?.resume || ''}\n${pack?.coverLetter || ''}`;
  if (!text.trim()) return true;
  if (wantsRussian(language)) return !/[А-Яа-яЁё]/.test(text);
  if (wantsSpanish(language)) return /SUMMARY|EXPERIENCE|EDUCATION|Dear Hiring Team/i.test(text) && !/RESUMEN|EXPERIENCIA|EDUCACIÓN|Estimado/i.test(text);
  return false;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`ai:${getClientIp(req)}`, 15);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many generation requests.' }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const language = body.language || 'English';
  const market = body.market || 'EU';
  const noLiesMode = body.noLiesMode !== false;
  const deterministicPack = buildNoLiesPack(body.profile || {}, body.job || {}, language, market);
  const key = process.env.OPENAI_API_KEY;
  let pack = deterministicPack;
  let generator = 'deterministic';
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const prompt = `Generate a tailored CV and cover letter in ${language}. Target market: ${market}. No Lies Mode: ${noLiesMode ? 'ON' : 'OFF'}.
When No Lies Mode is ON, use only facts from PROFILE and never invent metrics, employers, tools, dates, certificates or impact. When a vacancy requirement is unsupported, put it into missing/weakEvidence. When No Lies Mode is OFF, you may improve wording and structure, but still must not fabricate specific employers, dates, degrees or certifications.
Return strict JSON with fields: atsScore number, localeScore number, truthRisk low|medium|high, matched string[], missing string[], weakEvidence string[], resume string, coverLetter string, interviewQuestions string[], suggestions array of {original,rewrite,why,evidence,risk}.
PROFILE=${JSON.stringify(body.profile)}
JOB=${JSON.stringify(body.job)}
BASELINE=${JSON.stringify(deterministicPack)}`;
      const out = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: `You are a career document generator. Output language must be exactly ${language}. Do not switch to English unless ${language} is English. Return JSON only.` },
          { role: 'user', content: prompt }
        ],
        temperature: noLiesMode ? .15 : .35,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(out.choices[0].message.content || '{}');
      if (!wrongLanguage(parsed, language)) { pack = parsed; generator = 'openai'; }
      else { pack = deterministicPack; generator = 'deterministic-language-guard'; }
    } catch (error) {
      console.error('OpenAI generation failed, using deterministic generator:', error);
      pack = deterministicPack;
    }
  }
  const finalPack = { ...deterministicPack, ...pack };
  const resume = await prisma.resumeVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Resume for ${body.job?.title || 'job'}`, content: finalPack.resume || deterministicPack.resume, language, market, score: { atsScore: finalPack.atsScore, localeScore: finalPack.localeScore, truthRisk: finalPack.truthRisk, noLiesMode, generator }, suggestions: finalPack.suggestions || [] } });
  const cover = await prisma.coverLetterVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Cover letter for ${body.job?.title || 'job'}`, content: finalPack.coverLetter || deterministicPack.coverLetter, language, tone: body.tone || 'professional' } });
  await prisma.historyItem.create({ data: { userId, type: 'resume', title: resume.title, details: `ATS ${finalPack.atsScore || 'n/a'} · ${language} · ${market} · ${noLiesMode ? 'No Lies ON' : 'No Lies OFF'}`, payload: { resumeVersionId: resume.id, coverLetterVersionId: cover.id, jobPostingId: body.jobPostingId || null, pack: finalPack, noLiesMode, generator } } });
  return NextResponse.json({ pack: finalPack, generator, noLiesMode, resumeVersionId: resume.id, coverLetterVersionId: cover.id, jobPostingId: body.jobPostingId || null });
}
