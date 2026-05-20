type AnyObj = Record<string, any>;

const ru = {
  summary: 'КРАТКОЕ ОПИСАНИЕ', skills: 'КЛЮЧЕВЫЕ НАВЫКИ', experience: 'ОПЫТ', education: 'ОБРАЗОВАНИЕ', gaps: 'НЕПОДТВЕРЖДЕННЫЕ ИЛИ СЛАБЫЕ СОВПАДЕНИЯ', coverGreeting: 'Здравствуйте!', coverIntro: 'Меня заинтересовала вакансия, так как она совпадает с подтвержденным опытом и навыками из моего профиля.', coverEvidence: 'Я намеренно не добавляю неподтвержденные достижения: все формулировки основаны на указанном опыте.', coverClose: 'Буду рада обсудить, как мой опыт может быть полезен вашей команде.', regards: 'С уважением', role: 'Роль', company: 'Компания', current: 'по настоящее время'
};
const en = {
  summary: 'SUMMARY', skills: 'CORE SKILLS', experience: 'EXPERIENCE', education: 'EDUCATION', gaps: 'WEAK OR UNSUPPORTED MATCHES', coverGreeting: 'Dear Hiring Team,', coverIntro: 'I am interested in this vacancy because it matches verified experience and skills from my profile.', coverEvidence: 'I intentionally avoid unsupported claims: every statement is based on the provided profile facts.', coverClose: 'I would be glad to discuss how my experience can support your team.', regards: 'Best regards', role: 'Role', company: 'Company', current: 'Present'
};
const es = {
  summary: 'RESUMEN', skills: 'HABILIDADES CLAVE', experience: 'EXPERIENCIA', education: 'EDUCACIÓN', gaps: 'COINCIDENCIAS DÉBILES O NO VERIFICADAS', coverGreeting: 'Estimado equipo de selección:', coverIntro: 'Me interesa esta vacante porque coincide con experiencia y habilidades verificadas de mi perfil.', coverEvidence: 'Evito añadir afirmaciones no respaldadas: cada frase se basa en los datos proporcionados.', coverClose: 'Me gustaría comentar cómo mi experiencia puede ser útil para su equipo.', regards: 'Atentamente', role: 'Puesto', company: 'Empresa', current: 'Actualidad'
};

