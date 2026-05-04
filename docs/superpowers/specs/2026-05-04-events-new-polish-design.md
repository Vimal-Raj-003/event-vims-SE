# VIMS Event — `/events/new` Polish Design Spec

**Date:** 2026-05-04
**Workstream:** 7 of N (Verification → Hero → Landing → Attendee unblock → Organiser features → Attendee polish → **`/events/new` polish**)
**Status:** Design approved, ready for implementation plan

## Context

WS-1 verification flagged `/events/new` as a UI redesign opportunity: *"single-page form, not a multi-step wizard despite spec wording. Consider splitting into Basics / Branding / Schedule / Review steps with progress indicator."*

After reading the file (319 LOC, 9 fields + 2 toggles + a 2-column layout with live preview), a wizard split fails the cost/benefit test:

- 9 fields fit comfortably above the fold; no inter-step dependencies
- A 4-step wizard turns 1 click into 4 (Next × 3 + Submit)
- The live-preview card on the right column updates as the organiser types — that affordance disappears in a step-by-step wizard
- Wizards earn their friction with 15+ fields or save-progress workflows; this page has neither

Reframing surfaces two real bugs/gaps that are smaller and more useful than a wizard:

1. **Two toggles ("Allow Contact Export", "Require Connection Approval") are dead UI.** They live in local state but the submit handler doesn't include them in the POST payload. The `CreateEventDto` doesn't accept them either. `EventRule` rows are created at *publish* time with hardcoded defaults — there's no path to honour the user's toggle choice.
2. **No draft persistence.** Page refresh wipes the form. A 9-field form deserves better.

Investigation also showed the "Require Connection Approval" toggle is **conceptually redundant**: the connection-request flow is always PENDING-then-accept by design. There's no schema field to map it to, and there's no behaviour that the toggle being off would unlock.

## Goals

- Remove the two dead toggles + their wrapper card. Removes misleading UI and saves ~18 LOC.
- Add localStorage draft persistence with 24-hour TTL.
- Add a "Continue your draft?" prompt that appears on mount when a non-expired draft exists, with explicit Restore / Start Fresh choice (no silent auto-restore).
- Clear the draft after a successful create.
- Preserve every field, validation, and visual that organisers already rely on (live preview, color pickers, datetime fields, etc.).

## Non-Goals

- **No** wizard split. Single-page form is the right shape for this page.
- **No** new backend endpoint. No DTO change. No schema change.
- **No** server-side draft storage. localStorage only — drafts don't survive across devices.
- **No** auto-restore. The "Continue your draft?" prompt is explicit; users always know what's loaded.
- **No** event-rules editor on the create page. The post-create `/events/:id/settings` page already exposes EventRule editing (verified WS-1 flow O4 PASS), so users get full control via the proper edit flow once their event exists.
- **No** persistence across browsers / private windows. Standard localStorage scope.
- **No** field-level autosave indicator ("Saved · just now"). Quiet save behind the scenes.

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  /events/new (single file)                                   │
│   ├─ Top of file: helpers (readDraft / writeDraft / clearDraft)
│   ├─ Component: state expanded with draftStatus + pendingDraft
│   ├─ Mount effect: read draft, decide prompt vs no-prompt    │
│   ├─ Form-watch effect: debounced (400ms) save               │
│   ├─ Submit success: clearDraft() + router.push              │
│   ├─ Restore prompt: rendered above the form heading         │
│   └─ JSX: networking-rules section removed, Toggle deleted   │
└──────────────────────────────────────────────────────────────┘
```

Single file change, single commit-able unit, no module boundary work.

## Architecture & File Changes

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/web/src/app/(organiser)/events/new/page.tsx` | Add helpers + draft state + restore prompt + form-watch effect + submit cleanup; delete the Toggle component, the `allowExport`/`requireApproval` state, and the entire "Networking Rules" `<div>`. Net: ~+70 LOC additions, ~−18 LOC removals = **+52 LOC**. |

Total: **1 file modified, ~+52 LOC**. Smallest workstream so far.

## Implementation Detail

### Storage shape

- Key: `vims:event-draft:v1` (versioned so future `CreateEventPayload` changes can bump to `:v2` and silently invalidate older drafts)
- Value: JSON string of `{ savedAt: string (ISO), form: CreateEventPayload }`

### Helpers (top of file, outside the component)

```ts
const DRAFT_KEY = "vims:event-draft:v1";
const TTL_MS = 24 * 60 * 60 * 1000;

interface Draft {
  savedAt: string;
  form: CreateEventPayload;
}

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (Date.now() - new Date(parsed.savedAt).getTime() > TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function writeDraft(form: CreateEventPayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), form }),
    );
  } catch {
    // localStorage full / disabled — silently swallow
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function isInitialForm(form: CreateEventPayload): boolean {
  return (
    form.name === "" &&
    form.description === "" &&
    form.startAt === "" &&
    form.endAt === "" &&
    form.venue === "" &&
    form.venueMapUrl === "" &&
    form.expectedCount === undefined &&
    form.brandPrimary === "#4F46E5" &&
    form.brandSecondary === "#818CF8"
  );
}
```

