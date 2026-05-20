type AnyObj = Record<string, any>;

export function wantsRussian(language: string) {
  const l = (language || '').toLowerCase();
  return l.includes('russian') || l === 'ru';
}

export function wantsSpanish(language: string) {
  const l = (language || '').toLowerCase();
  return l.includes('spanish') || l === 'es';
}

export function languageInstruction(language: string) {
  if (wantsRussian(language)) {
    return 'Russian only. All headings, summary, bullets, skills, evidence notes, missing requirements, and interview questions must be in Russian.';
  }
  if (wantsSpanish(language)) {
    return 'Spanish only. All headings, summary, bullets, skills, evidence notes, missing requirements, and interview questions must be in Spanish.';
  }
  return `${language} only.`;
}

export function coverLetterLanguageInstruction(language: string) {
  if (wantsRussian(language)) {
    return 'Cover letter must be in Russian only.';
  }
  if (wantsSpanish(language)) {
    return 'Cover letter must be in Spanish only.';
  }
  return `Cover letter must be in ${language} only.`;
}

export function buildGenerationSystemPrompt(params: { resumeLanguage: string; coverLetterLanguage: string; noLiesMode: boolean }) {
  const mode = params.noLiesMode
    ? 'NO_LIES_MODE_ON: Use only explicit profile evidence. Never invent companies, dates, metrics, tools, credentials, or impact.'
    : 'NO_LIES_MODE_OFF: Improve wording and structure, but still never fabricate companies, dates, degrees, certificates, or employers.';

  return [
    'You are a production resume generator.',
    'Return valid JSON only. No markdown, no prose outside JSON.',
    mode,
    `Resume language: ${params.resumeLanguage}. ${languageInstruction(params.resumeLanguage)}`,
    `Cover letter language: ${params.coverLetterLanguage}. ${coverLetterLanguageInstruction(params.coverLetterLanguage)}`,
    'Keep JSON schema strict and complete, including arrays even when empty.',
  ].join(' ');
}

export function buildGenerationUserPrompt(params: {
  profile: AnyObj;
  job: AnyObj;
  baseline: AnyObj;
  market: string;
  resumeLanguage: string;
  coverLetterLanguage: string;
  noLiesMode: boolean;
}) {
  return `Generate a tailored CV package.
Target market: ${params.market}
No Lies Mode: ${params.noLiesMode ? 'ON' : 'OFF'}
Resume language selected by user: ${params.resumeLanguage}
Cover letter language selected by user: ${params.coverLetterLanguage}

Hard output requirements:
1. JSON schema exactly:
{
  "atsScore": number,
  "localeScore": number,
  "truthRisk": "low"|"medium"|"high",
  "matched": string[],
  "missing": string[],
  "weakEvidence": string[],
  "resume": string,
  "coverLetter": string,
  "interviewQuestions": string[],
  "suggestions": [{"original": string, "rewrite": string, "why": string, "evidence": string, "risk": "low"|"medium"|"high"}]
}
2. Resume must be detailed and structured with clear section headings and concise bullets.
3. Cover letter must be detailed, role-specific, and in the selected cover letter language.
4. Interview questions must be specific to the vacancy and evidence-focused.
5. If evidence is missing, put it in missing/weakEvidence instead of inventing.

PROFILE=${JSON.stringify(params.profile)}
JOB=${JSON.stringify(params.job)}
BASELINE=${JSON.stringify(params.baseline)}`;
}

export function buildLanguageRepairPrompt(params: { resumeLanguage: string; coverLetterLanguage: string }) {
  return `Rewrite this JSON content while preserving schema and facts. Resume field must be ${params.resumeLanguage}. Cover letter field must be ${params.coverLetterLanguage}. Other text fields should follow resume language. Do not add facts.`;
}