function labels(language: string) { const l = language.toLowerCase(); if (l.includes('russian') || l === 'ru') return ru; if (l.includes('spanish') || l === 'es') return es; return en; }
function arr(v: any): string[] { return Array.isArray(v) ? v.filter(Boolean).map(String) : typeof v === 'string' ? v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : []; }
function normalize(s: string) { return s.toLowerCase().replace(/[^a-zа-я0-9+#.]+/gi, ' ').trim(); }
function includesSkill(text: string, skill: string) { return normalize(text).includes(normalize(skill)); }
function collectProfileText(profile: AnyObj) { return JSON.stringify(profile || {}); }
function profileExperiences(profile: AnyObj) { return profile.experience || profile.experiences || []; }
function profileEducation(profile: AnyObj) { return profile.education || profile.educations || []; }
function dateRange(e: AnyObj, t: AnyObj) { const start = e.start || e.startDate || ''; const end = e.end || e.endDate || t.current; return [start, end].filter(Boolean).join(' — '); }
function relevantBullets(exp: AnyObj, jobKeywords: string[]) { const bullets = arr(exp.bullets); const matched = bullets.filter((b) => jobKeywords.some((k) => includesSkill(b, k))); return (matched.length ? matched : bullets).slice(0, 4); }

export function buildNoLiesPack(
  profile: AnyObj,
  job: AnyObj,
  resumeLanguage = 'English',
  market = 'EU',
  coverLetterLanguage?: string,
) {
  const t = labels(resumeLanguage);
  const coverLang = coverLetterLanguage || resumeLanguage;
  const c = labels(coverLang);
  const profileText = collectProfileText(profile);
  const jobKeywords = arr([...(job.requiredSkills || []), ...(job.preferredSkills || []), ...(job.keywords || [])]).length ? arr([...(job.requiredSkills || []), ...(job.preferredSkills || []), ...(job.keywords || [])]) : arr(job.sourceText).slice(0, 20);
  const profileSkills = arr(profile.skills);
  const matched = jobKeywords.filter((k) => includesSkill(profileText, k)).slice(0, 18);
  const missing = jobKeywords.filter((k) => !includesSkill(profileText, k)).slice(0, 10);
  const emphasizedSkills = [...matched, ...profileSkills.filter((s) => jobKeywords.some((k) => includesSkill(s, k)))];
  const uniqueSkills = Array.from(new Set(emphasizedSkills.length ? emphasizedSkills : profileSkills)).slice(0, 16);
  const exps = profileExperiences(profile);
  const name = profile.name || 'Candidate';
  const title = profile.title || exps[0]?.role || t.role;
  const contact = [profile.location, profile.email, ...(profile.links || [])].filter(Boolean).join(' · ');
  const summary = resumeLanguage.toLowerCase().includes('russian')
    ? `${title} с подтвержденным опытом, релевантным вакансии ${job.title || ''}. Акцент: ${matched.slice(0, 5).join(', ') || 'релевантные обязанности и навыки'}. Неподтвержденные требования не добавлены.`
    : resumeLanguage.toLowerCase().includes('spanish')
      ? `${title} con experiencia verificada relevante para ${job.title || 'la vacante'}. Enfoque: ${matched.slice(0, 5).join(', ') || 'responsabilidades y habilidades relevantes'}. No se añaden afirmaciones sin evidencia.`
      : `${title} with verified experience relevant to ${job.title || 'the target role'}. Focus areas: ${matched.slice(0, 5).join(', ') || 'relevant responsibilities and skills'}. Unsupported claims were not added.`;
  const expText = exps.slice(0, 4).map((e: AnyObj) => {
    const bullets = relevantBullets(e, jobKeywords).map((b) => `• ${b}`).join('\n');
    return `${e.role || t.role} — ${e.company || t.company}\n${[e.location, dateRange(e, t)].filter(Boolean).join(' · ')}\n${bullets}`;
  }).join('\n\n');
  const eduText = profileEducation(profile).slice(0, 3).map((e: AnyObj) => [e.degree, e.field, e.school].filter(Boolean).join(' — ')).filter(Boolean).join('\n');
  const gapText = missing.length ? missing.map((x) => `• ${x}`).join('\n') : '• None identified from the parsed vacancy and profile.';
  const resume = `${name}\n${title}\n${contact}\n\n${t.summary}\n${summary}\n\n${t.skills}\n${uniqueSkills.join(' · ')}\n\n${t.experience}\n${expText || 'No experience facts were provided yet.'}\n\n${eduText ? `${t.education}\n${eduText}\n\n` : ''}${t.gaps}\n${gapText}`;
  const coverLetterSummary = coverLang.toLowerCase().includes('russian')
    ? `${title} с подтвержденным опытом, релевантным вакансии ${job.title || ''}.`
    : coverLang.toLowerCase().includes('spanish')
      ? `${title} con experiencia verificada relevante para ${job.title || 'la vacante'}.`
      : `${title} with verified experience relevant to ${job.title || 'the target role'}.`;
  const coverLetter = `${c.coverGreeting}\n\n${c.coverIntro}\n\n${coverLetterSummary}\n\n${c.coverEvidence}\n\n${c.coverClose}\n\n${c.regards},\n${name}`;
  const suggestions = exps.slice(0, 2).flatMap((e: AnyObj) => relevantBullets(e, jobKeywords).slice(0, 2).map((b) => ({ original: b, rewrite: b, why: resumeLanguage.toLowerCase().includes('russian') ? 'Факт сохранен без усиления, потому что он уже подтвержден профилем и связан с вакансией.' : 'Kept factual and role-relevant without adding unsupported impact.', evidence: arr(e.evidence)[0] || 'Profile / uploaded CV', risk: 'low' })));
  const atsScore = Math.min(95, Math.max(45, Math.round((matched.length / Math.max(1, jobKeywords.length)) * 70 + uniqueSkills.length)));
  const localeScore = market === 'Russia/CIS' && resumeLanguage === 'Russian' ? 92 : 86;
  return {
    atsScore,
    localeScore,
    truthRisk: missing.length > matched.length ? 'medium' : 'low',
    matched,
    missing,
    weakEvidence: missing,
    resume,
    coverLetter,
    interviewQuestions: matched.slice(0, 6).map((m) => resumeLanguage.toLowerCase().includes('russian') ? `Расскажите о подтвержденном опыте с ${m}.` : `Describe your verified experience with ${m}.`),
    suggestions,
  };
}
