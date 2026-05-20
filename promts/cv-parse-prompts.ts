export function buildCvParseSystemPrompt() {
  return 'You are a production-grade CV parsing engine. Return valid JSON only. Extract structured fields only from the CV text.';
}

export function buildCvParseUserPrompt(text: string) {
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
