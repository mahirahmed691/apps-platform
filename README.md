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

## Building app #1

```bash
export SUPABASE_ORG_ID=<your-org-id>
export STRIPE_SECRET_KEY=<your-stripe-secret-key>
./scripts/new-app.sh job-tailor
```

Follow the manual steps it prints at the end (deliberately manual --
schema application and env verification aren't things to blindly
automate). Then:

1. Write your feature's prompt in `apps/job-tailor/app/api/ai/generate/route.ts`
2. `cd apps/job-tailor && npm install && npm run dev` to test locally
3. Push to a branch -> PR -> CI runs -> preview deploy is your stage
4. Merge to main -> auto-deploys to canary
5. Watch `usage_events` and error rate for your canary cohort
6. Manually trigger `deploy-production` in GitHub Actions once canary
   numbers hold up -- this is a deliberate gate, not automatic

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