### Component state additions

```tsx
const [draftStatus, setDraftStatus] = useState<"unknown" | "has-draft" | "no-draft">("unknown");
const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
```

### Mount effect — check for draft

```tsx
useEffect(() => {
  const draft = readDraft();
  if (draft) {
    setPendingDraft(draft);
    setDraftStatus("has-draft");
  } else {
    setDraftStatus("no-draft");
  }
}, []);
```

### Form-watch effect — save on change

```tsx
useEffect(() => {
  // Don't save until user has resolved the restore prompt
  if (draftStatus !== "no-draft") return;
  // Don't save the initial empty state
  if (isInitialForm(form)) return;

  const handle = setTimeout(() => writeDraft(form), 400);
  return () => clearTimeout(handle);
}, [form, draftStatus]);
```

### Restore-prompt JSX (rendered above the existing page heading)

```tsx
{draftStatus === "has-draft" && pendingDraft && (
  <div
    role="status"
    className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shrink-0"
  >
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">Continue your draft?</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Started {relativeTime(pendingDraft.savedAt)}.
      </p>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={() => {
          setForm(pendingDraft.form);
          setPendingDraft(null);
          setDraftStatus("no-draft");
        }}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
      >
        Restore draft
      </button>
      <button
        type="button"
        onClick={() => {
          clearDraft();
          setPendingDraft(null);
          setDraftStatus("no-draft");
        }}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        Start fresh
      </button>
    </div>
  </div>
)}
```

### Submit success — clear draft

In the existing `handleSubmit` success path, before `router.push(...)`:

```tsx
clearDraft();
router.push(`/events/${data.id}`);
```

### Removals

In the existing file:

1. Delete the `Toggle` component (lines 20–32, ~13 LOC)
2. Delete the `allowExport`/`requireApproval` state (lines 52–53, 2 LOC)
3. Delete the entire "Networking Rules" `<div>` (lines 213–231, ~19 LOC)

Net removal ≈ 34 LOC. (Slightly larger than my earlier ~−18 estimate once the Toggle component is counted.)

### Final LOC math

- Removals: ~−34 LOC (Toggle + state + section)
- Additions: ~+90 LOC (helpers ~40 + state + 3 effects ~25 + prompt JSX ~25)
- Net: **~+56 LOC**

## Edge Cases & Failure Modes

| Case | Handling |
|---|---|
| localStorage full / disabled | All three helpers wrap in `try/catch`; the form still works without persistence. |
| Draft from a future schema (e.g. `:v2` was added later, user reverts code) | Versioned key — older code only reads `:v1`, new fields are ignored. |
| Tab A is editing, tab B opens fresh | Tab B sees the draft prompt; if it restores, tab A's later writes overwrite tab B's. Acceptable for organiser flow. |
| User clicks "Restore draft" then closes tab | Form watcher is active; next debounce will re-save. No data loss. |
| User clicks "Start fresh" then changes mind | Draft is cleared; they'd have to re-fill manually. (Out of scope: undo button.) |
| Draft savedAt 24h+1ms ago | Treated as expired, deleted on read, prompt doesn't appear. |
| User submits → router.push → comes back to `/events/new` | Draft cleared on submit; fresh form. |

## Accessibility

- Restore prompt has `role="status"` so screen readers announce it on mount
- Both buttons in the prompt are keyboard-focusable
- The prompt is dismissible by clicking either button (no escape-key dismiss because there's no obvious "default" choice)
- Existing form fields and submit are unchanged

## Performance

- Debounced 400ms save means each keystroke doesn't hit localStorage
- `JSON.stringify` of a 9-field object is sub-millisecond
- `readDraft()` runs once on mount (no repeated reads)

## Testing

- **Manual:** fill 3 fields, refresh, see "Continue your draft?" prompt with "X minutes ago" — click Restore, verify fields populated
- **Manual:** fill 3 fields, refresh, click Start fresh — form is empty, no further prompts on this mount; localStorage cleared
- **Manual:** open DevTools Application > Local Storage, fill form, observe `vims:event-draft:v1` updating after each pause
- **Manual:** submit successfully — verify the storage key is removed
- **Manual:** open DevTools, manually set the draft's `savedAt` to 25h ago, refresh — no prompt appears, key removed
- **Manual:** verify the "Networking Rules" section is GONE from the page after the change

No automated unit tests required — pure presentational + state-machine code, verifiable by inspection.

## Out-of-scope follow-ups

- Server-side draft storage (would let drafts survive across devices)
- Field-level autosave indicator
- Restore-from-history (multiple drafts, not just the latest)
- Wiring real event-rule defaults into the create flow (would require `CreateEventDto` extension + creating `EventRule` at create time, not publish time)
- Reintroducing rules toggles on the create page once they have a schema home and a meaningful default

## Hand-off

This workstream completes the original 7-item WS-1 hand-off list. After this:

- All deferred items from the verification report are resolved or explicitly skipped (the wizard split is skipped per cost/benefit; the rules toggles' wiring is deferred as out-of-scope).
- The full session narrative covers WS 1–7. Future work would be net-new product features rather than WS-1 carryover.
