# Platform Pipeline Runbook

This covers the pipeline itself — provisioning, the shared package, and
cross-app failure modes. Each individual app still gets its own
`runbook.md` (copied from the template) for app-specific incidents.

---

## Incident: a bug in `packages/app-core` shipped to multiple apps

**This is the actual blast-radius risk of sharing code.** A bug in
`app-core` doesn't stay contained to one app — every app importing it
inherits it.

**Immediate action:**
1. Check CI — a change to `app-core` triggers rebuild/retest for every
   dependent app (`turbo.json`'s `dependsOn: ["^build"]`), so this should
   have been caught before merge. If it wasn't, that's a gap in test
   coverage to fix right after the incident, not during it.
2. Identify which apps actually deployed the bad version (check each
   app's deploy history — canary/prod, not just "all of them, panic").
3. Fix in `app-core`, bump version, let CI re-run for every dependent app.
4. Each affected app needs its OWN redeploy — fixing the package doesn't
   retroactively fix already-deployed instances.

**Why this is still worth the shared-package risk:** the alternative
(copy-paste) means this same bug exists in N places and you fix it N
times, forgetting one eventually. One fix point beats reduced blast radius
here, PROVIDED CI actually gates on it — which is why the CI dependency
graph matters, not just "we have tests somewhere."

---

## Incident: `new-app.sh` provisioning fails partway through

**Symptoms:** Supabase project created but Stripe step failed, or vice versa.

**Immediate action:**
1. The script is NOT transactional — it doesn't roll back earlier steps
   if a later one fails. Check what actually got created:
   - `supabase projects list` — was the project created?
   - Stripe dashboard — was the product/price created?
2. Clean up partial state manually before retrying (delete the orphaned
   Supabase project or Stripe product) rather than running the script
   again and ending up with duplicates.
3. This is a known gap — if you hit this more than twice, that's the
   signal to make the script idempotent (check-before-create on each
   step) rather than patching around it each time.

---

## Incident: prod promotion happened without canary validation

**Should be prevented by the deploy.yml gate**, but if it happens anyway:
1. Check the app's own `usage_events` and error logs immediately —
   you've skipped the step that would have caught problems before
   full exposure.
2. Flip the kill switch (`app_config.ai_generation_enabled = false`)
   if error rate looks abnormal, while you assess.
3. Retroactively treat the current prod traffic as your canary — watch
   closely for the same window you'd normally canary for, since you
   didn't get that signal beforehand.

---

## Decommissioning an app

When an idea doesn't validate and you're killing it:
1. Export any user data you're obligated to retain/return (UK GDPR).
2. Cancel active Stripe subscriptions gracefully — don't just delete the
   product, notify affected users first.
3. Archive the Supabase project rather than deleting immediately —
   gives you a recovery window if you decide to revive the idea.
4. Remove the app's Vercel project + DNS entries.
5. Leave the app's folder in git history (don't force-delete) — it's
   documentation of what you tried, useful for the next idea's Stage 0.
