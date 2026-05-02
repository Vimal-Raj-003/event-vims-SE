# VIMS Event — Verification Workstream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a 28-flow functional E2E verification across all 3 roles, applying surgical bug fixes (≤10 lines functional, ≤20 lines UI polish) and producing a single source-of-truth report.

**Architecture:** Three phases — Pre-flight → Phase 0 smoke gate → Phase 1 deep sweep. Each flow runs the same 6-step loop (NAVIGATE → ACT → CAPTURE → DB CHECK → POLISH SCAN → LOG). Bugs that exceed thresholds STOP execution and surface to the user for go/no-go.

**Tech Stack:** Playwright MCP (browser drive), Prisma MCP / Prisma-Local (DB inspection), Bash (start dev servers), Edit/Write (surgical fixes + report append).

---

## File Structure

**Created:**
- `docs/superpowers/specs/2026-05-02-verification-report.md` — single source-of-truth report, appended after each flow
- `.superpowers/brainstorm/screenshots/<flow-id>.png` — only on failures

**Modified during execution (unknown until findings):**
- Any web/api source file where a ≤10-line functional fix is applied
- Any web component where ≤20-line polish is applied

**Spec reference:** `docs/superpowers/specs/2026-05-02-verification-design.md` (commit `7b99633`)

---

## Test Credentials & Fixtures

| Role | Email | Password / Event ID |
|---|---|---|
| Super-admin | `admin@vims-enterprise.com` | `Admin@2026` |
| Organiser | `testorganiser@example.com` | `Organiser@2026` |
| Attendee | `rahul.krishnan@gmail.com` | Event ID: `cmoj5g67h0003n628x95wm4a9` |

**Servers:**
- API: `http://localhost:3001`
- Web: `http://localhost:3000`

---

## The 6-Step Per-Flow Loop (universal)

Every Phase 1 flow runs this exact loop. Each step appends to its flow's section in the report.

```
1. NAVIGATE     mcp__plugin_playwright_playwright__browser_navigate to flow URL
2. ACT          browser_fill_form / browser_click / browser_type / browser_press_key
3. CAPTURE      browser_console_messages + browser_network_requests
                Filter for status>=400 and console.error
4. DB CHECK     mcp__plugin_prisma_Prisma-Local OR raw SQL via Prisma client
                Confirm expected row(s) exist with expected fields
5. POLISH SCAN  Inspect rendered page for UI issues:
                - Spacing/alignment, broken states, hardcoded values,
                  low-contrast text, missing loading/empty states
                If fix ≤20 lines → Edit inline → re-screenshot → log
                If fix >20 lines → log as "deferred to WS 2/3"
6. LOG          Append flow result block to verification-report.md:
                ✅/❌, evidence, bugs found, fixes applied, polish applied
```

**Bug-handling decision tree:**
```
Functional bug found?
├── Fix ≤10 lines? → Edit, re-run flow, log both attempts, commit fix separately
└── Fix >10 lines? → STOP. Report bug + proposed fix to user. Wait for go/no-go.

UI bug found?
├── Fix ≤20 lines? → Edit inline, log polish applied
└── Fix >20 lines? → Log as deferred to WS 2/3. No code change.
```

---

## Task 1: Pre-flight Setup

**Files:**
- Create (if missing): `docs/superpowers/specs/2026-05-02-verification-report.md`

- [ ] **Step 1.1: Confirm API server running**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health 2>/dev/null || echo "down"
```

Expected: `200` or `204`. If `down`, start it:

```bash
cd apps/api && npm run start:dev &
```

Wait until `curl http://localhost:3001/health` returns 200.

