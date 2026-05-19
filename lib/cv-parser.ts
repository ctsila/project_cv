<<<<<<< HEAD
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

export type ParsedExperience = {
	company: string;
	role: string;
	location: string;
	start: string;
	end: string;
	bullets: string[];
	evidence: string[];
};

export type ParsedEducation = {
	school: string;
	degree: string;
	field: string;
	start: string;
	end: string;
};

export type ParsedProject = {
	name: string;
	summary: string;
	skills: string[];
	evidence: string[];
};

export type ParsedCertification = {
	name: string;
	issuer: string;
	issuedAt: string;
};

export type ParsedProfile = {
	name: string;
	title: string;
	email: string;
	location: string;
	summary: string;
	links: string[];
	skills: string[];
	languages: string[];
	evidence: string[];
	experience: ParsedExperience[];
	education: ParsedEducation[];
	projects: ParsedProject[];
	certifications: ParsedCertification[];
};

const CV_KEYWORDS = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary', 'profile', 'objective', 'languages', 'achievements'];

const SECTION_ALIASES: Record<string, string[]> = {
	summary: ['summary', 'professional summary', 'profile', 'about'],
	experience: ['experience', 'work experience', 'employment history', 'professional experience', 'work history'],
	education: ['education', 'academic background'],
	skills: ['skills', 'core skills', 'technical skills'],
	projects: ['projects'],
	certifications: ['certifications', 'certificates'],
	languages: ['languages'],
	evidence: ['evidence', 'metrics', 'achievements'],
};

function cleanLines(text: string) {
	return text.replace(/\r/g, '').split('\n').map((line) => line.trim());
}

function isHeadingLine(line: string) {
	const normalized = line.toLowerCase().replace(/[:]+$/g, '').trim();
	return Object.values(SECTION_ALIASES).some((aliases) => aliases.includes(normalized));
}

function sectionNameFor(line: string) {
	const normalized = line.toLowerCase().replace(/[:]+$/g, '').trim();
	for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
		if (aliases.includes(normalized)) return section;
	}
	return '';
}

function splitBlocks(text: string) {
	return text
		.replace(/\r/g, '')
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter(Boolean);
}

function uniqueStrings(values: string[]) {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseList(text: string) {
	return uniqueStrings(
		text
			.split(/\n|•|·|\||,|;|\u2022/)
			.map((item) => item.replace(/^[-*]\s*/, '').trim())
			.filter((item) => item.length > 1),
	);
}

function parseDateRange(line: string) {
	const match = line.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4})\s*(?:—|-|to)\s*(Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4})/i);
	return { start: match?.[1]?.trim() || '', end: match?.[2]?.trim() || '' };
}

function looksLikeLocation(line: string) {
	return /remote|\b[A-Z][a-z]+(?:\s*[\/,-]\s*[A-Z][a-z]+)+|\b[A-Z]{2,3}\b/.test(line);
}

function parseExperienceSection(text: string): ParsedExperience[] {
	return splitBlocks(text).map((block) => {
		const lines = cleanLines(block).filter(Boolean);
		const [first, second, ...rest] = lines;
		const fallback = first || '';
		let role = fallback;
		let company = second || '';
		let metaLine = rest.find((line) => /\d{4}|present|current|remote|\b[A-Z][a-z]+\b/.test(line)) || '';

		const combined = fallback.match(/^(.*?)\s+(?:—|-|at)\s+(.*)$/i);
		if (combined) {
			role = combined[1].trim();
			company = combined[2].trim();
		}

		if (!company && second && !looksLikeLocation(second) && !/\d{4}/.test(second)) {
			company = second;
		}

		const { start, end } = parseDateRange(metaLine);
		const location = lines.find((line) => looksLikeLocation(line) && line !== metaLine && line !== company) || '';
		const bullets = lines
			.slice(2)
			.filter((line) => line && line !== metaLine && line !== location)
			.map((line) => line.replace(/^[•*-]\s*/, '').trim())
			.filter(Boolean);

		return {
			role: role || 'Role',
			company: company || 'Company',
			location,
			start,
			end,
			bullets,
			evidence: bullets.slice(0, 2),
		};
	});
}

function parseEducationSection(text: string): ParsedEducation[] {
	return splitBlocks(text).map((block) => {
		const lines = cleanLines(block).filter(Boolean);
		const school = lines[0] || 'School';
		const degree = lines[1] || '';
		const field = lines.find((line) => /bachelor|master|phd|degree|diploma|certificate|major|field/i.test(line)) || '';
		const dateLine = lines.find((line) => /\d{4}|present|current/i.test(line)) || '';
		const { start, end } = parseDateRange(dateLine);

		return { school, degree, field, start, end };
	});
}

