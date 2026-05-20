import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function clean(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14000);
}

function isVacancy(text: string) {
  const t = text.toLowerCase();
  const jobTerms = [
    'responsibilities', 'requirements', 'required', 'preferred', 'experience', 'skills', 'vacancy', 'job', 'role', 'position', 'candidate', 'we offer', 'salary', 'remote', 'full-time', 'part-time',
    'обязанности', 'требования', 'вакансия', 'кандидат', 'опыт', 'навыки', 'зарплата', 'удаленно', 'полная занятость',
    'puesto', 'requisitos', 'responsabilidades', 'experiencia', 'habilidades'
  ];
  const hits = jobTerms.filter((w) => t.includes(w)).length;
  return text.trim().length > 80 && hits >= 2;
}

function langCode(language: string) {
  const l = (language || '').toLowerCase();
  if (l.includes('russian') || l === 'ru') return 'ru';
  if (l.includes('spanish') || l === 'es') return 'es';
  if (l.includes('german') || l === 'de') return 'de';
  return 'en';
}

function extractHhVacancyId(url: string) {
  return url.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)?hh\.(ru|kz|uz|by)\/vacancy\/(\d+)/i)?.[2] || '';
}

function extract(text: string) {
  const dict = [
    'SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Next', 'Product', 'Roadmap', 'Roadmapping', 'User Research', 'Agile', 'Scrum', 'Stakeholder',
    'Security', 'SIEM', 'SOC', 'Cloud', 'AWS', 'Azure', 'API', 'Testing', 'Growth', 'PLG', 'Compliance', 'Incident', 'Risk', 'Linux', 'Windows',
    'EDR', 'XDR', 'DLP', 'ServiceNow', 'ITIL', 'Active Directory', 'Kubernetes', 'Docker'
  ];
  const keywords = dict.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  const title = text.match(/(?:Senior|Lead|Middle|Junior)?\s*(?:Product Manager|Security Analyst|SOC Analyst|UX Researcher|Project Manager|Business Analyst|Incident Manager|Security Engineer|Service Manager|Developer|Engineer|Analyst)/i)?.[0]
    || text.split('\n').find((x) => x.trim().length > 5 && x.trim().length < 90)
    || 'Parsed vacancy';
  const company = text.match(/(?:at|company|компания|работодатель)\s+([A-ZА-Я][\wА-Яа-я.-]+)/i)?.[1] || 'Target company';
  return {
    title,
    company,
    responsibilities: text.split(/[.!?]\s|\n/).filter((s) => /own|lead|manage|develop|analyz|coordinate|support|implement|monitor|investigate|управл|анализ|координир|разработ|внедр|монитор|расслед/i.test(s)).slice(0, 10),
    requiredSkills: keywords.slice(0, 12),
    preferredSkills: keywords.slice(12, 18),
    senioritySignals: (text.match(/senior|lead|ownership|stakeholder|strategy|руковод|лид|стратег/ig) || []).slice(0, 8),
    softSkills: (text.match(/communication|stakeholder|collaboration|ownership|leadership|коммуникац|ответствен|лидер/ig) || []).slice(0, 8),
    tone: 'professional, concise, evidence-driven',
    marketSignals: ['Use concise ATS-friendly structure', 'Avoid unsupported claims', 'Prioritize measurable impact'],
    keywords: keywords.length ? keywords : ['responsibilities', 'skills', 'experience'],
    sourceText: text.slice(0, 9000),
  };
}

async function resolveVacancySource(url: string) {
  const hhId = extractHhVacancyId(url);
  if (hhId) {
    try {
      const apiResponse = await fetch(`https://api.hh.ru/vacancies/${hhId}`, {
        headers: { 'User-Agent': 'AI Resume Generator MVP', Accept: 'application/json' },
      });
      if (apiResponse.ok) {
        const vacancy = await apiResponse.json();
        const source = [
          vacancy.name,
          vacancy.employer?.name,
          vacancy.description,
          vacancy.key_skills?.map((skill: any) => skill.name).join(', '),
        ].filter(Boolean).join('\n');
        if (source.trim()) return clean(source);
      }
    } catch {
      // Fall back to page HTML below.
    }
  }
  const pageResponse = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return clean(await pageResponse.text());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { title, url, text, language, targetMarket, coverLetterEnabled, coverLetterLanguage, interviewPrep } = await req.json();
  const resolvedUrl = String(url || '').trim();
  const customTitle = String(title || '').trim();
  const pastedText = String(text || '').trim();
  let source = pastedText;

  try {
    if (resolvedUrl) source = await resolveVacancySource(resolvedUrl);
  } catch {
    source = pastedText;
  }

  if (!source) return NextResponse.json({ error: 'Provide either a vacancy URL or pasted vacancy text.' }, { status: 400 });
  if (!isVacancy(source)) {
    return NextResponse.json({ error: 'This does not look like a vacancy. Paste a real job description with responsibilities, requirements, skills, company or role details.' }, { status: 400 });
  }

  const analysis = {
    ...extract(source),
    coverLetterEnabled: coverLetterEnabled !== false,
    coverLetterLanguage: coverLetterLanguage || language || 'English',
    interviewPrep: interviewPrep !== false,
  };
  const savedTitle = customTitle || analysis.title;

  const job = await prisma.jobPosting.create({
    data: {
      userId,
      title: savedTitle,
      sourceUrl: resolvedUrl || null,
      sourceText: source,
      language: langCode(language || 'English'),
      targetMarket: targetMarket || 'EU',
      analysis,
      companySignals: analysis.marketSignals || [],
    },
  });

  await prisma.historyItem.create({
    data: {
      userId,
      type: 'vacancy',
      title: savedTitle,
      details: analysis.company,
      payload: { jobPostingId: job.id, analysis },
    },
  });

  return NextResponse.json({ analysis: { ...analysis, title: savedTitle }, job });
}
