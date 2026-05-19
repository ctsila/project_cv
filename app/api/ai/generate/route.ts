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
  if (wantsRussian(language)) return !/[А-Яа-яЁё]/.test(text) || /SUMMARY|EXPERIENCE|EDUCATION|Dear Hiring Team|Best regards/i.test(text);
  if (wantsSpanish(language)) return /SUMMARY|EXPERIENCE|EDUCATION|Dear Hiring Team/i.test(text) && !/RESUMEN|EXPERIENCIA|EDUCACIÓN|Estimado/i.test(text);
  return false;
}
function languageInstruction(language: string) {
  if (wantsRussian(language)) return 'Russian only. All headings, summary, bullets, cover letter, suggestions, missing requirements and interview questions must be in Russian. Translate profile facts into Russian without adding new facts.';
  if (wantsSpanish(language)) return 'Spanish only. Translate all headings, bullets, cover letter and suggestions into Spanish without adding new facts.';
  return `${language} only.`;
}
async function repairLanguage(client: OpenAI, pack: any, language: string) {
  const out = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `Rewrite this JSON content into ${language}. ${languageInstruction(language)} Preserve JSON shape and factual meaning. Do not add facts.` },
      { role: 'user', content: JSON.stringify(pack) }
    ]
  });
  return JSON.parse(out.choices[0].message.content || '{}');
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
<<<<<<< HEAD
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
=======
  let pack = deterministicPack;
  let generator = 'deterministic';
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const prompt = `Generate a tailored CV and cover letter. CV language selected by the user: ${language}. Target market: ${market}. No Lies Mode: ${noLiesMode ? 'ON' : 'OFF'}.
Language rule: ${languageInstruction(language)}
When No Lies Mode is ON, use only facts from PROFILE and never invent metrics, employers, tools, dates, certificates or impact. When a vacancy requirement is unsupported, put it into missing/weakEvidence. When No Lies Mode is OFF, you may improve wording and structure, but still must not fabricate specific employers, dates, degrees or certifications.
Return strict JSON with fields: atsScore number, localeScore number, truthRisk low|medium|high, matched string[], missing string[], weakEvidence string[], resume string, coverLetter string, interviewQuestions string[], suggestions array of {original,rewrite,why,evidence,risk}.
PROFILE=${JSON.stringify(body.profile)}
JOB=${JSON.stringify(body.job)}
BASELINE=${JSON.stringify(deterministicPack)}`;
      const out = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: `You are a career document generator. ${languageInstruction(language)} Return JSON only.` },
          { role: 'user', content: prompt }
        ],
        temperature: noLiesMode ? .1 : .25,
        response_format: { type: 'json_object' }
      });
      let parsed = JSON.parse(out.choices[0].message.content || '{}');
      if (wrongLanguage(parsed, language)) {
        parsed = await repairLanguage(client, parsed, language);
        generator = wrongLanguage(parsed, language) ? 'deterministic-language-guard' : 'openai-language-repair';
      } else {
        generator = 'openai';
      }
      pack = wrongLanguage(parsed, language) ? deterministicPack : parsed;
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
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
}