function parseProjectSection(text: string): ParsedProject[] {
	return splitBlocks(text).map((block) => {
		const lines = cleanLines(block).filter(Boolean);
		return {
			name: lines[0] || 'Project',
			summary: lines.slice(1).join(' '),
			skills: parseList(lines.slice(1).join(' ')),
			evidence: lines.slice(1, 3),
		};
	});
}

function parseCertificationSection(text: string): ParsedCertification[] {
	return splitBlocks(text).map((block) => {
		const lines = cleanLines(block).filter(Boolean);
		return {
			name: lines[0] || 'Certification',
			issuer: lines[1] || '',
			issuedAt: lines.find((line) => /\d{4}|present|current/i.test(line)) || '',
		};
	});
}

function extractHeaderInfo(lines: string[]) {
	const nonEmpty = lines.filter(Boolean);
	const email = nonEmpty.join('\n').match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
	const phone = nonEmpty.join('\n').match(/\+?\d[\d\s()\-]{7,}/)?.[0] || '';
	const name = nonEmpty.find((line) => line.length > 2 && line.length < 80 && !line.includes('@') && !/\d{4}/.test(line) && !isHeadingLine(line)) || '';
	const titleIndex = Math.max(0, nonEmpty.indexOf(name) + 1);
	const title = nonEmpty.slice(titleIndex).find((line) => line && !line.includes('@') && !/\d{4}/.test(line) && !looksLikeLocation(line) && !isHeadingLine(line) && line !== phone) || '';
	const location = nonEmpty.find((line) => looksLikeLocation(line) && line !== name && line !== title && line !== phone) || '';
	return { name, title, email, location, phone };
}

function extractSections(lines: string[]) {
	const sections: Record<string, string[]> = { summary: [], experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], evidence: [] };
	let current = 'summary';
	let headerSeen = false;

	for (const line of lines) {
		if (!line) {
			if (headerSeen) sections[current].push('');
			continue;
		}
		if (isHeadingLine(line)) {
			current = sectionNameFor(line) || current;
			headerSeen = true;
			continue;
		}
		if (!headerSeen) {
			sections.summary.push(line);
			continue;
		}
		sections[current].push(line);
	}

	return sections;
}

export async function extractCvText(fileName: string, buffer: Buffer, mimeType: string) {
	if (mimeType === 'text/plain' || fileName.endsWith('.txt')) return buffer.toString('utf-8');
	if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
		try {
			const data = await pdf(buffer);
			if (data.text && data.text.trim()) return data.text;
		} catch {
			// Fall through to pdfjs-based extraction.
		}
		try {
			const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
			const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false }).promise;
			const pages: string[] = [];
			for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
				const page = await document.getPage(pageIndex);
				const content = await page.getTextContent();
				const pageText = content.items
					.map((item: any) => ('str' in item ? item.str : ''))
					.join(' ')
					.trim();
				if (pageText) pages.push(pageText);
			}
			return pages.join('\n\n');
		} catch {
			return '';
		}
	}
	if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
		const { value } = await mammoth.extractRawText({ buffer });
		return value || '';
	}
	if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
		const extractor = new WordExtractor();
		const document = await extractor.extract(buffer);
		return document.getBody() || '';
	}
	return '';
}

export function looksLikeCv(text: string) {
	const cleaned = text.toLowerCase();
	const hits = CV_KEYWORDS.filter((k) => cleaned.includes(k)).length;
	const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
	const hasPhone = /\+?\d[\d\s()\-]{7,}/.test(text);
	return text.trim().length > 120 && (hits >= 1 || hasEmail || hasPhone);
}

export function parseCvText(text: string): ParsedProfile {
	const lines = cleanLines(text);
	const header = extractHeaderInfo(lines);
	const sections = extractSections(lines);

	const summary = sections.summary.join(' ').trim() || lines.slice(0, 8).join(' ').trim();
	const skills = uniqueStrings(parseList(sections.skills.join(' ')));
	const languages = uniqueStrings(parseList(sections.languages.join(' ')));
	const evidence = uniqueStrings(parseList(sections.evidence.join(' ')));
	const links = uniqueStrings((text.match(/(?:https?:\/\/|www\.)\S+|[a-z0-9.-]+\/[a-z0-9._/-]+/gi) || []).map((value) => value.replace(/[),.;]+$/g, '')));

	return {
		name: header.name,
		title: header.title,
		email: header.email,
		location: header.location,
		summary,
		links,
		skills,
		languages,
		evidence,
		experience: parseExperienceSection(sections.experience.join('\n')),
		education: parseEducationSection(sections.education.join('\n')),
		projects: parseProjectSection(sections.projects.join('\n')),
		certifications: parseCertificationSection(sections.certifications.join('\n')),
	};
}
=======
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
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
