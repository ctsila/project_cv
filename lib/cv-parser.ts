type ParsedProfile = {
  name?: string;
  title?: string;
  email?: string;
  location?: string;
  links: string[];
  summary?: string;
  skills: string[];
  experience: Array<{ company: string; role: string; location?: string; start: string; end: string; bullets: string[]; evidence: string[] }>;
  education: Array<{ school: string; degree?: string; start?: string; end?: string }>;
  languages: string[];
  evidence: string[];
};

export function isProbablyCv(text: string) {
  const t = text.toLowerCase();
  const terms = ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'summary', 'profile', 'employment', 'work history', 'опыт', 'образование', 'навыки', 'проекты', 'сертификаты', 'языки', 'experiencia', 'educación', 'habilidades'];
  const hits = terms.filter((term) => t.includes(term)).length;
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  return text.trim().length >= 150 && (hits >= 2 || (hits >= 1 && hasEmail));
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean))).slice(0, 60);
}

function section(text: string, names: string[]) {
  const lines = text.split(/\r?\n/);
  const normalizedNames = names.map((x) => x.toLowerCase());
  const start = lines.findIndex((line) => normalizedNames.includes(line.trim().toLowerCase()));
  if (start < 0) return '';
  const sectionHeaders = ['summary', 'profile', 'experience', 'work experience', 'professional experience', 'employment', 'education', 'skills', 'projects', 'certifications', 'languages', 'о себе', 'опыт', 'образование', 'навыки', 'проекты', 'сертификаты', 'языки', 'experiencia', 'educación', 'habilidades', 'idiomas'];
  const end = lines.findIndex((line, idx) => idx > start && sectionHeaders.includes(line.trim().toLowerCase()));
  return lines.slice(start + 1, end > start ? end : lines.length).join('\n').trim();
}

function parseDateRange(line: string) {
  const range = line.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{1,2}\.\d{4}|\d{4}|[А-Яа-я]+\s+\d{4})\s*(?:-|–|—|to|по)\s*(?:Present|Current|Now|н\.в\.|настоящее время|по настоящее время|\d{1,2}\.\d{4}|\d{4}|[А-Яа-я]+\s+\d{4}))/i);
  if (!range) return { start: '', end: '' };
  const parts = range[1].split(/\s*(?:-|–|—|to|по)\s*/i).filter(Boolean);
  return { start: parts[0] || '', end: parts.slice(1).join(' ') || '' };
}

function looksLikeRole(line: string) {
  return /manager|analyst|engineer|specialist|lead|consultant|developer|director|administrator|architect|officer|coordinator|owner|product|security|soc|service|project|менеджер|аналитик|специалист|инженер|руководитель|администратор|архитектор|координатор|разработчик/i.test(line);
}

function looksLikeCompany(line: string) {
  return line.length >= 2 && line.length < 90 && !/^[-•]/.test(line) && !looksLikeRole(line) && !/experience|education|skills|summary|profile|опыт|образование|навыки/i.test(line);
}

function isBullet(line: string) {
  return /^[-•*]/.test(line) || /managed|led|created|developed|implemented|coordinated|analyzed|supported|owned|built|improved|мониторинг|инцидент|управл|координир|разработ|внедр|анализ/i.test(line);
}

function splitExperienceBlocks(experienceText: string) {
  const lines = experienceText.split('\n').map((x) => x.trim()).filter(Boolean);
  const blocks: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] || '';
    const prev = lines[i - 1] || '';
    const startsNew = current.length > 0 && !isBullet(line) && (looksLikeRole(line) || parseDateRange(line).start || (looksLikeCompany(line) && looksLikeRole(next))) && (isBullet(prev) || current.length >= 3);
    if (startsNew) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  return blocks.filter((block) => block.some((line) => looksLikeRole(line)) || block.some((line) => isBullet(line))).slice(0, 12);
}

function parseExperienceBlock(block: string[]) {
  const roleLine = block.find(looksLikeRole) || block[0] || 'Role from CV';
  const dateLine = block.find((line) => Boolean(parseDateRange(line).start));
  const companyLine = block.find((line) => line !== roleLine && line !== dateLine && looksLikeCompany(line)) || 'Company from CV';
  const dates = dateLine ? parseDateRange(dateLine) : { start: '', end: '' };
  const bullets = block.filter((line) => line !== roleLine && line !== companyLine && line !== dateLine && isBullet(line)).map((line) => line.replace(/^[-•*]\s*/, '')).slice(0, 8);
  const fallbackBullets = block.filter((line) => line !== roleLine && line !== companyLine && line !== dateLine && line.length > 20).slice(0, 5);
  return { company: companyLine, role: roleLine, start: dates.start, end: dates.end, bullets: bullets.length ? bullets : fallbackBullets, evidence: ['Source: uploaded CV'] };
}

export function parseCvText(text: string): ParsedProfile {
  const clean = text.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
  const lines = clean.split('\n').map((line) => line.trim()).filter(Boolean);
  const email = clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const links = unique(clean.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/\S+|github\.com\/\S+|gitlab\.com\/\S+|[\w.-]+\.com\/\S+)/gi) || []);
  const firstNameLine = lines.find((line) => line.length > 3 && line.length < 80 && !line.includes('@') && !/experience|education|skills|summary|profile|опыт|образование|навыки/i.test(line));
  const skillsSection = section(clean, ['skills', 'key skills', 'technical skills', 'навыки', 'ключевые навыки', 'habilidades']);
  const skills = unique((skillsSection || clean).split(/[;,•|\n]/).filter((x) => /sql|python|java|react|next|security|siem|soc|incident|cloud|azure|aws|linux|windows|splunk|kuma|wazuh|project|service|agile|scrum|itil|risk|compliance|edr|xdr|dlp|adfs|active directory|jira|servicenow/i.test(x)));
  const summary = section(clean, ['summary', 'profile', 'professional summary', 'о себе', 'perfil']) || lines.slice(1, 5).join(' ');
  const edu = section(clean, ['education', 'образование', 'educación']);
  const languagesText = section(clean, ['languages', 'языки', 'idiomas']);
  const experienceText = section(clean, ['experience', 'work experience', 'employment', 'professional experience', 'опыт', 'experiencia']) || clean;
  const blocks = splitExperienceBlocks(experienceText);
  const experience = blocks.map(parseExperienceBlock).filter((e) => e.role || e.company || e.bullets.length);
  return {
    name: firstNameLine,
    title: experience[0]?.role || 'Current role',
    email,
    links,
    summary,
    skills,
    languages: unique(languagesText.split(/[,;\n]/)).slice(0, 10),
    evidence: ['Imported from uploaded CV. Verify all extracted facts before using No Lies Mode.'],
    education: edu ? [{ school: edu.split('\n')[0] || 'Education from CV', degree: edu.split('\n').slice(1, 3).join(' ') }] : [],
    experience: experience.length ? experience : [{ company: 'Company from CV', role: 'Current role', start: '', end: '', bullets: experienceText.split('\n').slice(0, 5), evidence: ['Source: uploaded CV'] }],
  };
}
