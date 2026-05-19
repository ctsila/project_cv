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
  return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean))).slice(0, 40);
}

function section(text: string, names: string[]) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => names.some((name) => line.trim().toLowerCase() === name));
  if (start < 0) return '';
  const end = lines.findIndex((line, idx) => idx > start && /^[A-ZА-Я][A-ZА-Я\s/&-]{2,}$/.test(line.trim()) && line.trim().length < 40);
  return lines.slice(start + 1, end > start ? end : start + 20).join('\n').trim();
}

export function parseCvText(text: string): ParsedProfile {
  const clean = text.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
  const lines = clean.split('\n').map((line) => line.trim()).filter(Boolean);
  const email = clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const links = unique(clean.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/\S+|github\.com\/\S+|gitlab\.com\/\S+|[\w.-]+\.com\/\S+)/gi) || []);
  const firstNameLine = lines.find((line) => line.length > 3 && line.length < 80 && !line.includes('@') && !/experience|education|skills|summary|profile/i.test(line));
  const skillsSection = section(clean, ['skills', 'key skills', 'technical skills', 'навыки', 'ключевые навыки', 'habilidades']);
  const skills = unique((skillsSection || clean).split(/[;,•|\n]/).filter((x) => /sql|python|java|react|next|security|siem|soc|incident|cloud|azure|aws|linux|windows|splunk|kuma|wazuh|project|service|agile|scrum|itil|risk|compliance/i.test(x)));
  const summary = section(clean, ['summary', 'profile', 'professional summary', 'о себе', 'perfil']) || lines.slice(1, 5).join(' ');
  const edu = section(clean, ['education', 'образование', 'educación']);
  const languagesText = section(clean, ['languages', 'языки', 'idiomas']);
  const experienceText = section(clean, ['experience', 'work experience', 'employment', 'professional experience', 'опыт', 'experiencia']) || clean;
  const expLines = experienceText.split('\n').map((x) => x.trim()).filter(Boolean);
  const bullets = expLines.filter((line) => /^[-•]/.test(line) || /managed|led|created|developed|implemented|coordinated|analyzed|мониторинг|инцидент|управл/i.test(line)).map((line) => line.replace(/^[-•]\s*/, '')).slice(0, 8);
  const roleLine = expLines.find((line) => /manager|analyst|engineer|specialist|lead|consultant|developer|менеджер|аналитик|специалист|инженер/i.test(line)) || 'Current role';
  const companyLine = expLines.find((line) => line !== roleLine && line.length < 80 && !/^[-•]/.test(line)) || 'Company from CV';
  return {
    name: firstNameLine,
    title: roleLine,
    email,
    links,
    summary,
    skills,
    languages: unique(languagesText.split(/[,;\n]/)).slice(0, 10),
    evidence: ['Imported from uploaded CV. Verify all extracted facts before using No Lies Mode.'],
    education: edu ? [{ school: edu.split('\n')[0] || 'Education from CV', degree: edu.split('\n').slice(1, 3).join(' ') }] : [],
    experience: [{ company: companyLine, role: roleLine, start: '', end: '', bullets: bullets.length ? bullets : expLines.slice(0, 5), evidence: ['Source: uploaded CV'] }],
  };
}
