import OpenAI from 'openai';
import { parseCvText } from '@/lib/cv-parser';
import { buildCvParseSystemPrompt, buildCvParseUserPrompt } from '@/promts/cv-parse-prompts';

function emptyProfile() {
  return { name: '', title: '', email: '', phone: '', location: '', links: [], summary: '', skills: [], experience: [], education: [], projects: [], certifications: [], languages: [], evidence: [] };
}

function asArray(value: any) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : typeof value === 'string' && value.trim() ? value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : [];
}

function compactText(value: any, max = 600) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function stripCvDumpSummary(summary: string, experience: any[]) {
  const s = compactText(summary, 900);
  const looksLikeDump = s.length > 650 || /\b(company|role|responsibilities|experience|education|skills)\b.*\b(company|role|responsibilities|experience|education|skills)\b/i.test(s);
  if (!looksLikeDump) return s;
  const firstRole = experience?.[0]?.role || 'Professional';
  const firstCompany = experience?.[0]?.company ? ` with experience at ${experience[0].company}` : '';
  return `${firstRole}${firstCompany}. Profile details were imported from the uploaded CV and should be reviewed before generation.`;
}

function normalizeParsedProfile(raw: any, fallback: any) {
  const out = { ...emptyProfile(), ...fallback, ...raw };
  out.name = compactText(out.name, 100);
  out.title = compactText(out.title, 140);
  out.email = compactText(out.email, 140);
  out.phone = compactText(out.phone, 60);
  out.location = compactText(out.location, 140);
  out.links = asArray(out.links);
  out.skills = asArray(out.skills);
  out.languages = asArray(out.languages);
  out.evidence = asArray(out.evidence);
  out.experience = Array.isArray(out.experience) ? out.experience.map((x: any) => ({
    company: compactText(x.company, 160),
    role: compactText(x.role || x.title, 160),
    location: compactText(x.location, 160),
    start: compactText(x.start || x.startDate, 80),
    end: compactText(x.end || x.endDate, 80),
    bullets: asArray(x.bullets).map((b) => compactText(b, 500)).filter(Boolean),
    evidence: asArray(x.evidence).length ? asArray(x.evidence) : ['Source: uploaded CV'],
  })).filter((x: any) => x.company || x.role || x.bullets.length) : [];
  out.education = Array.isArray(out.education) ? out.education.map((x: any) => ({
    school: compactText(x.school || x.institution || x.university, 180),
    degree: compactText(x.degree, 180),
    field: compactText(x.field || x.major, 180),
    start: compactText(x.start || x.startDate, 80),
    end: compactText(x.end || x.endDate, 80),
  })).filter((x: any) => x.school || x.degree || x.field) : [];
  out.projects = Array.isArray(out.projects) ? out.projects.map((x: any) => ({
    name: compactText(x.name || x.title, 180),
    summary: compactText(x.summary || x.description, 900),
    skills: asArray(x.skills),
    evidence: asArray(x.evidence).length ? asArray(x.evidence) : ['Source: uploaded CV'],
  })).filter((x: any) => x.name || x.summary) : [];
  out.certifications = Array.isArray(out.certifications) ? out.certifications.map((x: any) => ({
    name: compactText(x.name || x.title, 200),
    issuer: compactText(x.issuer, 160),
    issuedAt: compactText(x.issuedAt || x.date, 80),
  })).filter((x: any) => x.name) : [];
  out.summary = stripCvDumpSummary(out.summary, out.experience);
  return out;
}

export async function parseCvStructured(text: string) {
  const fallback = normalizeParsedProfile(parseCvText(text), parseCvText(text));
  if (!process.env.OPENAI_API_KEY) return { profile: fallback, parser: 'heuristic-fallback', warning: 'OPENAI_API_KEY is not available to the running server.' };
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildCvParseSystemPrompt() },
        { role: 'user', content: buildCvParseUserPrompt(text) },
      ],
    });
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return { profile: normalizeParsedProfile(parsed, fallback), parser: 'ai-structured', warning: null };
  } catch (error) {
    const warning = error instanceof Error ? error.message : String(error);
    console.error('AI CV parsing failed, using heuristic parser:', warning);
    return { profile: fallback, parser: 'heuristic-fallback', warning };
  }
}
