import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { buildNoLiesPack } from '@/lib/no-lies-generator';
import {
  buildGenerationSystemPrompt,
  buildGenerationUserPrompt,
  buildLanguageRepairPrompt,
  wantsRussian,
  wantsSpanish,
} from '@/promts/generation-prompts';

function wrongLanguageText(text: string, language: string) {
  if (!text.trim()) return true;
  if (wantsRussian(language)) return !/[А-Яа-яЁё]/.test(text) || /SUMMARY|EXPERIENCE|EDUCATION|Dear Hiring Team|Best regards/i.test(text);
  if (wantsSpanish(language)) return /SUMMARY|EXPERIENCE|EDUCATION|Dear Hiring Team/i.test(text) && !/RESUMEN|EXPERIENCIA|EDUCACIÓN|Estimado/i.test(text);
  return false;
}

function wrongPackLanguages(pack: any, resumeLanguage: string, coverLetterLanguage: string) {
  const resumeWrong = wrongLanguageText(String(pack?.resume || ''), resumeLanguage);
  const coverWrong = String(pack?.coverLetter || '').trim()
    ? wrongLanguageText(String(pack?.coverLetter || ''), coverLetterLanguage)
    : false;
  return resumeWrong || coverWrong;
}

function normalizeGeneratedPack(raw: any, baseline: any, coverLetterEnabled: boolean) {
  const toNum = (value: any, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const toRisk = (value: any, fallback: string) => {
    const v = String(value || '').toLowerCase();
    if (v === 'low' || v === 'medium' || v === 'high') return v;
    return fallback;
  };
  const toStrArray = (value: any, fallback: string[]) => {
    if (!Array.isArray(value)) return fallback;
    const arr = value.map((x) => String(x || '').trim()).filter(Boolean);
    return arr.length ? arr : fallback;
  };
  const toSuggestions = (value: any, fallback: any[]) => {
    if (!Array.isArray(value)) return fallback;
    const normalized = value.map((x: any) => ({
      original: String(x?.original || '').trim(),
      rewrite: String(x?.rewrite || '').trim(),
      why: String(x?.why || '').trim(),
      evidence: String(x?.evidence || '').trim(),
      risk: ['low', 'medium', 'high'].includes(String(x?.risk || '').toLowerCase()) ? String(x.risk).toLowerCase() : 'low',
    })).filter((x: any) => x.original && x.rewrite);
    return normalized.length ? normalized : fallback;
  };

  return {
    atsScore: Math.max(0, Math.min(100, Math.round(toNum(raw?.atsScore, baseline.atsScore || 70)))),
    localeScore: Math.max(0, Math.min(100, Math.round(toNum(raw?.localeScore, baseline.localeScore || 70)))),
    truthRisk: toRisk(raw?.truthRisk, baseline.truthRisk || 'medium'),
    matched: toStrArray(raw?.matched, baseline.matched || []),
    missing: toStrArray(raw?.missing, baseline.missing || []),
    weakEvidence: toStrArray(raw?.weakEvidence, baseline.weakEvidence || []),
    resume: String(raw?.resume || baseline.resume || '').trim(),
    coverLetter: coverLetterEnabled ? String(raw?.coverLetter || baseline.coverLetter || '').trim() : '',
    interviewQuestions: toStrArray(raw?.interviewQuestions, baseline.interviewQuestions || []),
    suggestions: toSuggestions(raw?.suggestions, baseline.suggestions || []),
  };
}

async function repairLanguage(client: OpenAI, pack: any, resumeLanguage: string, coverLetterLanguage: string) {
  const out = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildLanguageRepairPrompt({ resumeLanguage, coverLetterLanguage }) },
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
  const resumeLanguage = body.language || 'English';
  const coverLetterLanguage = body.coverLetterLanguage || resumeLanguage;
  const market = body.market || 'EU';
  const noLiesMode = body.noLiesMode !== false;
  const coverLetterEnabled = body.coverLetterEnabled !== false;
  const deterministicPack = buildNoLiesPack(body.profile || {}, body.job || {}, resumeLanguage, market, coverLetterLanguage);
  const key = process.env.OPENAI_API_KEY;
  let pack = deterministicPack;
  let generator = 'deterministic';
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const systemPrompt = buildGenerationSystemPrompt({ resumeLanguage, coverLetterLanguage, noLiesMode });
      const userPrompt = buildGenerationUserPrompt({
        profile: body.profile || {},
        job: body.job || {},
        baseline: deterministicPack,
        market,
        resumeLanguage,
        coverLetterLanguage,
        noLiesMode,
      });
      const out = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: noLiesMode ? .1 : .25,
        response_format: { type: 'json_object' }
      });
      let parsed = normalizeGeneratedPack(JSON.parse(out.choices[0].message.content || '{}'), deterministicPack, coverLetterEnabled);
      if (wrongPackLanguages(parsed, resumeLanguage, coverLetterLanguage)) {
        parsed = normalizeGeneratedPack(await repairLanguage(client, parsed, resumeLanguage, coverLetterLanguage), deterministicPack, coverLetterEnabled);
        generator = wrongPackLanguages(parsed, resumeLanguage, coverLetterLanguage) ? 'deterministic-language-guard' : 'openai-language-repair';
      } else {
        generator = 'openai';
      }
      pack = wrongPackLanguages(parsed, resumeLanguage, coverLetterLanguage) ? deterministicPack : parsed;
    } catch (error) {
      console.error('OpenAI generation failed, using deterministic generator:', error);
      pack = deterministicPack;
    }
  }
  const finalPack = normalizeGeneratedPack({ ...deterministicPack, ...pack }, deterministicPack, coverLetterEnabled);
  const resume = await prisma.resumeVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Resume for ${body.job?.title || 'job'}`, content: finalPack.resume || deterministicPack.resume, language: resumeLanguage, market, score: { atsScore: finalPack.atsScore, localeScore: finalPack.localeScore, truthRisk: finalPack.truthRisk, noLiesMode, generator }, suggestions: finalPack.suggestions || [] } });
  let cover = null;
  if (coverLetterEnabled) cover = await prisma.coverLetterVersion.create({ data: { userId, jobPostingId: body.jobPostingId || null, title: `Cover letter for ${body.job?.title || 'job'}`, content: finalPack.coverLetter || deterministicPack.coverLetter, language: coverLetterLanguage, tone: body.tone || 'professional' } });
  await prisma.historyItem.create({ data: { userId, type: 'resume', title: resume.title, details: `ATS ${finalPack.atsScore || 'n/a'} · CV ${resumeLanguage} · CL ${coverLetterLanguage} · ${market} · ${noLiesMode ? 'No Lies ON' : 'No Lies OFF'}`, payload: { resumeVersionId: resume.id, coverLetterVersionId: cover?.id || null, jobPostingId: body.jobPostingId || null, pack: finalPack, noLiesMode, generator } } });
  return NextResponse.json({ pack: finalPack, generator, noLiesMode, resumeVersionId: resume.id, coverLetterVersionId: cover?.id || null, jobPostingId: body.jobPostingId || null });
}
