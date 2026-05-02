# Malamh — Facial Consent Registry

## Overview

Full-stack facial consent registry web app. Individuals register their face and set consent levels for AI image generation. AI companies call the Malamh API before generating someone's likeness.

**pnpm workspace monorepo** with TypeScript throughout.

## Stack

- **Frontend**: React + Vite (`artifacts/malamh`) — dark-only theme, Tailwind CSS v4, shadcn/ui components, Wouter routing, TanStack Query
- **Backend**: Express 5 API server (`artifacts/api-server`) — JWT auth (httpOnly cookie), Drizzle ORM, Zod validation
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API Contract**: OpenAPI spec → Orval codegen → React Query hooks (`lib/api-client-react`) + Zod schemas (`lib/api-zod`)
- **Auth**: JWT in `malamh_session` cookie, `SESSION_SECRET` env var
- **Face matching**: Mock/demo mode — `mockEmbedding()` deterministic from image bytes, cosine similarity

## Architecture

```
artifacts/
  api-server/      Express 5 API (port 8080, prefix /api)
  malamh/          React + Vite frontend (port dynamic, prefix /)
lib/
  db/              Drizzle schema + PostgreSQL client
  api-spec/        OpenAPI YAML + Orval codegen config
  api-client-react/ Generated React Query hooks
  api-zod/         Generated Zod schemas
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run build` — build API server

## Database Tables

- `users` — email, hashed password, username, notification prefs
- `faces` — embedding (512-d JSON), consent level (OPEN/BLOCKED/TOKEN_REQUIRED), label
- `api_keys` — name, hashed key, active flag, usage count
- `consent_tokens` — one-time approval tokens for TOKEN_REQUIRED faces
- `access_logs` — every consent check (face ID, requester, result, IP)
- `subscriptions` — FREE/MONITOR/MONITOR_PRO plan per user
- `scan_results` — web monitoring results

## API Routes

| Route | Auth | Description |
|---|---|---|
| POST /api/auth/register | — | Create account |
| POST /api/auth/login | — | Login, sets cookie |
| POST /api/auth/logout | — | Clear cookie |
| GET /api/auth/me | session | Current user |
| GET /api/internal/faces | session | List registered faces |
| POST /api/internal/faces | session | Register face (embedding) |
| POST /api/internal/embed | session | Generate embedding from base64 image |
| PATCH /api/internal/faces/:id | session | Update consent level |
| DELETE /api/internal/faces/:id | session | Delete face |
| GET /api/keys | session | List API keys |
| POST /api/keys | session | Create API key |
| DELETE /api/keys/:id | session | Delete API key |
| GET /api/consent/tokens | session | List consent tokens |
| POST /api/consent/decision | — | Approve/reject token |
| GET /api/stats/dashboard | session | Dashboard stats |
| GET /api/activity | session | Activity log |
| POST /api/monitor/scan | session | Trigger web scan |
| GET /api/monitor/results | session | Scan results |
| GET /api/u/:username | — | Public profile |
| POST /api/v1/check-face | API key | AI consent check by face ID |
| POST /api/internal/match | — | AI consent check by image |

## Frontend Pages

- `/` — Landing page
- `/login`, `/register` — Auth pages
- `/playground` — Live API demo (no auth needed)
- `/docs` — API reference
- `/pricing` — Pricing plans
- `/ai-studio` — For AI builder developers
- `/u/:username` — Public profile
- `/consent/approve/:token` — Approve/reject consent token
- `/dashboard/overview` — Dashboard home
- `/dashboard/register-face` — Upload photo + set consent
- `/dashboard/face/:id` — Manage face, consent tokens
- `/dashboard/api-keys` — Manage API keys
- `/dashboard/api-test` — Live API tester
- `/dashboard/monitor` — Web scan results
- `/dashboard/activity` — Access log
- `/dashboard/settings` — Profile + notifications

## Environment Variables

- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)

## Webhooks

Real-time HTTP POST notifications via HMAC-SHA256 signed payloads.

**DB table**: `webhooks` — id, userId, url, secret, events[], active, description, lastDeliveredAt

**Events**:
- `face.blocked` — consent check blocked
- `face.allowed` — consent check allowed
- `consent.token_issued` — TOKEN_REQUIRED face, token created
- `consent.approved` — user approved a token
- `consent.denied` — user denied a token

**Routes**: GET/POST `/api/webhooks`, PATCH/DELETE `/api/webhooks/:id`, POST `/api/webhooks/:id/test`, POST `/api/webhooks/:id/rotate-secret`

**Delivery**: `X-Malamh-Signature: sha256=<hmac>` header, 10s timeout, logs failures without blocking request

**Frontend page**: `/dashboard/webhooks` — create, edit, toggle active, send test, rotate secret, delete

## Future Work

- Stripe billing integration
- Email notifications (notify on scan, consent, API check)
- Webhook delivery log / retry history
