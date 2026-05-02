# Malamh — Facial Consent Registry

## Overview

Full-stack facial consent registry web app. Individuals register their face and set consent levels for AI image generation. AI companies call the Malamh API before generating someone's likeness.

**pnpm workspace monorepo** with TypeScript throughout.

## Stack

- **Frontend**: React + Vite (`artifacts/malamh`) — dark-only theme, Tailwind CSS v4, shadcn/ui components, Wouter routing, TanStack Query
- **Backend**: Express 5 API server (`artifacts/api-server`) — Clerk auth (`@clerk/express` middleware), Drizzle ORM, Zod validation
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API Contract**: OpenAPI spec → Orval codegen → React Query hooks (`lib/api-client-react`) + Zod schemas (`lib/api-zod`)
- **Auth**: Clerk Auth (free on Replit, no MAU cap) — Google OAuth + email/password + verification + password reset built-in. Local `users` row is lazily provisioned on first authenticated request via `resolveOrCreateUser` in `lib/auth.ts`, keyed by `users.clerk_id`. Pre-existing rows are linked by email **only when** Clerk's primary email is verified (anti-takeover guard). `users.is_admin` controls `requireAdmin` middleware.
- **Face matching**: AWS Rekognition (collection: `malameh-faces`) with mock/demo fallback
- **Payments**: Stripe via Replit Connectors (`artifacts/api-server/src/lib/stripe-client.ts`)
- **Web scanning**: SerpAPI Google Lens + Lexica.art + AWS Rekognition verification

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
- `faces` — embedding (512-d JSON), consent level (OPEN/BLOCKED/TOKEN_REQUIRED), label, referenceImage (256×256 JPEG base64 thumbnail)
- `api_keys` — name, hashed key, active flag, usage count
- `consent_tokens` — one-time approval tokens for TOKEN_REQUIRED faces
- `access_logs` — every consent check (face ID, requester, result, IP)
- `subscriptions` — FREE / PRO / API_BUILDER plan per user, stripeCustomerId, stripeSubId
- `scan_results` — web monitoring results (source badge, faceId FK, confidence)
- `webhooks` — webhook endpoints per user

## API Routes

| Route | Auth | Description |
|---|---|---|
| GET /api/auth/me | session | Current user (Clerk session via cookie). Lazily creates local row + FREE subscription on first call. |
| GET /api/internal/faces | session | List registered faces |
| POST /api/internal/faces | session | Register face (plan limit enforced) |
| POST /api/internal/embed | session | Generate embedding from base64 image |
| PATCH /api/internal/faces/:id | session | Update consent level |
| DELETE /api/internal/faces/:id | session | Delete face |
| GET /api/internal/faces/:id/image | session | Reference thumbnail |
| POST /api/liveness/frame | session | Liveness detection (DetectFaces + random challenge) |
| GET /api/keys | session | List API keys |
| POST /api/keys | session | Create API key |
| DELETE /api/keys/:id | session | Delete API key |
| GET /api/consent/tokens | session | List consent tokens |
| POST /api/consent/decision | — | Approve/reject token |
| GET /api/stats/dashboard | session | Dashboard stats |
| GET /api/activity | session | Activity log |
| POST /api/monitor/scan | session | Trigger web scan (SerpAPI + Lexica + AWS) |
| GET /api/monitor/results | session | Scan results |
| GET /api/billing/subscription | session | Current subscription |
| POST /api/billing/checkout | session | Create Stripe Checkout session |
| POST /api/billing/portal | session | Open Stripe Customer Portal |
| POST /api/billing/webhook | — | Stripe webhook handler |
| GET /api/webhooks | session | List webhooks |
| POST /api/webhooks | session | Create webhook |
| PATCH /api/webhooks/:id | session | Update webhook |
| DELETE /api/webhooks/:id | session | Delete webhook |
| POST /api/webhooks/:id/test | session | Send test event |
| POST /api/webhooks/:id/rotate-secret | session | Rotate HMAC secret |
| GET /api/u/:username | — | Public profile |
| POST /api/v1/check-face | API key | AI consent check (monthly quota enforced) |
| POST /api/internal/match | — | AI consent check by image |

## Frontend Pages

- `/` — Landing page
- `/sign-in/*?`, `/sign-up/*?` — Clerk-hosted auth pages (branded dark theme, Malamh shield logo). `/login` and `/register` are kept as redirects to the new routes for back-compat.
- `/playground` — Live API demo (no auth needed)
- `/docs` — API reference
- `/pricing` — Pricing plans with Stripe checkout buttons
- `/ai-studio` — Interactive consent-aware image generation demo
- `/u/:username` — Public profile
- `/consent/approve/:token` — Approve/reject consent token
- `/dashboard/overview` — Dashboard home
- `/dashboard/register-face` — Multi-step: liveness challenge → 3-photo capture → encoding → consent
- `/dashboard/face/:id` — Manage face, consent tokens
- `/dashboard/api-keys` — Manage API keys
- `/dashboard/api-test` — Live API tester
- `/dashboard/monitor` — Web scan results with source badges
- `/dashboard/activity` — Access log
- `/dashboard/settings` — Profile + plan info + Stripe portal button
- `/dashboard/webhooks` — Full webhook management

## Environment Variables / Secrets

- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth (auto-provisioned)
- `SESSION_SECRET` — legacy (kept for old API key signing paths only)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided)
- `AWS_ACCESS_KEY_ID` — AWS credentials for Rekognition
- `AWS_SECRET_ACCESS_KEY` — AWS credentials for Rekognition
- `AWS_REGION` — AWS region (e.g. us-east-1)
- `AWS_REKOGNITION_COLLECTION` — Rekognition collection ID (malameh-faces)
- `SERPAPI_KEY` — (optional) Real web scanning via Google Lens; falls back to demo without it
- `STRIPE_PRICE_PRO` — (optional) Stripe Price ID for Pro plan
- `STRIPE_PRICE_API_BUILDER` — (optional) Stripe Price ID for API Builder plan
- `STRIPE_WEBHOOK_SECRET` — (optional) Verify Stripe webhook signatures

## Billing / Plans

Plan limits enforced server-side:
- FREE: 3 faces, 100 checks/month
- PRO: 10 faces, 10,000 checks/month ($12/mo)
- API_BUILDER: unlimited ($49/mo)

Stripe connected via Replit Connectors (no hardcoded keys). `stripe-client.ts` fetches credentials dynamically from `REPLIT_CONNECTORS_HOSTNAME` on every request.

## Webhooks

Real-time HTTP POST notifications via HMAC-SHA256 signed payloads.

**Events**: `face.blocked`, `face.allowed`, `consent.token_issued`, `consent.approved`, `consent.denied`

## Liveness Detection

`POST /api/liveness/frame` accepts a base64 frame + challenge type (BLINK / TURN_LEFT / TURN_RIGHT / SMILE). Uses AWS Rekognition `DetectFaces` with ALL attributes. Returns `{ passed, feedback, faceDetected, attributes }`.
