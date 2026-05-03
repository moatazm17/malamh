# Malamh — ملامح

**A consent layer for your face.**

Anyone with a single photo of you can have an AI generate a fake video in under a minute. Right now, there's no system to stop it. Malamh changes that.

You register your face → set your rules → every compliant AI tool must check Malamh before generating your likeness. Said no? No image gets made.

> Built in 24 hours for the [Replit 10-Year Buildathon](https://replit.com) — 48 commits, one shipped product.

---

## What it does

- **Face owners** register their face and set consent: `BLOCKED`, `OPEN`, or per-request token
- **AI companies** call `POST /api/v1/check-face` before generating face-bearing images — they get back `allow` / `block` / `token-required`
- **Live demo** on the landing page walks through the full block-flow with three personas
- **Public consent profile** at `/u/<handle>` so anyone can verify your stance
- **Webhooks** notify owners when their face is queried
- **Activity log** records every check, with rate limits and audit trails

## Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4
- **Backend:** Express 5 + Drizzle ORM + Postgres + Pino
- **Auth:** Clerk
- **Face matching:** AWS Rekognition (collection-based search)
- **Billing:** Stripe (demo mode for hackathon — real keys not available in submitter's country)
- **Contract:** OpenAPI spec → generated React Query hooks + Zod schemas
- **Monorepo:** pnpm workspaces

## Architecture

```
artifacts/
├── api-server/      # Express 5 API (Rekognition, Clerk, Stripe, Drizzle)
├── malamh/          # Vite/React frontend
└── mockup-sandbox/  # Component preview surface
lib/
├── api-spec/        # OpenAPI source of truth + codegen
└── db/              # Drizzle schema + migrations
```

## Built with Replit Agent

This project was built end-to-end with [Replit Agent](https://replit.com/agent). 48 commits in under 24 hours, from empty repo to deployed product:

- Schema design, migrations, and the entire OpenAPI contract
- All API routes (`/auth`, `/faces`, `/consent`, `/check-face`, `/billing`, `/webhooks`)
- AWS Rekognition integration (collection setup, indexing, search)
- The 3-act live demo flow on the landing page
- Stripe checkout + portal flow with graceful demo-mode fallback
- Clerk auth with proxied dev domains
- All 14+ pages: landing, pricing, docs, playground, dashboard, settings, etc.

## Try it

- **Live:** [malamh.replit.app](https://malamh.replit.app/)
- **API check (curl):**
  ```bash
  curl -X POST https://malamh.replit.app/api/v1/check-face \
    -H "Authorization: Bearer <api-key>" \
    -F "image=@photo.jpg"
  ```

## License

MIT
