# AI Resume Generator and Cover Letter Generator

A premium SaaS-style MVP for truthful, market-adapted resume and cover letter generation. The product is built around **No Lies Mode**: generated application materials must be grounded in user-provided career facts and evidence notes.

## What is included

- Next.js + TypeScript + Tailwind web app.
- Landing, sign-in UI, dashboard, career profile vault, vacancy input, compare workspace, generation history, tracker.
- OpenAI-powered generation through `/api/ai/generate` when `OPENAI_API_KEY` is configured.
- Safe demo fallback when no OpenAI key is present.
- Vacancy parsing from pasted text and generic public URLs.
- hh.ru public vacancy ingestion through the hh public API when the URL contains a vacancy id.
- LinkedIn URL field with fallback to pasted text. LinkedIn frequently blocks automated reads, so production deployment should use official partner/API access or user-provided text/export.
- Auth.js/NextAuth provider configuration for Google, LinkedIn, Yandex, plus a placeholder hh.ru credentials-style demo provider.
- Database-backed profile, vacancy, and history data for authenticated users.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

See `.env.example`.

## Deployment

The easiest deployment path is Vercel: import this GitHub repository, add environment variables, configure OAuth redirect URLs, and deploy.

## Production hardening still required

This is a working MVP codebase, not a fully hardened paid SaaS backend. Before real public launch, add PostgreSQL persistence, real OAuth credentials, rate limiting, background jobs, tests, privacy/legal pages, and a proper PDF/DOCX rendering service.

## API note

hh.ru public vacancies can be read through public endpoints. LinkedIn generally does not allow reliable unauthenticated scraping; use official APIs/partner access or pasted job text.
