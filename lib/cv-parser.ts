type ParsedProfile = {
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

export function isProbablyCv(text: string) {
  const t = text.toLowerCase();
  const terms = ['experience','education','skills','projects','certifications','languages','summary','profile','employment','work history','опыт','образование','навыки','проекты','сертификаты','языки','experiencia','educación','habilidades'];
  const hits = terms.filter((term) => t.includes(term)).length;
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  return text.trim().length >= 150 && (hits >= 2 || (hits >= 1 && hasEmail));
}

function unique(items: string[]) { return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean))).slice(0, 80); }
const headers = ['summary','profile','professional summary','experience','work experience','professional experience','employment','education','skills','key skills','technical skills','projects','certifications','certificates','languages','о себе','опыт','образование','навыки','ключевые навыки','проекты','сертификаты','языки','perfil','experiencia','educación','habilidades','idiomas'];
function section(text: string, names: string[]) { const lines = text.split(/\r?\n/); const wanted = names.map((x)=>x.toLowerCase()); const start = lines.findIndex((line)=>wanted.includes(line.trim().toLowerCase())); if(start<0)return ''; const end = lines.findIndex((line,idx)=>idx>start && headers.includes(line.trim().toLowerCase())); return lines.slice(start+1,end>start?end:lines.length).join('\n').trim(); }
function parseDateRange(line: string) { const range=line.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{1,2}\.\d{4}|\d{4}|[А-Яа-я]+\s+\d{4})\s*(?:-|–|—|to|по)\s*(?:Present|Current|Now|н\.в\.|настоящее время|по настоящее время|\d{1,2}\.\d{4}|\d{4}|[А-Яа-я]+\s+\d{4}))/i); if(!range)return{start:'',end:''}; const parts=range[1].split(/\s*(?:-|–|—|to|по)\s*/i).filter(Boolean); return {start:parts[0]||'',end:parts.slice(1).join(' ')||''}; }
function looksLikeRole(line: string) { return /manager|analyst|engineer|specialist|lead|consultant|developer|director|administrator|architect|officer|coordinator|owner|product|security|soc|service|project|менеджер|аналитик|специалист|инженер|руководитель|администратор|архитектор|координатор|разработчик/i.test(line); }
function looksLikeCompany(line: string) { return line.length>=2 && line.length<90 && !/^[-•*]/.test(line) && !looksLikeRole(line) && !headers.includes(line.toLowerCase()); }
function isBullet(line: string) { return /^[-•*]/.test(line) || /managed|led|created|developed|implemented|coordinated|analyzed|supported|owned|built|improved|мониторинг|инцидент|управл|координир|разработ|внедр|анализ/i.test(line); }
function splitExperienceBlocks(experienceText: string) { const lines=experienceText.split('\n').map((x)=>x.trim()).filter(Boolean); const blocks:string[][]=[]; let current:string[]=[]; for(let i=0;i<lines.length;i++){ const line=lines[i], next=lines[i+1]||'', prev=lines[i-1]||''; const starts=current.length>0 && !isBullet(line) && (looksLikeRole(line)||parseDateRange(line).start||(looksLikeCompany(line)&&looksLikeRole(next))) && (isBullet(prev)||current.length>=3); if(starts){blocks.push(current); current=[line];} else current.push(line);} if(current.length)blocks.push(current); return blocks.filter((b)=>b.some(looksLikeRole)||b.some(isBullet)).slice(0,15); }
function parseExperienceBlock(block: string[]) { const roleLine=block.find(looksLikeRole)||block[0]||'Role from CV'; const dateLine=block.find((line)=>Boolean(parseDateRange(line).start)); const companyLine=block.find((line)=>line!==roleLine&&line!==dateLine&&looksLikeCompany(line))||'Company from CV'; const dates=dateLine?parseDateRange(dateLine):{start:'',end:''}; const bullets=block.filter((line)=>line!==roleLine&&line!==companyLine&&line!==dateLine&&isBullet(line)).map((line)=>line.replace(/^[-•*]\s*/,'')).slice(0,8); const fallback=block.filter((line)=>line!==roleLine&&line!==companyLine&&line!==dateLine&&line.length>20).slice(0,5); return {company:companyLine,role:roleLine,start:dates.start,end:dates.end,bullets:bullets.length?bullets:fallback,evidence:['Source: uploaded CV']}; }
function parseEducation(text: string) { return text.split('\n').map((x)=>x.trim()).filter(Boolean).slice(0,8).map((line)=>({school:line,degree:'',field:'',start:parseDateRange(line).start,end:parseDateRange(line).end})); }
function parseProjects(text: string) { return text.split('\n').map((x)=>x.trim()).filter((x)=>x.length>3).slice(0,12).map((line)=>({name:line.slice(0,100),summary:line,skills:[],evidence:['Source: uploaded CV']})); }
function parseCertifications(text: string) { return text.split('\n').map((x)=>x.trim()).filter(Boolean).slice(0,20).map((line)=>({name:line,issuer:'',issuedAt:parseDateRange(line).start||''})); }

export function parseCvText(text: string): ParsedProfile {
  const clean=text.replace(/\r/g,'').replace(/\t/g,' ').replace(/[ ]{2,}/g,' ').trim();
  const lines=clean.split('\n').map((line)=>line.trim()).filter(Boolean);
  const email=clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone=clean.match(/(?:\+?\d[\d\s()\-]{7,}\d)/)?.[0];
  const links=unique(clean.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/\S+|github\.com\/\S+|gitlab\.com\/\S+|[\w.-]+\.com\/\S+)/gi)||[]);
  const firstNameLine=lines.find((line)=>line.length>3&&line.length<80&&!line.includes('@')&&!headers.includes(line.toLowerCase()));
  const skillsText=section(clean,['skills','key skills','technical skills','навыки','ключевые навыки','habilidades']);
  const skills=unique((skillsText||clean).split(/[;,•|\n]/).filter((x)=>/sql|python|java|react|next|security|siem|soc|incident|cloud|azure|aws|linux|windows|splunk|kuma|wazuh|project|service|agile|scrum|itil|risk|compliance|edr|xdr|dlp|adfs|active directory|jira|servicenow|soar|iso|iec/i.test(x)));
  const summary=section(clean,['summary','profile','professional summary','о себе','perfil'])||lines.slice(1,5).join(' ');
  const eduText=section(clean,['education','образование','educación']);
  const languagesText=section(clean,['languages','языки','idiomas']);
  const projectsText=section(clean,['projects','проекты']);
  const certText=section(clean,['certifications','certificates','сертификаты']);
  const experienceText=section(clean,['experience','work experience','employment','professional experience','опыт','experiencia'])||clean;
  const experience=splitExperienceBlocks(experienceText).map(parseExperienceBlock).filter((e)=>e.role||e.company||e.bullets.length);
  return {name:firstNameLine,title:experience[0]?.role||lines.find(looksLikeRole)||'Current role',email,phone,links,summary,skills,languages:unique(languagesText.split(/[,;\n]/)).slice(0,10),evidence:['Imported from uploaded CV. Verify all extracted facts before using No Lies Mode.'],education:parseEducation(eduText),projects:parseProjects(projectsText),certifications:parseCertifications(certText),experience:experience.length?experience:[{company:'Company from CV',role:'Current role',start:'',end:'',bullets:experienceText.split('\n').slice(0,5),evidence:['Source: uploaded CV']}]};
}
