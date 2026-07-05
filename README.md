# Apps Platform

A pipeline for building multiple "AI wrapper + Stripe" apps without
re-solving the same infra problems each time.

## The core idea

**Shared code, separate infrastructure.** Every app gets its own Supabase
project, its own Stripe products, its own Vercel deployment — so a bug or
data issue in one app can't touch another. But the *logic* (auth, rate
limiting, kill switch, webhook idempotency, cost tracking) lives in one
package, `packages/app-core`, that every app imports. Fix it once, every
app that hasn't pinned an old version gets the fix.

This is different from the earlier starter-kit approach (copy the whole
folder per app) — that works for one or two apps, but by app #3 you're
maintaining N copies of the same bugfix. This is the pipeline version.

```
apps-platform/
├── packages/
│   └── app-core/          <- shared logic, imported not copied
│       ├── src/            (supabase, stripe, rateLimit, observability)
│       └── supabase/schema.sql
├── templates/
│   └── web-app/            <- what new-app.sh copies + parameterizes
├── apps/                   <- your actual apps land here
├── scripts/
│   ├── new-app.sh           automates provisioning (Supabase, Stripe)
│   └── provision-stripe.js
├── .github/workflows/
│   ├── ci.yml               stage gate -- every push, every app
│   └── deploy.yml           canary auto, prod requires manual approval
└── PIPELINE-RUNBOOK.md      platform-level incidents
```

## Secrets: one file, filled once

Account-level credentials live in a single gitignored **root `.env`** — the
source of truth for the whole monorepo. Copy the example and fill it in once **from the repo root** (not inside `apps/ceevie`):

```bash
cd /path/to/apps-platform    # repo root, NOT apps/ceevie
cp .env.example .env
# then edit .env: STRIPE_SECRET_KEY, ANTHROPIC_API_KEY,
#                 SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_ID
```

Or from anywhere:

```bash
npm run setup                # creates root .env if missing
npm run setup -- ceevie <supabase-project-ref>   # + derive .env.local
# from apps/ceevie: npm run setup
```

Everything an individual app needs (its Supabase URL + anon/service-role
keys, Stripe price ID, webhook secret) is **derived automatically** from
that root `.env` plus the Supabase/Stripe CLIs. You never hand-edit an
app's `.env.local` — it's generated.

## Building app #1

```bash
./scripts/new-app.sh job-tailor
```

This runs the whole chain end-to-end: copies the template, creates the
Supabase project, waits for the DB, applies `schema.sql`, provisions the
Stripe product/price, and writes `apps/job-tailor/.env.local` fully
populated. Then:

1. Write your feature's prompt in `apps/job-tailor/app/api/ai/generate/route.ts`
2. `cd apps/job-tailor && npm run dev` to test locally
3. Push to a branch -> PR -> CI runs -> preview deploy is your stage
4. Merge to main -> auto-deploys to canary
5. Watch `usage_events` and error rate for your canary cohort
6. Manually trigger `deploy-production` in GitHub Actions once canary
   numbers hold up -- this is a deliberate gate, not automatic

### Re-derive env for an existing app

```bash
node scripts/fill-env.js job-tailor <supabase-project-ref>
```

### Production Stripe webhook (a live account write, opt-in)

`new-app.sh` only wires the **local** webhook secret by default. To also
create the deployed webhook endpoint and capture its prod signing secret:

```bash
node scripts/provision-stripe.js job-tailor 1900 --webhook-url=https://job-tailor.vercel.app
node scripts/fill-env.js job-tailor <supabase-project-ref>
```

### Sync env vars to Vercel (zero-fill deploys)

Once the app is linked to a Vercel project, push every derived env var to
production + preview in one shot — no dashboard clicking:

```bash
# First deploy / link
cd apps/job-tailor && vercel link

# Sync all vars from root .env + CLIs
node scripts/sync-vercel-env.js job-tailor <supabase-project-ref> --link

# Or provision prod webhook + sync in one go
node scripts/sync-vercel-env.js job-tailor <supabase-project-ref> --link \
  --webhook-url=https://job-tailor.vercel.app
```

Set `SYNC_VERCEL=1` when running `new-app.sh` to sync automatically at
provision time. Optional `VERCEL_TOKEN` in root `.env` enables non-interactive
CLI auth.

## Building app #2, #3...

Same `new-app.sh` call, different name. If app #2 finds a bug in
`app-core`, fix it there -- app #1 doesn't need to be touched, but does
need CI to pass and a redeploy to actually pick up the fix.

## What's still manual, on purpose

- **Stage 0 validation** (talk to 10 people before running `new-app.sh`
  at all) -- no script for this, it's judgment
- **Prod promotion** -- gated behind a manual GitHub Actions trigger +
  required reviewer, never automatic off a merge
- **Pricing, prompt design, feature scope** -- business decisions, not
  pipeline concerns
