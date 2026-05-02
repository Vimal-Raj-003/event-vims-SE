# VIMS Event — Verification Workstream Design

**Date:** 2026-05-02
**Workstream:** 1 of 3 (Verification → Hero → Landing polish)
**Status:** Design approved, ready for implementation plan

## Context

The VIMS Event platform has three user roles (super-admin, organiser, attendee), a NestJS API backed by NeonDB Postgres, and a Next.js web app. Recent commits added Zoho SMTP for OTP delivery, multi-role authentication routing fixes, and Docker deployment configuration. Several attendee-flow bugs were reported and partially fixed earlier today. Before investing in UI/UX redesign work (workstreams 2 & 3 — hero and landing polish), we need an evidence-based answer to "what actually works end-to-end?"

This workstream produces that evidence and applies surgical fixes for cheap wins without losing focus on the verification goal.

## Goals

- Produce evidence (✅/❌ + request/response/DB row) for **28 flows** across 3 roles.
- Fix any **functional** bug discovered that is ≤10 lines of change. Defer the rest with a written report and proposed fix.
- Apply **light UI/UX polish** on every page visited during verification — surgical changes only (≤20 lines per page) for issues like spacing, alignment, broken states, hardcoded values, low-contrast text, missing loading/empty states. Anything bigger becomes a note for workstreams 2 & 3.
- Output a single source-of-truth report at `docs/superpowers/specs/2026-05-02-verification-report.md`.

## Non-Goals