- [ ] **Step 1.2: Confirm web server running**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000 2>/dev/null || echo "down"
```

Expected: `200`. If `down`:

```bash
cd apps/web && npm run dev &
```

Wait for "Ready" in stdout.

- [ ] **Step 1.3: Confirm DB connectivity via Prisma MCP**

Use `mcp__plugin_prisma_Prisma-Local__migrate-status` to confirm the database is reachable and migrations are up to date. Expected: "Database schema is up to date".

If migrations are out of date, STOP and surface to user — do not run `migrate-dev` automatically.

- [ ] **Step 1.4: Spot-check seed data exists**

Run these queries via Prisma client (use a one-off `node -e` script with `@prisma/client`, or use Prisma Studio via `mcp__plugin_prisma_Prisma-Local__Prisma-Studio`):

```sql
SELECT COUNT(*) FROM super_admins;          -- expect >= 1
SELECT COUNT(*) FROM organisers;            -- expect >= 1
SELECT id, slug FROM events WHERE id='cmoj5g67h0003n628x95wm4a9';  -- expect 1 row
SELECT COUNT(*) FROM attendees WHERE event_id='cmoj5g67h0003n628x95wm4a9';  -- expect >= 1
```

If any expected fixture is missing, STOP and surface to user.

- [ ] **Step 1.5: Initialize the verification report skeleton**

Write `docs/superpowers/specs/2026-05-02-verification-report.md` with this skeleton:

```markdown
# VIMS Event — Verification Report (2026-05-02)

> Generated by verification workstream 1 of 3.
> Spec: docs/superpowers/specs/2026-05-02-verification-design.md

## Executive summary
- Flows passed: 0 / 28
- Functional bugs fixed: 0
- Functional bugs deferred: 0
- UI polish applied: 0 pages
- UI redesign deferred to WS 2/3: 0

## Phase 0 — Smoke gate
_(populated during Task 2)_

## Phase 1 — Detailed sweep

### Super-admin
_(populated during Task 3)_

### Organiser
_(populated during Task 4)_

### Attendee
_(populated during Task 5)_

## Bugs deferred (require >10-line fix or user decision)
_(none yet)_

## UI redesign opportunities (workstreams 2 & 3)
_(none yet)_

## Polish applied (in this session)
_(none yet)_

## Definition of done checklist
- [ ] Phase 0 smoke gate passed for all 3 roles
- [ ] All 28 Phase 1 flows attempted
- [ ] Functional bugs fixed (≤10 lines) or deferred with proposed fix
- [ ] Polish applied (≤20 lines) or deferred for WS 2/3
- [ ] All polish + fix commits separate from report commit
- [ ] Final summary lists pass/fix/deferred counts + WS 2 hand-off
```

- [ ] **Step 1.6: Open Playwright MCP browser**

Call `mcp__plugin_playwright_playwright__browser_navigate` with `url: "http://localhost:3000"`. Expected: page loads, snapshot shows landing page hero.

- [ ] **Step 1.7: Commit pre-flight artifacts**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: initialize report skeleton"
```

---

## Task 2: Phase 0 — Smoke Gate (3 logins)

**Gate logic:** If any sub-step fails, STOP Phase 1 and fix the failing role's auth first.

### Task 2A: Super-admin smoke

- [ ] **Step 2A.1: Navigate to super-admin login**

`browser_navigate` to `http://localhost:3000/auth/super-admin/login`. Expected: form with email + password fields.

- [ ] **Step 2A.2: Submit credentials**

`browser_fill_form` with:
```
email: admin@vims-enterprise.com
password: Admin@2026
```
Then `browser_click` the submit button.

- [ ] **Step 2A.3: Capture network + console**

`browser_network_requests` — find `POST /auth/super-admin/login`. Expected: status 200, response body contains `accessToken` and `refreshToken`.

`browser_console_messages` — expected: zero `error`-level entries.

- [ ] **Step 2A.4: Confirm landing page**

After auto-redirect, `browser_snapshot`. Expected URL: `/admin/overview`. Page shows stats cards.

- [ ] **Step 2A.5: DB check — refresh token persisted**

Query via Prisma client:

```sql
SELECT id, user_id, user_role, expires_at, revoked_at
FROM refresh_tokens
WHERE user_role='SUPER_ADMIN'
ORDER BY created_at DESC LIMIT 1;
```

Expected: row exists, `revoked_at IS NULL`, `expires_at` in future.

- [ ] **Step 2A.6: Log result**

Append to report under `## Phase 0 — Smoke gate`:

```markdown
| super-admin | ✅ login 200 | ✅ /admin/overview | ✅ console clean | ✅ refresh token row | PASS |
```

If failure: log details, STOP, surface to user.

### Task 2B: Organiser smoke

- [ ] **Step 2B.1: Clear browser session**

`browser_evaluate` running `localStorage.clear(); sessionStorage.clear();` then `browser_navigate` to `http://localhost:3000/auth/organiser/login`.

- [ ] **Step 2B.2: Submit credentials**

