# Technical Overview

## What It Is
- A Next.js (App Router) + TypeScript + Tailwind MVP for evidence-first resume and cover letter generation.
- Core idea: "No Lies Mode" (generated content must be grounded in user-provided evidence).

## High-Level Architecture
- Frontend (App Router UI): pages and layouts in app/, core UI shell in components/AppShell.tsx.
- API routes: server functions in app/api (AI generation, auth, vacancy parsing, export, history).
- Persistence: Prisma + PostgreSQL models in prisma/schema.prisma.
- Local MVP storage (browser): demo data and local history in lib/storage.ts and lib/history.ts.
- Background jobs (optional): queue helpers in lib/job-queue.ts, worker in workers/generation-worker.ts.

## Frontend Pages
- Landing / auth UI: app/page.tsx
  - Login/register/reset wired to API routes and NextAuth credentials flow.
  - Links to NextAuth providers (Google/LinkedIn/Yandex/HH).
- Dashboard: app/dashboard/page.tsx
  - Snapshot of apps and quick actions (demo content).
- Compare Workspace (core generation view): app/workspace/page.tsx
  - Shows vacancy, scores, "No Lies" status, generated resume + cover letter.
  - Calls /api/ai/generate and persists outputs for authenticated users.
- Career Profile Vault: app/profile/page.tsx
  - Evidence-driven profile editing (bullets + evidence notes) backed by /api/profile.

## API Routes (Server)
- AI generation: app/api/ai/generate/route.ts
  - Rate-limited, uses OpenAI when OPENAI_API_KEY exists.
  - Returns JSON pack: scores, resume, cover letter, suggestions.
  - Persists resume + cover letter + history for authenticated users.
- Vacancy parsing: app/api/vacancy/route.ts
  - Parses pasted text or URL, supports HH public API.
- History CRUD: app/api/history/route.ts
  - Reads and writes HistoryItem for a user with rate limits.
- Export: app/api/export/route.ts
  - Generates PDF/DOCX/TXT using lib/exporters.ts.
- Auth (NextAuth): app/api/auth/[...nextauth]/route.ts
  - Google, LinkedIn, Yandex, plus email/password via credentials.
- Register + Password Reset:
  - Register: app/api/auth/register/route.ts
  - Reset request: app/api/auth/reset-password/route.ts
  - Confirm reset: app/api/auth/confirm-reset/route.ts

## Database (Prisma + PostgreSQL)
Schema is defined in prisma/schema.prisma. Key models:
- User: core account info + relationships.
- CareerProfile + child entities: ExperienceItem, EducationItem, Project, Certification (the evidence-based profile vault).
- JobPosting + Company: vacancy data and analyses.
- ResumeVersion and CoverLetterVersion: generated outputs with scores/metadata.
- Application: tracking pipeline (status, reminders).
- HistoryItem: timeline of actions for the user.
- GenerationJob: queue for background generation (worker uses this).

## AI & "No Lies Mode"
- The generation prompt enforces strict JSON and evidence-first behavior; it also asks for a truth risk level, missing evidence, and suggestions (see app/api/ai/generate/route.ts).
- UI exposes these constraints in the Compare Workspace (scores, truth risk, evidence details) in app/workspace/page.tsx.

## Rate Limiting
- In-memory rate limiting is handled by lib/rate-limit.ts, applied across API routes.

## Export Pipeline
- PDF/DOCX/TXT exports via lib/exporters.ts, accessed from app/api/export/route.ts.

## Where Demo vs Production Splits
- UI uses authenticated API routes for profile/job/history persistence.
- The server side uses Prisma for authenticated flow; production would wire the UI to these DB calls (not yet fully hooked up in all pages).
