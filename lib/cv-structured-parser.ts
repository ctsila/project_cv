import OpenAI from 'openai';
import { parseCvText } from '@/lib/cv-parser';

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

function buildPrompt(text: string) {
  return `You are parsing a CV/resume for a resume-builder web app. Extract every profile tab from ONE uploaded CV. Use only facts explicitly present in the CV.

Critical extraction rules:
1. name: candidate name from the CV header only. Do not use job title, company, location, email, phone, or section heading as name.
2. location: candidate residential/current location from the contact/header area only. Do not use employer locations, university locations, or job locations unless clearly presented as candidate location.
3. summary: only a professional summary/profile paragraph. It must be 2-4 sentences max. Do not paste work experience, education, skills list, or whole CV into summary.
4. experience: split each separate job/role into its own object. One role = one object. Keep company, role, dates, location, and bullets separated.
5. education: split each school/university/program into its own object.
6. skills: extract a clean list of skills/tools/technologies/methodologies. Do not leave this empty if tools or skills are present.
7. projects, certifications, languages: extract to their dedicated arrays when present.
8. Unknown fields must be empty strings or empty arrays. Never invent facts.

Return JSON only with this exact shape:
{"name":"","title":"","email":"","phone":"","location":"","links":[],"summary":"","skills":[],"experience":[{"company":"","role":"","location":"","start":"","end":"","bullets":[],"evidence":["Source: uploaded CV"]}],"education":[{"school":"","degree":"","field":"","start":"","end":""}],"projects":[{"name":"","summary":"","skills":[],"evidence":["Source: uploaded CV"]}],"certifications":[{"name":"","issuer":"","issuedAt":""}],"languages":[],"evidence":["Imported from uploaded CV"]}

CV TEXT START
${text.slice(0, 45000)}
CV TEXT END`;
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
        { role: 'system', content: 'You are a production-grade CV parsing engine. Return valid JSON only. Extract structured fields only from the CV text.' },
        { role: 'user', content: buildPrompt(text) },
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
