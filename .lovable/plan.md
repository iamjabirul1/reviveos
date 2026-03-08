
# ReviveOS — Full MVP Implementation Plan

## Phase 1: Foundation & Auth (Steps 1-3)

### 1. Supabase Setup & Database Schema
- Connect external Supabase project
- Create all tables: workspaces, workspace_members, leads, campaigns, messages, bookings, activity_logs, playbooks, suppressions
- Create user_roles table (separate from profiles, per security best practices)
- Set up RLS policies on all tables scoped to workspace membership
- Create `has_role` security definer function for role checks

### 2. Auth & Workspace System
- Email/password signup and login pages
- Auth context with session management
- Post-signup flow: create workspace, store in DB
- Multi-workspace support with workspace switcher
- Profile creation trigger on signup

### 3. App Shell & Navigation
- Sidebar layout with navigation: Dashboard, Import, Leads, Playbooks, Campaigns, Approvals, Analytics, Settings
- Workspace name in header
- Mobile-responsive sidebar (collapsible)
- Protected routes wrapping `/app/*`

## Phase 2: Landing Page & Onboarding (Step 4)

### 4. Marketing Landing Page
- Hero section with value prop: "Recover revenue from dead leads"
- Feature highlights, social proof section
- CTA buttons → signup
- Clean, modern design with dark/light support

## Phase 3: Import & Scoring (Steps 5-6)

### 5. CSV Import System
- File upload dropzone on `/app/import`
- CSV parsing (PapaParse) with preview of first 10 rows
- Drag-and-drop field mapping UI (map CSV columns → lead fields)
- Deduplication on email + phone
- Import progress indicator and success summary
- Store leads in Supabase with workspace_id

### 6. Lead Scoring Engine
- Deterministic scoring logic (edge function):
  - No-show in 30 days: +25
  - Closed-lost "timing/not now": +20
  - Last contact 14–120 days: +15
  - Prior positive reply: +20
  - Lead value above threshold: +15
  - Old never contacted: -15
  - DNC/unsubscribed: suppress
  - Missing contact info: suppress
- Assign revival buckets: Revive Now, Review First, Nurture Later, Suppress
- Generate best_angle, best_channel, risk_flag, suggested_CTA per lead
- Auto-run scoring after import; manual re-score button

## Phase 4: Leads & Playbooks (Steps 7-8)

### 7. Leads Table
- Full data table at `/app/leads` with search, sort, pagination
- Filter by: revival bucket, source, stage, score range
- Bulk select with actions (create campaign, suppress, export)
- Lead detail drawer showing full profile, score breakdown, activity log
- "Why this lead is revivable" explanation card

### 8. Playbook Builder
- Five playbook templates: Stale Lead, No-Show Rescue, Closed-Lost Comeback, Proposal Follow-Up, Dormant Customer
- Configuration UI: pick type → channels → tone (friendly/direct/consultative) → CTA (book call/reply/claim offer/answer question)
- Sequence builder showing: Email 1, Email 2, SMS, Final close-the-loop
- Save as reusable template
- AI draft generation placeholders (will use Lovable AI when wired)

## Phase 5: Campaigns & Approvals (Steps 9-10)

### 9. Campaign Creation
- Create campaign from leads table selection or playbook
- Segment definition (filters saved as JSON)
- Channel selection (email, SMS)
- AI message generation for each lead in campaign (mocked initially, Lovable AI later)
- Campaign status tracking: Draft → Active → Paused → Completed

### 10. Approval Inbox
- Queue view at `/app/approvals` showing pending messages
- Single-record review: lead context panel + AI rationale + message preview
- Actions: Approve, Edit & Approve, Suppress (mark "never contact"), Escalate to manual owner
- Batch approve option
- All approval actions logged to activity_logs

## Phase 6: Messaging & Tracking (Step 11)

### 11. Message Sending (Mocked for MVP)
- Edge function stubs for email (Resend) and SMS (Twilio) — currently mock/log only
- Booking link insertion (Calendly URL or custom)
- Status tracking: sent → delivered → replied → clicked
- Message status updates in the messages table
- Webhook endpoints ready for email/SMS callbacks (stubbed)

## Phase 7: Dashboard & Analytics (Step 12)

### 12. Dashboard (`/app`)
- KPI cards: Recoverable Now, Messages Sent, Replies, Meetings Booked, Revived Pipeline $, Suppressed, Best Playbook, Best Channel
- Revival buckets chart (bar/donut)
- Recent campaigns list
- Top leads to reactivate
- Approval queue summary

### 13. Analytics Page
- Time-series chart: revenue recovered over time
- Campaign leaderboard table
- Conversion by playbook, source, stage
- Channel performance comparison
- Approval rate vs autonomous send rate

## Phase 8: Settings & Compliance (Step 14)

### 14. Settings & Compliance
- Workspace settings (name, members, roles)
- Suppression list management with jurisdiction and expiry
- Consent status tracking
- Unsubscribe handling
- Audit log viewer (who approved what, when)
- Integration placeholders for Resend, Twilio, HubSpot, GoHighLevel API keys

## Design Approach
- Clean, professional SaaS aesthetic with shadcn/ui components
- Dark mode support
- Color palette: professional blues/grays with green for positive metrics, amber for warnings, red for suppressed
- Empty states with onboarding tips on every page
- Mobile responsive throughout
