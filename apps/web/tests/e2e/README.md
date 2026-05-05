# Platform Settings — Manual E2E QA Checklist

This document is the manual quality-assurance checklist for the Platform
Settings feature. It captures the three highest-value end-to-end flows in a
form that a developer or QA engineer can run through after deploying the
feature to a dev/staging environment.

## Why a README and not Playwright tests?

This codebase does not currently have Playwright (or any other browser
automation framework) installed. Task 13 of the Platform Settings plan
originally proposed automated coverage; in the absence of a chosen framework
this checklist documents the same scenarios so they can still be exercised by
hand. Each scenario below is structured as **arrange / act / assert** so it
converts cleanly to Playwright (or Cypress, Vitest browser mode, etc.) in a
follow-up task.

## Related artifacts

- Spec: [`docs/superpowers/specs/2026-05-05-platform-settings-design.md`](../../../../docs/superpowers/specs/2026-05-05-platform-settings-design.md)
- Plan: [`docs/superpowers/plans/2026-05-05-platform-settings.md`](../../../../docs/superpowers/plans/2026-05-05-platform-settings.md)

## Prerequisites

You will need:

- A running API. Default dev URL: `http://localhost:4000/api/v1`. Override
  via the web app's `NEXT_PUBLIC_API_URL` env var and the API's own
  `PORT` / base path config.
- A running web app. Default dev URL: `http://localhost:3000`.
- Super-admin credentials. These are seeded by the credential management
  CLI script — see commit `eea23c9` (`feat(super-admin): credential
  management via env-driven CLI script`). Typical env vars consumed by
  that script:
  ```bash
  SUPER_ADMIN_EMAIL=admin@vims-enterprise.com
  SUPER_ADMIN_PASSWORD=<your-dev-password>
  ```
- Database access (Prisma Studio or `psql`) for the optional verification
  steps in Scenario 1. Connection string lives in `DATABASE_URL`.
- `curl` (or any HTTP client) for Scenario 3.
- For Scenario 2: a separate browser profile / incognito window to ensure
  no super-admin session bleeds into the public-anonymous test.

The cached public settings TTL is **60 seconds** (server-side in-memory
cache plus `Cache-Control: public, max-age=60`). When toggling flags that
affect public surfaces, plan to wait roughly that long before reloading
the unauthenticated page.

---

## Scenario 1: Save round-trip persists Platform Name

Verifies that an edit to a top-level identity field persists across page
reloads, the `platform_settings` table is updated, and an audit log row is
written.

### Arrange

1. **Start** the API and web dev servers.
2. **Open** a browser and **navigate** to:
   ```
   http://localhost:3000/auth/super-admin/login
   ```
3. **Verify** the page renders with the heading "Admin access" and a
   "Super Admin Portal" pill.
4. **Fill** the email and password fields with super-admin credentials.
5. **Click** "Access Dashboard".
6. **Verify** the URL transitions to `/admin/overview`.

### Act

1. **Navigate** to:
   ```
   http://localhost:3000/admin/settings
   ```
2. **Verify** the heading reads "Platform Settings" and a "Platform
   Identity" card is visible.
3. **Locate** the "Platform Name" input.
4. **Note** the current value (you will restore this later).
5. **Change** the value to a unique string, e.g.:
   ```
   QA Test 2026-05-05T12:34:56Z
   ```
   (Use the actual current timestamp so reruns do not collide.)
6. **Click** "Save Settings".

### Assert

1. **Verify** a toast appears at the bottom-center of the viewport reading
   exactly:
   ```
   Settings saved.
   ```
   (The toast disappears after ~3 seconds.)
2. **Reload** the page (Ctrl/Cmd+R).
3. **Verify** the "Platform Name" input still shows your unique QA value.
4. **Verify** the footer line under the Save button now reads
   `Last updated by <your super-admin name> on <recent timestamp>.`

### Optional: database verification

5. **Open** Prisma Studio (or connect via `psql`).
6. **Query** the `platform_settings` table — there should be exactly one
   row, with `platform_name` matching your QA value and `updated_at`
   within the last few seconds.
7. **Query** the `audit_logs` table for a row with:
   - `action = 'platform_settings.update'`
   - `actor_id` = the super-admin user id
   - `created_at` within the last few seconds
   - `metadata` (or equivalent JSON column) containing `platformName`
     in the diff

### Cleanup

8. **Restore** the original Platform Name value and click "Save Settings"
   again.

---

## Scenario 2: Toggling self-signup off hides the public signup form

Verifies that disabling `allowOrganiserSelfSignup` causes the public
`/auth/organiser/signup` page to render the "request access" CTA instead
of the form, in an anonymous browser context.

### Arrange

1. **Login** as super admin and **navigate** to:
   ```
   http://localhost:3000/admin/settings
   ```
