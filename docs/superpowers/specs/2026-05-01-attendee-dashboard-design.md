# Attendee Dashboard & Networking System — Design Spec

**Date:** 2026-05-01
**Status:** Approved
**Scope:** Profile wizard, virtual glass card, social sharing, smart matching, networking analytics

---

## Context

The VIMS-EVENT platform has a working attendee module with OTP login, directory search, and basic connection management. However, the attendee experience is incomplete: there is no profile setup wizard after first login, the business card lacks the futuristic design and sharing capabilities needed for B2B networking, and there are no intelligent matching or analytics features. This spec addresses all gaps to deliver a professional, corporate-grade attendee experience.

---

## Architecture Approach: Incremental Enhancement

Extend existing modules in-place. Add new fields to the Attendee model, add new endpoints to existing controllers, and create only 3 new small backend modules (SmartMatching, Analytics, Activity) for genuinely new logic. This aligns with the existing "fat module" pattern in the codebase.

---

## 1. Profile Wizard

### 1.1 Multi-Step Wizard (4 steps, shown after first OTP login if `profileCompleted` is false)

| Step | Title | Fields |
|------|-------|--------|
| 1 | Personal | First Name, Last Name, Age, Sex/Gender (dropdown: Male, Female, Non-Binary, Prefer not to say), Email (readonly), Phone, Profile Photo Upload |
| 2 | Professional | Company, Designation, Occupation, Industry (dropdown with 30+ options), Business Type (dropdown) |
| 3 | Services & Interests | Services Offered (multi-select tag input), Looking For / Interested In (multi-select), Skills/Tags (free-text tag input) |
| 4 | Preferences & Social | Networking Goals (checkboxes), LinkedIn URL, Website URL, Twitter Handle, Consent toggle |

### 1.2 New DB Fields on Attendee

```
age                Int?
sex                String?             // 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
occupation         String?
interestedIn       Json    default("[]")
networkingGoals    Json    default("[]")
profileCompleted   Boolean default(false)
profileCompletedAt DateTime?
linkedinUrl        String?
websiteUrl         String?
twitterHandle      String?
```

### 1.3 API Endpoints

- `GET /attendees/me/profile-status` — Returns `{ profileCompleted, currentStep, completedSteps, completenessPercent, missingFields }`
- `PATCH /attendees/me/wizard-step` — Saves a single wizard step. Body: `{ step: 1|2|3|4, data: { ...fields } }`. Sets `profileCompleted = true` on step 4 completion.
- `POST /attendees/me/complete-profile` — Finalizes profile, creates Activity record.

### 1.4 Flow

1. OTP verify returns `profileCompleted: false` in user data
2. Attendee layout redirects to `/wizard` when `profileCompleted` is false
3. User completes 4 steps, each saved independently via `PATCH /attendees/me/wizard-step`
4. On step 4 completion, backend sets `profileCompleted = true`, triggers match score computation
5. Frontend redirects to `/dashboard`

### 1.5 Industry Dropdown Options

IT Services, Software, Hardware, E-commerce, FinTech, EdTech, HealthTech, PropProp, AgriTech, Logistics, Pharmaceuticals, Textiles, Automotive, Aerospace, FMCG, BFSI, Government, NGO, AI / Machine Learning, Cybersecurity, Blockchain / Web3, Gaming, Hospitality, Telecommunications, Renewable Energy, Biotechnology, Entertainment, Sports, Fashion, Insurance, Travel & Tourism, Other

### 1.6 Networking Goals Options

Find Partners, Find Clients, Find Suppliers, Hiring / Recruitment, Seek Mentorship, Offer Mentorship, Market Research, Investment, Knowledge Sharing, General Networking

---

## 2. Futuristic Glass Card

### 2.1 Visual Design

- Glassmorphism: `backdrop-blur-xl`, gradient overlay (`from-indigo-500/20 to-purple-500/20`), semi-transparent `border-white/20`
- Profile photo with gradient ring overlay
- QR code (client-side via `qrcode.react`) encoding public profile URL: `{FRONTEND_URL}/profile/{attendeeId}`
- Company name, designation, services as tag chips
- Animated entry with `framer-motion` spring effect
- Stats row: Profile Views, Cards Shared, QR Scans (real analytics data)

### 2.2 ShareDrawer (bottom sheet)

All sharing methods accessible from a single "Share" button:

| Method | Implementation |
|--------|---------------|
| WhatsApp | Deep link `https://wa.me/?text=` with card info + profile URL |
| LinkedIn | Opens LinkedIn share URL with card data |
| Save to Contacts | Downloads VCF via existing `/attendees/:id/vcard` endpoint |
| QR Scan | Full-screen QR modal for others to scan |
| Email | `mailto:` link with card data |
| SMS | `sms:` link with card data |
| Copy Link | Copies public profile URL to clipboard |
| Share as Image | `html-to-image` captures GlassCard DOM as PNG download |

### 2.3 Card Share Tracking

- `POST /attendees/me/card/shared` — Records share event. Body: `{ method: 'whatsapp' | 'linkedin' | 'qrcode' | 'email' | 'sms' | 'link' | 'vcard' | 'image' }`
- Increments `cardShareCount` on Attendee, creates Activity record