- No production environment testing — local dev only.
- No full page redesigns — anything >20 lines goes to workstreams 2/3.
- No Playwright spec files committed to repo (deferred — that's its own project).
- No mobile / responsive / a11y audit (notes welcome but no fixes).
- No load / perf testing.
- No backend refactors — fixes stay surgical.

## Approach

Three-phase strategy ("Approach 3 — Smoke gate, then deep sweep"):

| Phase | What | Time |
|---|---|---|
| Pre-flight | Confirm services running, DB connectable, browser ready | ≤5 min |
| Phase 0 — Smoke gate | All 3 roles can log in and land on first page | ~10 min |
| Phase 1 — Deep sweep | 28 flows in role order with the per-flow loop | ~75 min |

**Gate logic:** If Phase 0 fails for any role, that role's auth becomes the only thing we work on until it passes. Phase 1 does not start with broken auth.

## Pre-flight Checklist

1. `apps/api` running on `localhost:3001`.
2. `apps/web` running on `localhost:3000`.
3. Local NeonDB reachable via Prisma MCP. Spot-check counts: `SuperAdmin >= 1`, `Organiser >= 1`, `Event >= 1`, `Attendee >= 1`.
4. OTP path works in dev: response returns `otpToken`/`otp`, or fall back to reading the latest `OtpVerification` row by `email`.
5. Playwright MCP browser opened to `http://localhost:3000`.

## Phase 0 — Smoke Gate

| Role | Action | Pass criteria |
|---|---|---|
| Super-admin | Login `admin@vims-enterprise.com` / `Admin@2026` | Lands on `/admin/overview`, stats render, no `console.error`, audit log row written |
| Organiser | Login `testorganiser@example.com` / `Organiser@2026` | Lands on `/dashboard`, organisation name visible, no `console.error` |
| Attendee | Request OTP for `rahul.krishnan@gmail.com` + event `cmoj5g67h0003n628x95wm4a9`, verify | Lands on `/home`, no console errors, `OtpVerification.usedAt` set |

## Phase 1 — The 28-Flow Sweep

Linear, top-down. Read-heavy flows precede write flows within each role.

### Super-admin (8 flows) — `/admin/*`
1. Overview dashboard — counts, recent events list
2. Organisers list — paginate, search
3. Events list — cross-org pagination + filter
4. Single event detail
5. Audit log — paginate + filter by actor/action
6. Support tickets — list, open one, reply
7. Deletion requests — process one (PENDING → DONE)
8. Admin settings — read + save one field

### Organiser (11 flows) — `/dashboard`, `/events/*`, `/account`
1. Dashboard — stats render
2. Events list — own events
3. Single event detail — header, stats, branding
4. Edit event branding/rules — save → DB updated
5. Attendees list — filter/search
6. Manually invite attendee — DB row created
7. Send announcement — `Announcement` row, `recipientCount > 0`
8. Export attendees — file downloads
9. Account / settings — `OrganiserSettings` upsert
10. Notifications — list + mark-read
11. Create new event — full wizard → new `Event` row, slug+shortHash generated

### Attendee (9 flows) — `/home`, `/wizard`, `/card`, `/directory`, `/connections`, `/suggestions`, `/settings`
1. Home/landing after login — profile snippet, recent activity
2. First-time wizard (4 steps) — `profileCompleted=true` after final
3. Business card view + share drawer
4. Directory search & filters — query, filter by industry/city
5. View attendee profile detail — `ProfileView` row written
6. Send connection request — `ConnectionRequest` row PENDING
7. Accept request — status ACCEPTED, `respondedAt` set
8. Suggestions / smart matching — `MatchScore` rows or computed-on-fly results
9. Settings — pause/unpause profile, deletion request creates `DataDeletionRequest`

## Per-Flow Execution Protocol

Every flow runs the same 6-step loop:

```
1. NAVIGATE     Playwright MCP → target URL
2. ACT          Drive the UI: clicks, types, submits
3. CAPTURE      Network requests + responses + console errors
4. DB CHECK     Prisma MCP query for affected row(s): expected
                fields present + correct shape
5. POLISH SCAN  Note UI/UX issues. ≤20 lines → fix inline.
                >20 lines → log as deferred to WS 2/3.
6. LOG          Append flow result to report
```

### Bug-handling protocol (F-stop)

| Bug type | Fix size | Action |
|---|---|---|
| Functional | ≤10 lines | Fix it, re-run flow, log both attempts |
| Functional | >10 lines | STOP. Post bug + proposed fix to user. Wait for go/no-go. |
| UI | ≤20 lines | Fix inline |
| UI | >20 lines | Log as deferred to workstreams 2/3 |

### State management between flows

- Do **not** clear the DB between flows. State accumulates intentionally — that's how ordering bugs surface.
- **Do** clear browser storage / cookies when switching roles.
- One Playwright browser session per role.

### Evidence captured per flow

- Final URL after action
- API requests (method, path, status code, ms)
- DB query result (field-level, redacted of PII where needed)
- Console errors if any
- Screenshot **only on failure** — stored at `.superpowers/brainstorm/screenshots/<flow-id>.png`

## Severity Rubric

- **Critical** — login broken, data loss, app unusable for that role
- **High** — major flow broken, no workaround
- **Medium** — flow works but produces wrong data / wrong UI state
- **Low** — cosmetic, dev-only, or has obvious workaround

## Report Structure

Single markdown file: `docs/superpowers/specs/2026-05-02-verification-report.md`

```markdown
# VIMS Event — Verification Report (2026-05-02)

## Executive summary
- Flows passed: X / 28
- Functional bugs fixed: X (all ≤10 lines)
- Functional bugs deferred: X
- UI polish applied: X pages
- UI redesign deferred to workstreams 2/3: X items

## Phase 0 — Smoke gate
| Role | Login | First page | Console clean | DB write | Status |

## Phase 1 — Detailed sweep
### Super-admin
#### S1. Overview dashboard
- URL, Status, Network, DB check, Polish applied, Console

(... 28 flow blocks total ...)

## Bugs deferred (require >10-line fix or user decision)
### B1. <title>
- Severity, Location, Repro, Proposed fix, Status

## UI redesign opportunities (workstreams 2 & 3)
- (Hero) ...
- (Landing) ...
- (Authenticated pages) ...

## Polish applied (in this session)
- file:line — what changed — why

## Definition of done checklist
```

## Definition of Done

- [ ] Phase 0 smoke gate passed for all 3 roles (or any failure was fixed and re-passed)
- [ ] All 28 Phase 1 flows attempted (none silently skipped)
- [ ] Every functional bug found is either fixed (≤10 lines, flow re-runs green) **OR** logged as deferred with severity + proposed fix + user go/no-go decision recorded
- [ ] Every page visited has a "polish-applied" entry in the report (even if "no polish needed")
- [ ] Report committed to git
- [ ] All polish + ≤10-line fixes committed in their own focused commits (separate from the report commit)
- [ ] Final summary lists: pass count, fix count, deferred count, hand-off notes for workstream 2 (hero)

## Tooling

- **Playwright MCP** — drive the browser
- **Prisma MCP (`Prisma-Local`)** — DB row inspection + Prisma Studio for spot checks
- **Bash** — start `apps/api` and `apps/web` dev servers if not already running
- **Edit/Write** — apply ≤10-line functional fixes and ≤20-line polish

## Hand-off to Workstream 2 (Hero)

This workstream's report concludes with a "UI redesign opportunities" section. That list seeds workstream 2's brainstorm — specifically anything tagged `(Hero)` or `(Landing)`.