`browser_fill_form`:
```
email: testorganiser@example.com
password: Organiser@2026
```
`browser_click` submit.

- [ ] **Step 2B.3: Capture network + console**

`browser_network_requests` — find `POST /auth/organiser/login` → 200, body contains tokens + user object with `id`, `email`, `name`, `organisation`.

`browser_console_messages` — zero errors.

- [ ] **Step 2B.4: Confirm landing page**

After redirect, snapshot. Expected URL: `/dashboard`. Organisation name visible.

- [ ] **Step 2B.5: DB check**

```sql
SELECT id, user_role FROM refresh_tokens
WHERE user_role='ORGANISER'
ORDER BY created_at DESC LIMIT 1;
```

Expected: row exists.

- [ ] **Step 2B.6: Log result**

Append row to Phase 0 table.

### Task 2C: Attendee smoke

- [ ] **Step 2C.1: Clear browser session, navigate to attendee login**

Clear storage. `browser_navigate` to `http://localhost:3000/auth/attendee/login`.

- [ ] **Step 2C.2: Request OTP**

`browser_fill_form`:
```
email: rahul.krishnan@gmail.com
eventId: cmoj5g67h0003n628x95wm4a9
```
`browser_click` "Send Login Code".

`browser_network_requests` — find `POST /auth/attendee/request-otp` → 200. Capture response body — note whether `otp` or `otpToken` field is present (dev mode).

- [ ] **Step 2C.3: Acquire OTP**

If response body contained `otp`/`otpToken`, the page auto-redirects to `/auth/attendee/verify?...&devOtp=<otp>`. Read the OTP from the URL via `browser_evaluate`:

```js
new URLSearchParams(window.location.search).get('devOtp')
```

If null, fall back: query DB for the latest OTP:

```sql
SELECT otp_hash, expires_at FROM otp_verifications
WHERE email='rahul.krishnan@gmail.com' AND purpose='ATTENDEE_LOGIN'
ORDER BY created_at DESC LIMIT 1;
```

The hash is bcrypt — if dev mode doesn't return plain OTP, this becomes a finding (deferred bug: "Cannot complete attendee login without email access in dev — OTP must be retrievable for testing"). STOP and surface to user.

- [ ] **Step 2C.4: Submit OTP**

If OTP available, `browser_fill_form` the OTP fields, `browser_click` verify.

- [ ] **Step 2C.5: Capture network + console**

Find `POST /auth/attendee/verify-otp` → 200, tokens returned. Console clean.

- [ ] **Step 2C.6: Confirm landing page**

After redirect, expected URL: `/home`. Snapshot shows attendee profile snippet.

- [ ] **Step 2C.7: DB check**

```sql
SELECT id, used_at FROM otp_verifications
WHERE email='rahul.krishnan@gmail.com' AND purpose='ATTENDEE_LOGIN'
ORDER BY created_at DESC LIMIT 1;
```

Expected: `used_at` is set.

```sql
SELECT id, user_role FROM refresh_tokens
WHERE user_role='ATTENDEE' ORDER BY created_at DESC LIMIT 1;
```

Expected: row exists.

- [ ] **Step 2C.8: Log result**

Append row to Phase 0 table.

- [ ] **Step 2C.9: Phase 0 gate decision**

If all 3 sub-tasks PASSED, proceed to Phase 1. Otherwise, STOP and fix.

- [ ] **Step 2C.10: Commit Phase 0 report update**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: phase 0 smoke gate results"
```

---

## Task 3: Phase 1 — Super-admin Sweep (8 flows)

For each flow below, run the 6-step universal loop. After each flow:
- Append a `#### S<N>. <flow name>` block to the report under `### Super-admin`
- Block format:
  ```markdown
  #### S1. Overview dashboard
  - URL: /admin/overview
  - Status: ✅ PASS
  - Network: GET /admin/overview-stats → 200, 124ms
  - DB check: counts match
  - Console: clean
  - Polish applied: <file:line — change> OR "no polish needed"
  - Bugs: none / <list>
  ```

