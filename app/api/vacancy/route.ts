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

function cleanKeepLines(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
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

function normalizeHtmlText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripJsonNoise(value: string) {
  return value
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"');
}

function extractHhStructuredText(html: string) {
  const chunks: string[] = [];
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(stripJsonNoise(raw));
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const type = String((node as any)['@type'] || '').toLowerCase();
        if (!type.includes('job') && !type.includes('posting')) continue;
        const name = (node as any).title || (node as any).name || '';
        const employer = (node as any).hiringOrganization?.name || (node as any).hiringOrganization || '';
        const desc = (node as any).description || '';
        const salary = (node as any).baseSalary?.value?.value || (node as any).baseSalary || '';
        const location = Array.isArray((node as any).jobLocation)
          ? (node as any).jobLocation.map((x: any) => x?.address?.addressLocality || x?.address?.addressRegion || '').filter(Boolean).join(', ')
          : (node as any).jobLocation?.address?.addressLocality || (node as any).jobLocation?.address?.addressRegion || '';
        chunks.push([name, employer, location, salary ? `Salary: ${salary}` : '', desc].filter(Boolean).join('\n'));
      }
    } catch {
      // ignore invalid JSON-LD and keep scanning
    }
  }

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const metaTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];

  if (titleMatch || metaTitle || metaDesc) {
    chunks.push([titleMatch ? normalizeHtmlText(titleMatch) : '', metaTitle ? normalizeHtmlText(metaTitle) : '', metaDesc ? normalizeHtmlText(metaDesc) : ''].filter(Boolean).join('\n'));
  }

  return chunks.filter(Boolean).join('\n\n');
}

function extractHhDescription(html: string) {
  const match = html.match(/<div[^>]*data-qa=["']vacancy-description["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1]
    || html.match(/<div[^>]*data-qa=["']vacancy-description["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
    || '';
  if (!match) return '';
  return match
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>|<\/li>|<\/h\d>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractHhCompany(html: string) {
  const selectors = [
    /data-qa=["']vacancy-company-name["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /data-qa=["']vacancy-company["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /data-qa=["']vacancy-company__details["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)['"]/i,
  ];
  for (const regex of selectors) {
    const match = html.match(regex)?.[1];
    const cleaned = match ? normalizeHtmlText(match) : '';
    if (cleaned) return cleaned;
  }
  return '';
}

function extractHhTitle(html: string) {
  const selectors = [
    /data-qa=["']vacancy-title["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<h1[^>]*data-qa=["']vacancy-title["'][^>]*>([\s\S]*?)<\/h1>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)['"]/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];
  for (const regex of selectors) {
    const match = html.match(regex)?.[1];
    const cleaned = match ? normalizeHtmlText(match) : '';
    if (cleaned) {
      return cleaned
        .replace(/\s*[|\-]\s*hh\.ru.*$/i, '')
        .replace(/\s*[|\-]\s*в hh\.ru.*$/i, '')
        .trim();
    }
  }
  return '';
}

function inferTitleFromSource(source: string) {
  const lines = source.split(/\r?\n/).map((line) => normalizeHtmlText(line)).filter(Boolean);
  const markerTitle = lines.find((line) => /^title:\s*/i.test(line));
  if (markerTitle) return markerTitle.replace(/^title:\s*/i, '').trim();
  const firstRoleLine = lines.find((line) => /[А-Яа-яA-Za-z].{2,120}/.test(line) && !/^(company|description|salary|location):/i.test(line));
  if (firstRoleLine) return firstRoleLine.trim();
  return 'Parsed vacancy';
}

function inferCompanyFromSource(source: string) {
  const lines = source.split(/\r?\n/).map((line) => normalizeHtmlText(line)).filter(Boolean);
  const markerCompany = lines.find((line) => /^company:\s*/i.test(line));
  if (markerCompany) return markerCompany.replace(/^company:\s*/i, '').trim();
  const companyMatch = source.match(/(?:company|компания|работодатель|employer|hiring organization)[:\s-]+([^\n]+)/i);
  if (companyMatch?.[1]) return companyMatch[1].trim();
  const atMatch = source.match(/(?:\s|^)[—-]\s*([^\n]{2,120})/);
  if (atMatch?.[1] && !/\b(description|salary|location|experience|skills)\b/i.test(atMatch[1])) return atMatch[1].trim();
  return '';
}

function extract(text: string) {
  const dict = [
    'SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Next', 'Product', 'Roadmap', 'Roadmapping', 'User Research', 'Agile', 'Scrum', 'Stakeholder',
    'Security', 'SIEM', 'SOC', 'Cloud', 'AWS', 'Azure', 'API', 'Testing', 'Growth', 'PLG', 'Compliance', 'Incident', 'Risk', 'Linux', 'Windows',
    'EDR', 'XDR', 'DLP', 'ServiceNow', 'ITIL', 'Active Directory', 'Kubernetes', 'Docker'
  ];
  const keywords = dict.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  const title = inferTitleFromSource(text)
    || text.match(/(?:Senior|Lead|Middle|Junior)?\s*(?:Product Manager|Security Analyst|SOC Analyst|UX Researcher|Project Manager|Business Analyst|Incident Manager|Security Engineer|Service Manager|Developer|Engineer|Analyst)/i)?.[0]
    || 'Parsed vacancy';
  const company = inferCompanyFromSource(text)
    || text.match(/(?:at|company|компания|работодатель)\s+([A-ZА-Я][\wА-Яа-я.-]+)/i)?.[1]
    || 'Target company';
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
          vacancy.salary ? `Salary: ${[vacancy.salary.from, vacancy.salary.to, vacancy.salary.currency].filter(Boolean).join(' - ')}` : '',
          vacancy.experience?.name || '',
          vacancy.employment?.name || '',
        ].filter(Boolean).join('\n');
        if (source.trim()) return clean(source);
      }
    } catch {
      // Fall back to hh page structured extraction below.
    }
  }
  if (hhId) {
    const pageResponse = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml' } });
    const html = await pageResponse.text();
    const description = extractHhDescription(html) || extractHhStructuredText(html);
    if (description.trim()) {
      const title = extractHhTitle(html) || inferTitleFromSource(description);
      const company = extractHhCompany(html) || inferCompanyFromSource(description);
      const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)['"]/i)?.[1]
        || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || '';
      return cleanKeepLines([
        `Title: ${title}`,
        `Company: ${company}`,
        'Description:',
        description,
        metaDescription ? `Meta: ${normalizeHtmlText(metaDescription)}` : '',
      ].filter(Boolean).join('\n'));
    }
    throw new Error('Could not extract structured vacancy data from hh.ru page.');
  }
  const pageResponse = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return clean(await pageResponse.text());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { title, company, url, text, language, targetMarket, coverLetterEnabled, coverLetterLanguage, interviewPrep } = await req.json();
  const resolvedUrl = String(url || '').trim();
  const customTitle = String(title || '').trim();
  const customCompany = String(company || '').trim();
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
  const savedCompany = customCompany || analysis.company;

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
      details: savedCompany,
      payload: { jobPostingId: job.id, analysis },
    },
  });

  return NextResponse.json({ analysis: { ...analysis, title: savedTitle, company: savedCompany }, job });
}
