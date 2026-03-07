# SCRATCH.md — Ephemeral Working Notes

**Last updated:** 2026-03-06
**Current phase:** Phase 0 — Code complete, not yet deployed

---

## Phase 0 Known Issues (address before Phase 3)

### P0 — Must fix
- [ ] **"test-mode" error noise** — 4 `Processing failed: Error: test-mode — no real API calls` appear in `npm run test` output. Tests pass (151/158) but output is noisy. Investigate which mock is throwing and fix the isolation. Likely in Stripe or Anthropic mocks in Phase 0 specs.

### P1 — Before Phase 3 specs
- [ ] **Phase 0 integration pass** — manually verify the auth + subscription flow works end-to-end:
  1. Create a test Clerk app → add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to `.env.local`
  2. Start the app (`npm run dev`) → confirm `/` redirects to `/sign-in` for unauthenticated users
  3. Sign in → upload a piece of content → confirm User record in DB has real Clerk ID (not "default-user")
  4. Create a Stripe test product + price → set `STRIPE_PRICE_ID` → confirm `/api/upload` returns 403 for free users
  5. Complete a Stripe test checkout → confirm `user.subscriptionStatus` → "active"
  Only write Phase 3 specs after this passes.

- [ ] **Run the Azure deployment** — follow `docs/deployment.md` one-time setup:
  1. `az login` with Microsoft account
  2. Create resource group, ACR, PostgreSQL, Storage Account, Container App in East US 2
  3. Add `AZURE_CREDENTIALS` secret to GitHub → trigger first automated deployment
  4. Run `npx prisma migrate deploy` in the container
  5. Set all env vars via `az containerapp secret set`

---

## Dev Machine Workflow Learnings (apply to all future phases)

### Spec quality rules (confirmed through today's session)
1. **Read the current code before writing the spec** — quote it in the "Current State" section
2. **Show the full `vi.mock()` pattern** — not just "add a test." Machine matches mock patterns exactly.
3. **≤5 files per spec** — split larger changes into multiple specs
4. **Infrastructure specs need "Manual Setup Steps"** — the machine writes code, humans provision services
5. **"Scope" section is mandatory** — explicitly say what the spec does NOT change
6. **Add scope guard to specs**: "Do not modify files not listed in Files to Modify"

### Workflow rules (confirmed through today's session)
1. **Visual pass after every UI-touching batch** — use `browser-tester:visual-documenter` to catch what tests miss
2. **Set up machine format from day one** — features dict, build.yaml, iteration.yaml, working-session-instructions.md
3. **Infrastructure ≠ feature for verification** — "tests pass" is sufficient for features; infrastructure needs end-to-end human verification
4. **Phase transitions need an integration check** — before Phase 3 specs, verify Phase 0 works in real environment

---

## Phase 3 — Waiting on Phase 0 integration pass

Do not write Phase 3 specs until Phase 0 integration pass is complete (see above).

Planned Phase 3 items (from ROADMAP.md):
- Multi-Source Synthesis (#12)
- Episode Sharing (#10)
- Scheduled Production (#13)
- Voice Selection (#11)
- RSS/Podcast Feed Output (new)
- Pocket Refugee Capture (new, time-sensitive)
- "Ready to Commute" notification (new, depends on #13)
- Word-level transcript seek (new)
- CarPlay integration (new)

---

## Notes for Next Session

- All Phase 0 code is committed to `main`
- `docs/deployment.md` has the Azure setup runbook
- Phase 0 integration pass should take ~30 minutes with real service credentials
- After integration pass: update STATE.yaml to Phase 3 and write first batch of specs