**Browser session:** keep super-admin logged in throughout this task (don't clear storage).

### Flow S1: Overview dashboard
- [ ] **Step 3.S1**: `browser_navigate` to `/admin/overview`. Capture network for stats endpoints (`GET /admin/stats` or similar). DB check: counts match `SELECT COUNT(*) FROM organisers/events/attendees`. Polish scan. Log.

### Flow S2: Organisers list
- [ ] **Step 3.S2**: `browser_navigate` to `/admin/organisers`. Capture `GET /admin/organisers` (paginated). Try search, capture another request. DB: `SELECT COUNT(*) FROM organisers` matches API total. Polish. Log.

### Flow S3: Events list (cross-org)
- [ ] **Step 3.S3**: `browser_navigate` to `/admin/events`. Capture `GET /admin/events`. Try filter (status=ACTIVE). DB: `SELECT COUNT(*) FROM events WHERE status='ACTIVE'` matches. Polish. Log.

### Flow S4: Single event detail
- [ ] **Step 3.S4**: From events list, click first event row. Capture `GET /admin/events/:id`. DB: row exists. Polish. Log.

### Flow S5: Audit log
- [ ] **Step 3.S5**: `browser_navigate` to `/admin/audit-log`. Capture `GET /admin/audit-log`. Try filter by actor or action. DB: `SELECT COUNT(*) FROM audit_logs` matches. Note: super-admin login earlier should have created an audit row — if not, log as deferred bug. Polish. Log.

### Flow S6: Support tickets
- [ ] **Step 3.S6**: `browser_navigate` to `/admin/support-tickets`. Capture list. Open one ticket. Submit a reply (`adminNote`). DB: `SELECT admin_note, updated_at FROM support_tickets WHERE id=:id` shows new note. Polish. Log.

### Flow S7: Deletion requests
- [ ] **Step 3.S7**: `browser_navigate` to `/admin/deletion-requests`. Find a PENDING row (or skip flow with note "no pending deletion requests in fixture"). Process one (status PENDING → DONE). DB: `SELECT status, processed_at, processed_by FROM data_deletion_requests WHERE id=:id`. Polish. Log.

### Flow S8: Admin settings
- [ ] **Step 3.S8**: `browser_navigate` to `/admin/settings`. Read current value of one toggle/field. Change it, save. Capture `PATCH/PUT` request. DB: confirm value changed. Then revert to original (don't pollute fixture). Polish. Log.

- [ ] **Step 3.S-final: Commit super-admin section**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: super-admin sweep complete"
```

If any polish/fix was applied, those are committed separately as discovered (do not bundle).

---

## Task 4: Phase 1 — Organiser Sweep (11 flows)

Clear browser storage. Log in as organiser (re-run Task 2B steps without DB checks/logging — just to get session).

For each flow, append `#### O<N>. <flow name>` block to the report under `### Organiser`.

### Flow O1: Dashboard
- [ ] **Step 4.O1**: `browser_navigate` to `/dashboard`. Capture stats requests. DB: counts match for this organiser's events/attendees. Polish. Log.

### Flow O2: Events list
- [ ] **Step 4.O2**: `browser_navigate` to `/events`. Capture `GET /organiser/events`. DB: `SELECT COUNT(*) FROM events WHERE organiser_id=:id`. Polish. Log.

### Flow O3: Single event detail
- [ ] **Step 4.O3**: Click the seeded event from list. Capture `GET /organiser/events/:id`. DB: row exists. Polish. Log.

### Flow O4: Edit event branding/rules
- [ ] **Step 4.O4**: `browser_navigate` to `/events/:eventId/settings`. Change `brandPrimary` to `#FF0000`. Save. Capture PATCH. DB: `SELECT brand_primary, updated_at FROM events WHERE id=:id`. Then revert to original. Polish. Log.

### Flow O5: Attendees list
- [ ] **Step 4.O5**: `browser_navigate` to `/events/:eventId/attendees`. Capture list. Try search by company. DB: `SELECT COUNT(*) FROM attendees WHERE event_id=:id`. Polish. Log.

### Flow O6: Manually invite attendee
- [ ] **Step 4.O6**: From attendees page, click "Invite" or equivalent. Fill form with `verify-test-1@example.com`, `Test`, `User`. Submit. Capture POST. DB: new `attendees` row with that email. Polish. Log.

### Flow O7: Send announcement
- [ ] **Step 4.O7**: `browser_navigate` to `/events/:eventId/announcements`. Compose: title="Verification Test", body="Announcement from verification sweep". Submit. Capture POST. DB: `SELECT id, recipient_count, sent_at FROM announcements WHERE event_id=:id ORDER BY sent_at DESC LIMIT 1`. `recipientCount` should match attendee count. Polish. Log.

### Flow O8: Export attendees
- [ ] **Step 4.O8**: `browser_navigate` to `/events/:eventId/export`. Click export button. Capture network — should be a file download (200, content-type spreadsheetml). Verify the response (file size > 0). DB: no DB write needed (read-only export). Polish. Log.

### Flow O9: Account / settings
- [ ] **Step 4.O9**: `browser_navigate` to `/account`. Toggle one notification preference. Save. Capture POST/PATCH. DB: `SELECT notify_attendee_register, updated_at FROM organiser_settings WHERE organiser_id=:id`. Then revert. Polish. Log.

### Flow O10: Notifications
- [ ] **Step 4.O10**: `browser_navigate` to `/notifications`. Capture list. Click first item to mark-read. Capture PATCH if any. DB if applicable. Polish. Log.

### Flow O11: Create new event (full wizard)
- [ ] **Step 4.O11**: `browser_navigate` to `/events/new`. Fill the wizard:
  - Name: "Verification Test Event"
  - Description: "Created by verification workstream"
  - Dates: tomorrow + 1 day duration
  - Venue: "Test Venue, Test City"
  - Brand colors: defaults
  Submit final step. Capture POST `/organiser/events`. DB: new `events` row, `slug` and `short_hash` populated. Capture event ID for cleanup. **Mark this event for deletion at the end of the sweep — see Task 6.** Polish. Log.

- [ ] **Step 4.O-final: Commit organiser section**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: organiser sweep complete"
```

---

## Task 5: Phase 1 — Attendee Sweep (9 flows)

Clear browser storage. Log in as attendee (re-run Task 2C steps to get session).

For each flow, append `#### A<N>. <flow name>` block to the report under `### Attendee`.

### Flow A1: Home/landing
- [ ] **Step 5.A1**: `browser_navigate` to `/home`. Capture profile snippet API. DB: `SELECT first_name, last_name, profile_completed FROM attendees WHERE id=:attendeeId`. Polish. Log.

### Flow A2: First-time wizard
- [ ] **Step 5.A2**: If `profile_completed=true` for this attendee, this flow runs as a re-entry into the existing wizard route to confirm it loads (no save needed — don't pollute existing profile). If `false`, walk through all 4 steps with sample data and confirm `profile_completed=true` after final step. Polish. Log.

### Flow A3: Business card view
- [ ] **Step 5.A3**: `browser_navigate` to `/card`. Confirm card renders with profile data. Open share drawer. Try one share method (e.g. copy link). Polish. Log.

### Flow A4: Directory search & filters
- [ ] **Step 5.A4**: `browser_navigate` to `/directory`. Capture initial list. Search by company name. Apply filter (industry). Capture filtered request. DB: `SELECT COUNT(*) FROM attendees WHERE event_id=:id AND industry=:filter` matches API. Polish. Log.

### Flow A5: View attendee profile detail
- [ ] **Step 5.A5**: From directory, click a different attendee (not self). Capture profile API. DB: `SELECT id FROM profile_views WHERE viewer_id=:self AND viewed_id=:other ORDER BY created_at DESC LIMIT 1` — new row exists. Polish. Log.

### Flow A6: Send connection request
- [ ] **Step 5.A6**: From the viewed profile, click "Connect". Capture POST `/attendees/connections` (or similar). DB: `SELECT id, status FROM connection_requests WHERE sender_id=:self AND receiver_id=:other ORDER BY created_at DESC LIMIT 1` — status PENDING, single row. Polish. Log.

### Flow A7: Accept request
- [ ] **Step 5.A7**: To test acceptance from receiver side, switch identity: open a second browser tab, log in as the receiver attendee (if seeded). If no second seeded attendee, manually flip the request to ACCEPTED via DB to test the receiver's `/connections` view rendering only (note this in report as partial coverage).

  Preferred: log in as the receiver, navigate to `/requests` or `/connections` (whichever shows pending), accept the request from A6. Capture PATCH. DB: `SELECT status, responded_at FROM connection_requests WHERE id=:id` — ACCEPTED, `responded_at` set.

  Polish. Log.

### Flow A8: Suggestions / smart matching
- [ ] **Step 5.A8**: Switch back to original attendee. `browser_navigate` to `/suggestions`. Capture API. DB: either `SELECT COUNT(*) FROM match_scores WHERE attendee_id=:self` > 0 (precomputed) OR API returns scored results computed on-fly. Note which path is in use. Polish. Log.

### Flow A9: Settings
- [ ] **Step 5.A9**: `browser_navigate` to `/settings`. Toggle pause profile (`isPaused: false → true`). Save. Capture PATCH. DB: `SELECT is_paused FROM attendees WHERE id=:self`. Untoggle. Then test deletion request: submit a request with reason "verification test". DB: `SELECT id, status, requester_email FROM data_deletion_requests WHERE requester_email=:email ORDER BY requested_at DESC LIMIT 1`. **Mark this row for cleanup in Task 6.** Polish. Log.

- [ ] **Step 5.A-final: Commit attendee section**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: attendee sweep complete"
```

---

## Task 6: Cleanup, Summary & Hand-off

- [ ] **Step 6.1: Cleanup test data created during sweep**

```sql
-- Remove the test event created in O11
DELETE FROM events WHERE name='Verification Test Event';

-- Remove invited attendee from O6
DELETE FROM attendees WHERE email='verify-test-1@example.com';

-- Mark the deletion request from A9 as test
UPDATE data_deletion_requests SET reason=CONCAT(reason, ' [verification cleanup]')
WHERE requester_email='rahul.krishnan@gmail.com'
  AND status='PENDING'
ORDER BY requested_at DESC LIMIT 1;

-- Remove the test announcement from O7
DELETE FROM announcements WHERE title='Verification Test';
```

If any DELETE fails due to foreign key constraints, surface to user — don't force-delete.

- [ ] **Step 6.2: Update executive summary in report**

Edit the top of `docs/superpowers/specs/2026-05-02-verification-report.md`:

```markdown
## Executive summary
- Flows passed: <X> / 28
- Functional bugs fixed: <count> (file:line list below)
- Functional bugs deferred: <count>
- UI polish applied: <count> pages
- UI redesign deferred to WS 2/3: <count> items
```

- [ ] **Step 6.3: Populate "UI redesign opportunities" section**

For each polish-deferred entry collected during the sweep, add a bullet under `## UI redesign opportunities (workstreams 2 & 3)` with: page, current issue, suggested direction, tag `(Hero)` / `(Landing)` / `(Authenticated)`.

- [ ] **Step 6.4: Populate "Polish applied" section**

For each ≤20-line polish change, add: `file:line — what changed — why`.

- [ ] **Step 6.5: Populate "Bugs deferred" section**

For each bug exceeding the ≤10-line threshold or requiring user decision, add a numbered entry: severity, location, repro, proposed fix, status (`awaiting decision` / `decided: <decision>`).

- [ ] **Step 6.6: Tick the Definition of Done checklist**

In the report's footer, mark each completed item.

- [ ] **Step 6.7: Final commit**

```bash
git add docs/superpowers/specs/2026-05-02-verification-report.md
git commit -m "verification: final report — <X>/28 passed, <Y> fixes, <Z> deferred"
```

- [ ] **Step 6.8: Print summary to user**

Output a chat message summarizing:
- Pass count
- Fix count + commit hashes
- Deferred bug count + severity breakdown
- Polish-applied count
- Hand-off list for workstream 2 (Hero): all `(Hero)`-tagged redesign opportunities

End with: "Workstream 1 complete. Ready to start workstream 2 (Hero brainstorm) when you are."

---

## Self-Review

**Spec coverage:**
- ✅ Pre-flight (5 items) → Task 1
- ✅ Phase 0 smoke gate (3 roles) → Task 2 (A/B/C)
- ✅ 28 flows in role order → Tasks 3 (8) + 4 (11) + 5 (9)
- ✅ 6-step per-flow loop → documented at top, referenced per flow
- ✅ Bug-handling decision tree → documented at top
- ✅ Severity rubric → in spec, used in Task 6.5
- ✅ Report structure → Task 1.5 skeleton + Task 6 fills final sections
- ✅ Definition of done → Task 6.6 ticks, all DoD items map to tasks

**Placeholder scan:** no TBD/TODO/"implement later". Each step has concrete actions, URLs, SQL, and expected outcomes.

**Type/name consistency:** flow IDs (S1–S8, O1–O11, A1–A9) consistent. Table/column names match `schema.prisma`. Test credentials consistent across tasks.

Plan is ready for execution.