### 2.4 New DB Fields on Attendee

```
profileViewCount   Int     default(0)
cardShareCount     Int     default(0)
qrScanCount        Int     default(0)
```

---

## 3. Smart Matching

### 3.1 Scoring Algorithm

Each candidate attendee is scored (0.0 to 1.0) based on:

| Factor | Weight | Condition |
|--------|--------|-----------|
| Same industry | +0.3 | Exact match on `industry` |
| Overlapping services | +0.2 × overlap ratio | JSONB intersection of `services` arrays |
| Complementary goals | +0.2 | Attendee's `networkingGoals` intersect candidate's `services`/`industry` |
| Shared tags | +0.15 × overlap ratio | JSONB intersection of `tags` arrays |
| Same city | +0.05 | Exact match on `city` |
| Has photo | +0.1 | `profilePhotoUrl` is not null |

### 3.2 Filters

- Exclude: self, already-connected attendees, paused attendees, incomplete profiles (`profileCompleted = false`)

### 3.3 API Endpoints

- `GET /events/:eventId/suggestions?limit=10&offset=0` — Returns ranked suggestions with scores and match reasons
- `POST /events/:eventId/suggestions/refresh` — Recomputes match scores after profile update

### 3.4 New DB Table: MatchScore

```
MatchScore {
  id           String   @id @default(cuid())
  attendeeId   String   // person seeing recommendations
  targetId     String   // recommended person
  eventId      String
  score        Float    // 0.0 to 1.0
  matchReasons Json     // ['same_industry', 'complementary_services']
  computedAt   DateTime
}
Unique: [attendeeId, targetId]
```

### 3.5 UI: Suggestion Cards

- Attendee avatar, name, designation, company
- Match score badge (e.g. "92% Match")
- Match reason tags ("Same Industry", "Complementary Services")
- Connect button (uses existing connection request flow)

---

## 4. Networking Analytics Dashboard

### 4.1 Dashboard Components

| Component | Data Source |
|-----------|-------------|
| Profile completeness ring | Percentage of filled fields |
| Networking score | Composite: connections 40% + engagement 30% + completeness 30% |
| Quick stats grid | Connections Made, Cards Shared, Profile Views, QR Scans with weekly deltas |
| Top 3 suggestions | From Smart Matching module |
| Recent activity | Latest 5 Activity records |
| Engagement trend | up/flat/down comparing this week vs last |

### 4.2 Networking Score Formula

```
score = (acceptedConnections / maxConnections * 40)
      + ((views + shares + scans) / daysSinceRegistration * 30)
      + (filledFields / totalFields * 30)
```

### 4.3 API Endpoints

- `GET /attendees/me/analytics` — Full dashboard data: connections (total, thisWeek, pending), profileViews (total, thisWeek, recentViewers), cardShares (total, thisWeek, byMethod), qrScans (total, thisWeek), networkingScore, engagementTrend
- `GET /attendees/me/analytics/trends?period=7d|30d|all` — Time-series data for charts

---

## 5. Supporting Features

### 5.1 Profile View Tracking

- `POST /attendees/:attendeeId/view` — Records a profile view. Body: `{ source: 'directory' | 'qr' | 'suggestion' | 'connection' }`
- Increments `profileViewCount` on the viewed attendee

### 5.2 Activity Feed

- `GET /events/:eventId/activities?page=1&pageSize=20` — Returns attendee's own activities + accepted connections' major activities
- Activity types: `connection_made`, `card_shared`, `profile_viewed`, `profile_completed`, `note_added`

### 5.3 Connection Notes

- `POST /events/:eventId/connections/:connectionId/notes` — Add private note
- `GET /events/:eventId/connections/:connectionId/notes` — List notes
- `PATCH /events/:eventId/connections/:connectionId/notes/:noteId` — Update
- `DELETE /events/:eventId/connections/:connectionId/notes/:noteId` — Delete

### 5.4 New DB Tables

**ProfileView:**
```
ProfileView {
  id        String   @id @default(cuid())
  viewerId  String
  viewedId  String
  eventId   String
  source    String   default("directory")
  createdAt DateTime
}
Indexes: [viewedId, createdAt], [viewerId, eventId], [eventId, createdAt]
```

**ConnectionNote:**
```
ConnectionNote {
  id           String   @id @default(cuid())
  authorId     String
  connectionId String
  eventId      String
  content      String   @db.VarChar(500)
  createdAt    DateTime
  updatedAt    DateTime
}
Indexes: [authorId, connectionId], [eventId]
```

**Activity:**
```
Activity {
  id         String   @id @default(cuid())
  attendeeId String
  eventId    String
  type       String   // 'connection_made' | 'card_shared' | 'profile_viewed' | 'profile_completed' | 'note_added'
  metadata   Json     default("{}")
  createdAt  DateTime
}
Indexes: [attendeeId, createdAt], [eventId, type], [createdAt]
```

---

## 6. Frontend Architecture

### 6.1 New Routes (all under `(attendee)` route group)

