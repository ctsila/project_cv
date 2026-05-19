# AI Resume Generator and Cover Letter Generator

A Next.js SaaS-style application for vacancy-based CV/resume and cover-letter generation. The app is built around profile parsing, vacancy analysis, comparison, generation history, an application tracker, and **No Lies Mode**.

## Current feature set

- Email/password registration and sign-in only.
- Password reset request flow through configured SMTP.
- PostgreSQL-backed user profile, CV sources, parsed vacancies, generated resumes, cover letters, applications, and history.
- One-place CV upload on the Career Profile page.
- CV parsing from pasted text, PDF, DOCX, and TXT.
- AI-structured CV parsing when `OPENAI_API_KEY` is configured, with heuristic fallback if it is not.
- Profile sections populated from one CV upload: basics, experience, education, skills, projects, certifications, languages, and evidence notes.
- Vacancy parsing from pasted text and supported public URLs, including hh.ru public vacancy URLs.
- Vacancy relevance validation to block irrelevant text.
- Compare Workspace with vacancy selector, CV language selector, target-market selector, and No Lies Mode awareness.
- CV and cover-letter generation in the selected language, with a language guard that falls back to the deterministic generator if AI returns the wrong language.
- History page where previous CV uploads, parsed vacancies, generated resumes, cover letters, and match details can be opened.
- Application tracker with Kanban, list, and calendar views.
- PDF, DOCX, and TXT export API.
- UI language support for English, Russian, and Spanish in the main application shell and core screens.

## Removed / intentionally disabled

Google, Yandex, hh.ru, and LinkedIn sign-in buttons/providers were removed from the active UI because real OAuth apps and verified redirect configuration were not available. The app now uses email/password authentication only.

LinkedIn vacancy scraping is not treated as reliable. For LinkedIn vacancies, paste the vacancy text manually unless official API/partner access is configured later.

## Local development setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

### 3. Create local environment file

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at least:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_resume
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is required for production-quality CV parsing and AI generation. Without it, the app uses heuristic fallback parsing and deterministic generation.

Never commit `.env.local` or real API keys.

### 4. Generate Prisma client and apply migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Run tests

```bash
npm run test
```

### 6. Start the application

```bash
npm run dev
```

Open `http://localhost:3000`.

## GitHub Codespaces setup

If running in GitHub Codespaces:

1. Add repository secrets or Codespaces secrets for `OPENAI_API_KEY`, `OPENAI_MODEL`, `NEXTAUTH_SECRET`, and any SMTP variables you need.
2. Start services:

```bash
docker compose up -d postgres redis
```

3. Run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

If the CV parser returns `parser: "heuristic-fallback"`, the running server cannot see `OPENAI_API_KEY`. Stop and reopen the Codespace, then restart `npm run dev`.

## Useful scripts

```bash
npm run dev          # start Next.js dev server
npm run build        # generate Prisma client and build Next.js
npm run start        # start production server
npm run test         # run Vitest tests
npm run db:generate  # generate Prisma client
npm run db:migrate   # run Prisma migration locally
npm run db:studio    # open Prisma Studio
npm run worker       # start background worker
```

## Production deployment checklist

Before public launch, configure:

- Managed PostgreSQL and `DATABASE_URL`.
- Strong `NEXTAUTH_SECRET`.
- `OPENAI_API_KEY` and model.
- SMTP provider for password reset emails.
- HTTPS deployment domain and `NEXTAUTH_URL`.
- Rate-limit strategy suitable for serverless/production. The current in-memory helper is acceptable for local MVP only.
- File upload storage. Current CV source storage is database-backed for extracted text; production file storage should use object storage.
- Legal review for privacy policy and terms.

## Notes on No Lies Mode

When No Lies Mode is ON, generation must use only facts found in the profile/uploaded CV. Unsupported vacancy requirements are listed as missing or weak evidence instead of being invented. When No Lies Mode is OFF, wording can be made more flexible, but the app still must not fabricate specific employers, dates, degrees, certificates, or credentials.
