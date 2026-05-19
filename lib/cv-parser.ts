export type ParsedProfile = {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: string[];
  summary?: string;
  skills: string[];
  experience: Array<{ company: string; role: string; location?: string; start: string; end: string; bullets: string[]; evidence: string[] }>;
  education: Array<{ school: string; degree?: string; field?: string; start?: string; end?: string }>;
  projects: Array<{ name: string; summary?: string; skills: string[]; evidence: string[] }>;
  certifications: Array<{ name: string; issuer?: string; issuedAt?: string }>;
  languages: string[];
  evidence: string[];
};

const SECTION_NAMES = ['summary','profile','experience','work experience','professional experience','employment','education','skills','key skills','technical skills','projects','certifications','certificates','languages','опыт','опыт работы','образование','навыки','ключевые навыки','проекты','сертификаты','языки','experiencia','educación','habilidades','idiomas'];

export function isProbablyCv(text: string) {
  const t = text.toLowerCase();
  const hits = SECTION_NAMES.filter((x) => t.includes(x)).length;
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const hasPhone = /(?:\+?\d[\d\s()\-]{7,}\d)/.test(text);
  return text.trim().length >= 120 && (hits >= 1 || hasEmail || hasPhone);
}

function uniq(values: string[]) { return Array.from(new Set(values.map((x) => x.trim()).filter(Boolean))).slice(0, 100); }
function isHeader(line: string) { return SECTION_NAMES.includes(line.trim().replace(/:$/,'').toLowerCase()); }
function section(text: string, names: string[]) {
  const lines = text.split(/\r?\n/);
  const wanted = names.map((x) => x.toLowerCase());
  const start = lines.findIndex((line) => wanted.includes(line.trim().replace(/:$/,'').toLowerCase()));
  if (start < 0) return '';
  const end = lines.findIndex((line, idx) => idx > start && isHeader(line));
  return lines.slice(start + 1, end > start ? end : lines.length).join('\n').trim();
}
function dates(line: string) {
  const m = line.match(/((?:\d{1,2}\.\d{4}|\d{4}|[A-Za-zА-Яа-я]+\s+\d{4})\s*(?:-|–|—|to|по)\s*(?:Present|Current|Now|н\.в\.|настоящее время|\d{1,2}\.\d{4}|\d{4}|[A-Za-zА-Яа-я]+\s+\d{4}))/i);
  if (!m) return { start: '', end: '' };
  const p = m[1].split(/\s*(?:-|–|—|to|по)\s*/i).filter(Boolean);
  return { start: p[0] || '', end: p.slice(1).join(' ') || '' };
}
function roleLike(line: string) { return /manager|analyst|engineer|specialist|lead|consultant|developer|director|administrator|architect|officer|coordinator|product|security|soc|service|project|менеджер|аналитик|специалист|инженер|руководитель|администратор|архитектор|координатор|разработчик/i.test(line); }
function bulletLike(line: string) { return /^[-•*]/.test(line) || /managed|led|created|developed|implemented|coordinated|analyzed|supported|built|improved|мониторинг|инцидент|управл|координир|разработ|внедр|анализ/i.test(line); }
function parseExperience(text: string) {
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const blocks: string[][] = []; let current: string[] = [];
  for (const line of lines) {
    const starts = current.length > 2 && !bulletLike(line) && (roleLike(line) || dates(line).start);
    if (starts) { blocks.push(current); current = [line]; } else current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks.slice(0, 15).map((block) => {
    const role = block.find(roleLike) || block[0] || 'Role from CV';
    const dateLine = block.find((x) => Boolean(dates(x).start));
    const company = block.find((x) => x !== role && x !== dateLine && x.length < 90 && !bulletLike(x)) || 'Company from CV';
    const d = dateLine ? dates(dateLine) : { start: '', end: '' };
    const bullets = block.filter((x) => x !== role && x !== company && x !== dateLine && (bulletLike(x) || x.length > 25)).map((x) => x.replace(/^[-•*]\s*/, '')).slice(0, 8);
    return { company, role, start: d.start, end: d.end, bullets, evidence: ['Source: uploaded CV'] };
  });
}
function parseLines(text: string) { return text.split('\n').map((x) => x.trim()).filter(Boolean); }

export function parseCvText(text: string): ParsedProfile {
  const clean = text.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
  const lines = parseLines(clean);
  const email = clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = clean.match(/(?:\+?\d[\d\s()\-]{7,}\d)/)?.[0];
  const links = uniq(clean.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/\S+|github\.com\/\S+|gitlab\.com\/\S+|[\w.-]+\.com\/\S+)/gi) || []);
  const name = lines.find((line) => line.length > 3 && line.length < 80 && !line.includes('@') && !isHeader(line));
  const expText = section(clean, ['experience','work experience','professional experience','employment','опыт','опыт работы','experiencia']) || clean;
  const experience = parseExperience(expText);
  const skillsText = section(clean, ['skills','key skills','technical skills','навыки','ключевые навыки','habilidades']);
  const skills = uniq((skillsText || clean).split(/[;,•|\n]/).filter((x) => /sql|python|java|react|next|security|siem|soc|incident|cloud|azure|aws|linux|windows|project|service|agile|scrum|itil|risk|compliance|edr|xdr|dlp|active directory|jira|servicenow|soar/i.test(x)));
  const education = parseLines(section(clean, ['education','образование','educación'])).slice(0, 8).map((x) => ({ school: x, degree: '', field: '', start: dates(x).start, end: dates(x).end }));
  const projects = parseLines(section(clean, ['projects','проекты'])).slice(0, 12).map((x) => ({ name: x.slice(0, 100), summary: x, skills: [], evidence: ['Source: uploaded CV'] }));
  const certifications = parseLines(section(clean, ['certifications','certificates','сертификаты'])).slice(0, 20).map((x) => ({ name: x, issuer: '', issuedAt: dates(x).start || '' }));
  const languages = uniq(section(clean, ['languages','языки','idiomas']).split(/[,;\n]/)).slice(0, 10);
  const summary = section(clean, ['summary','profile','professional summary','о себе','perfil']) || lines.slice(1, 5).join(' ');
  return { name, title: experience[0]?.role || lines.find(roleLike) || 'Current role', email, phone, links, summary, skills, languages, evidence: ['Imported from uploaded CV.'], education, projects, certifications, experience: experience.length ? experience : [{ company: 'Company from CV', role: 'Current role', start: '', end: '', bullets: expText.split('\n').slice(0, 5), evidence: ['Source: uploaded CV'] }] };
}