| Route | Purpose |
|-------|---------|
| `/wizard` | Multi-step profile wizard (4 steps) |
| `/dashboard` | Networking analytics dashboard (new home tab) |
| `/suggestions` | Smart matching — "People You Should Meet" |
| `/profile/[id]` | Public attendee profile view |
| `/activity` | Activity feed |

### 6.2 Updated Bottom Navigation (5 tabs)

```
Directory | Card | Home (Dashboard) | Network | Suggestions
```

Home/Dashboard becomes the default landing page after profile completion.

### 6.3 New Components

- `WizardContainer.tsx` — Step state management, progress bar, navigation
- `StepPersonal.tsx`, `StepProfessional.tsx`, `StepServices.tsx`, `StepPreferences.tsx`
- `GlassCard.tsx` — Glassmorphism card with photo, QR, stats
- `ShareDrawer.tsx` — Bottom sheet with all sharing methods
- `DashboardHeader.tsx` — Profile completeness ring + greeting
- `NetworkingScoreCard.tsx` — Circular score with trend indicator
- `QuickStatsGrid.tsx` — 4-card stats grid
- `SuggestionsPreview.tsx` — Top 3 suggestions on dashboard
- `RecentActivity.tsx` — Latest activity items
- `SuggestionCard.tsx` — Match score badge + reason tags
- `AttendeeProfile.tsx` — Full public profile view
- `ConnectionNotes.tsx` — Private notes on connections
- `ActivityList.tsx` — Paginated activity feed

### 6.4 New Frontend Dependencies

- `framer-motion` — Card animations, wizard transitions
- `html-to-image` — Share card as PNG image

### 6.5 State Management

- Zustand auth store: add `profileCompleted` boolean, set during OTP verify response
- TanStack Query hooks: `useProfileStatus()`, `useAnalytics()`, `useSuggestions(eventId)`, `useActivities(eventId)`, `useConnectionNotes(connectionId)`

---

## 7. Implementation Phases

### Phase 1 — Database & Profile Wizard (unblocks everything)
1. Prisma migration: new Attendee fields + 4 new tables
2. Update shared constants with expanded industry/goal options
3. Update shared types with new interfaces
4. Backend: Add `profileCompleted` to OTP verify response
5. Backend: Create wizard-step endpoint
6. Frontend: Build wizard UI (4 step components)
7. Frontend: Update auth store + attendee layout for wizard redirect

### Phase 2 — Glass Card & Sharing
1. Frontend: Build GlassCard component with glassmorphism
2. Frontend: Build ShareDrawer with all methods
3. Backend: Add card share tracking + profile view endpoints
4. Frontend: Replace existing card page

### Phase 3 — Smart Matching
1. Backend: Create SmartMatchingModule with scoring service
2. Backend: MatchScore computation and caching
3. Frontend: Build suggestions page + suggestion cards
4. Integrate preview into dashboard

### Phase 4 — Analytics Dashboard
1. Backend: Create AnalyticsModule with aggregation service
2. Backend: Add Activity record creation to existing flows
3. Frontend: Build dashboard page with all widgets
4. Frontend: Update bottom navigation to 5 tabs

### Phase 5 — Activity Feed & Connection Notes
1. Backend: Create ActivityModule
2. Backend: Add connection notes CRUD
3. Frontend: Build activity feed page
4. Frontend: Build connection notes UI
5. Frontend: Build public profile page

---

## 8. Critical Files

| File | Changes |
|------|---------|
| `apps/api/prisma/schema.prisma` | New fields on Attendee + 4 new models |
| `apps/api/src/attendees/attendees.service.ts` | Wizard step logic, profile status, card share tracking |
| `apps/api/src/attendees/attendees.controller.ts` | New wizard, profile-status, view, share endpoints |
| `apps/api/src/directory/directory.service.ts` | Template for smart matching raw-SQL JSONB queries |
| `apps/api/src/connections/connections.controller.ts` | Connection notes endpoints |
| `apps/web/src/app/(attendee)/layout.tsx` | Wizard redirect + new bottom nav tab |
| `apps/web/src/app/(attendee)/card/page.tsx` | Replace with GlassCard + ShareDrawer |
| `packages/shared/src/constants/index.ts` | Extended industry, networking goal options |
| `packages/shared/src/types/index.ts` | New interfaces |

---

## 9. Verification Plan

1. **Profile Wizard:** Register as new attendee via OTP, complete all 4 steps, verify data saved in database, verify redirect to dashboard
2. **Glass Card:** Navigate to card page, verify glassmorphism rendering, QR code generation, photo display, share drawer opens with all methods, each share method works and tracks analytics
3. **Smart Matching:** Complete profiles for multiple attendees, verify suggestions page shows scored matches with reasons, connect with a suggestion, verify it disappears from suggestions
4. **Analytics Dashboard:** Verify all stats pull real data, networking score calculates correctly, trends update over time
5. **Activity Feed:** Perform actions (connect, share, view profile), verify activities appear in feed
6. **Connection Notes:** Add/edit/delete notes on accepted connections, verify persistence
7. **Cross-role integration:** Verify organizer can see new attendee fields in their dashboard, super admin can view attendee analytics