2. **Locate** the "Feature Flags" section.
3. **Locate** the row labelled "Allow organiser self-signup".
4. **Note** its current state — by default this should be **ON** (the
   toggle background is the primary color and the knob is on the right).

### Act

1. **Click** the toggle to switch it **OFF**.
2. **Verify** the toggle visually flips (background becomes muted, knob
   moves to the left, `aria-checked` becomes `false`).
3. **Click** "Save Settings".
4. **Verify** the "Settings saved." toast appears.
5. **Open** a NEW incognito / private window so no super-admin auth
   cookies or localStorage tokens carry over.
6. **Navigate** the incognito window to:
   ```
   http://localhost:3000/auth/organiser/signup
   ```
7. **Wait** up to ~60 seconds for the public settings server cache to
   expire, then reload the page if the form still appears.

### Assert

1. **Verify** the page heading reads exactly:
   ```
   Organiser self-signup is currently disabled
   ```
2. **Verify** the body paragraph beneath the heading begins with:
   ```
   To request an organiser account on
   ```
   followed by the configured platform name (default: `VIMS Events`),
   followed by `, please get in touch — we'll get you set up.`
3. **Verify** a primary "Request access →" button is visible. Inspect
   its `href` and confirm it is a `mailto:` link of the form:
   ```
   mailto:<supportEmail>?subject=Organiser%20account%20request%20%E2%80%94%20<platformName>&body=...
   ```
   - The `subject=` param URL-decodes to:
     `Organiser account request — <platformName>`.
   - `<supportEmail>` matches the value in `/admin/settings`.
4. **Verify** below the button there is text:
   ```
   Already have an account? Log in
   ```
   where "Log in" is a link to `/auth/organiser/login`.
5. **Verify** the signup form (Full Name, Organisation, Email, Mobile,
   Password, Confirm password fields, "Create Account →" button) is
   **NOT** rendered.

### Cleanup

6. **Return** to the original (super-admin) browser window.
7. **Toggle** "Allow organiser self-signup" back **ON**.
8. **Click** "Save Settings"; verify the toast.
9. **Wait** ~60 seconds again, then **reload** the incognito signup page.
10. **Verify** the full signup form is restored (heading reverts to
    "Create your account").

---

## Scenario 3: API rejects setting unbuilt feature flags to true

Verifies that the `PATCH /admin/settings` endpoint returns HTTP 422 with a
descriptive validation message when a request attempts to enable any of
the three "coming soon" flags (`cardToCardQrConnections`,
`crossEventNetworks`, `multiLanguageSupport`).

### Arrange

1. **Obtain** a super-admin access token by POSTing to the login
   endpoint:
   ```bash
   ACCESS_TOKEN=$(curl -s -X POST \
     http://localhost:4000/api/v1/auth/super-admin/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@vims-enterprise.com","password":"<your-dev-password>"}' \
     | python -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
   echo "$ACCESS_TOKEN"
   ```
   (Replace the email and password with your seeded super-admin
   credentials. Any tool that can extract the `accessToken` field works
   in place of `python` — e.g. `jq -r .accessToken`.)

### Act + Assert: cardToCardQrConnections

2. **Send** a PATCH request:
   ```bash
   curl -i -X PATCH \
     http://localhost:4000/api/v1/admin/settings \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"cardToCardQrConnections": true}'
   ```
3. **Verify** the response status line is `HTTP/1.1 422 Unprocessable Entity`.
4. **Verify** the response JSON body contains the validation message:
   ```
   cardToCardQrConnections is not yet available
   ```
   (Typically nested under `message` as either a string or array, per
   NestJS `ValidationPipe` defaults.)

### Act + Assert: crossEventNetworks

5. **Send**:
   ```bash
   curl -i -X PATCH \
     http://localhost:4000/api/v1/admin/settings \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"crossEventNetworks": true}'
   ```
6. **Verify** status `422` and message:
   ```
   crossEventNetworks is not yet available
   ```

### Act + Assert: multiLanguageSupport

7. **Send**:
   ```bash
   curl -i -X PATCH \
     http://localhost:4000/api/v1/admin/settings \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"multiLanguageSupport": true}'
   ```
8. **Verify** status `422` and message:
   ```
   multiLanguageSupport is not yet available
   ```

### Sanity check (optional)

9. **Send** the same flag explicitly set to `false` and confirm a `200`
   is returned (the constraint is `@Equals(false)`, so `false` is a
   valid no-op):
   ```bash
   curl -i -X PATCH \
     http://localhost:4000/api/v1/admin/settings \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"cardToCardQrConnections": false}'
   ```

---

## Sign-off

After running through all three scenarios with passing asserts, the
Platform Settings feature is considered behaviorally validated for this
release. Record the date, environment (dev / staging / prod), and the
operator's name in the deployment log or release ticket.
