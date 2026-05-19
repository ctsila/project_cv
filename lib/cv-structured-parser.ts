import OpenAI from 'openai';
import { parseCvText } from '@/lib/cv-parser';

function emptyProfile() {
  return { name: '', title: '', email: '', phone: '', location: '', links: [], summary: '', skills: [], experience: [], education: [], projects: [], certifications: [], languages: [], evidence: [] };
}

function asArray(value: any) {
  return Array.isArray(value) ? value.filter(Boolean) : typeof value === 'string' && value.trim() ? value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : [];
}

function normalizeParsedProfile(raw: any, fallback: any) {
  const out = { ...emptyProfile(), ...fallback, ...raw };
  out.links = asArray(out.links);
  out.skills = asArray(out.skills);
  out.languages = asArray(out.languages);
  out.evidence = asArray(out.evidence);
  out.experience = Array.isArray(out.experience) ? out.experience.map((x: any) => ({
    company: x.company || '',
    role: x.role || x.title || '',
    location: x.location || '',
    start: x.start || x.startDate || '',
    end: x.end || x.endDate || '',
    bullets: asArray(x.bullets),
    evidence: asArray(x.evidence).length ? asArray(x.evidence) : ['Source: uploaded CV'],
  })).filter((x: any) => x.company || x.role || x.bullets.length) : [];
  out.education = Array.isArray(out.education) ? out.education.map((x: any) => ({
    school: x.school || x.institution || x.university || '',
    degree: x.degree || '',
    field: x.field || x.major || '',
    start: x.start || x.startDate || '',
    end: x.end || x.endDate || '',
  })).filter((x: any) => x.school || x.degree || x.field) : [];
  out.projects = Array.isArray(out.projects) ? out.projects.map((x: any) => ({
    name: x.name || x.title || '',
    summary: x.summary || x.description || '',
    skills: asArray(x.skills),
    evidence: asArray(x.evidence).length ? asArray(x.evidence) : ['Source: uploaded CV'],
  })).filter((x: any) => x.name || x.summary) : [];
  out.certifications = Array.isArray(out.certifications) ? out.certifications.map((x: any) => ({
    name: x.name || x.title || '',
    issuer: x.issuer || '',
    issuedAt: x.issuedAt || x.date || '',
  })).filter((x: any) => x.name) : [];
  return out;
}

export async function parseCvStructured(text: string) {
  const fallback = parseCvText(text);
  if (!process.env.OPENAI_API_KEY) return normalizeParsedProfile(fallback, fallback);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Extract a complete structured profile from this CV text. Behave like a production CV parser in apps such as resume builders: one upload should fill all profile tabs. Do not summarize the whole CV into the summary field. Do not put experience into basics. Split each work role into a separate experience item. Split each education entry into a separate education item. Extract skills from a skills/core expertise section and also from tools mentioned in the CV. Extract projects, certifications, languages, contact details, location, and links when present. Return JSON only with this exact shape: {"name":"","title":"","email":"","phone":"","location":"","links":[],"summary":"2-4 sentence professional summary only, not full CV","skills":[],"experience":[{"company":"","role":"","location":"","start":"","end":"","bullets":[],"evidence":["Source: uploaded CV"]}],"education":[{"school":"","degree":"","field":"","start":"","end":""}],"projects":[{"name":"","summary":"","skills":[],"evidence":["Source: uploaded CV"]}],"certifications":[{"name":"","issuer":"","issuedAt":""}],"languages":[],"evidence":["Imported from uploaded CV"]}. CV TEXT: ${text.slice(0, 30000)}`;
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a strict CV information extraction engine. Extract only facts present in the CV text. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    });
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return normalizeParsedProfile(parsed, fallback);
  } catch (error) {
    console.error('AI CV parsing failed, using heuristic parser:', error);
    return normalizeParsedProfile(fallback, fallback);
  }
}
