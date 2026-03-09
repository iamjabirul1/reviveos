# Database Schema Reference

Complete documentation of the Supabase database schema.

## Entity Relationship

```
workspaces
    │
    ├── workspace_members (many-to-many with users)
    ├── workspace_integrations
    ├── leads
    │       └── messages
    │       └── bookings
    │       └── suppressions
    ├── campaigns
    │       └── messages
    ├── playbooks
    ├── subscriptions
    ├── ai_usage_log
    ├── activity_logs
    └── notification_preferences

profiles (1:1 with auth.users)
user_roles (app-wide admin roles)
paypal_plans (global config)
```

---

## Core Tables

### workspaces

Multi-tenant workspace for team collaboration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Workspace name |
| owner_user_id | uuid | Owner's auth.users id |
| plan | text | 'free', 'starter', 'growth', 'scale' |
| business_context | jsonb | AI context (industry, tone, etc.) |
| onboarding_completed | boolean | Onboarding wizard status |
| ai_suspended | boolean | AI access suspended flag |
| ai_suspended_at | timestamptz | When suspended |
| ai_suspended_reason | text | Suspension reason |
| created_at | timestamptz | Creation timestamp |

**RLS**: Members can view, owners can update (except plan/suspension fields).

---

### workspace_members

Maps users to workspaces with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| user_id | uuid | FK to auth.users |
| role | app_role | 'admin', 'member', 'viewer' |
| created_at | timestamptz | When added |

**RLS**: Members can view, owners can manage.

---

### leads

Contact/lead records for outreach.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| first_name, last_name | text | Name fields |
| email, phone | text | Contact info |
| company | text | Company name |
| source | text | Lead source (csv, crm, manual) |
| status | text | 'imported', 'enriched', 'contacted', etc. |
| stage | text | Sales stage |
| revival_score | integer | AI-computed 0-100 score |
| revival_bucket | revival_bucket | Enum: revive_now, review_first, nurture_later, suppress |
| best_channel | text | Recommended contact channel |
| best_angle | text | Recommended messaging angle |
| suggested_cta | text | Recommended call-to-action |
| risk_flag | text | Risk indicators |
| lead_value | numeric | Estimated deal value |
| enrichment_json | jsonb | Raw enrichment data |
| enriched_at | timestamptz | When enriched |
| do_not_contact | boolean | Opt-out flag |
| consent_status | text | Consent tracking |
| jurisdiction | text | Privacy jurisdiction (GDPR, CCPA) |
| notes | text | Free-form notes |
| last_contacted_at | timestamptz | Last outreach |
| last_activity_at | timestamptz | Last engagement |
| no_show_flag | boolean | Missed appointment |
| closed_lost_reason | text | Why deal was lost |

**RLS**: Workspace members have full CRUD.

---

### campaigns

Outreach campaign configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Campaign name |
| status | campaign_status | draft, active, paused, completed |
| playbook_id | uuid | FK to playbooks |
| playbook_type | text | Playbook type at creation |
| segment_json | jsonb | Lead filter criteria |
| channels_json | jsonb | ['email'] or ['sms'] or both |
| offer_json | jsonb | Offer details for AI |
| lead_count | integer | Cached lead count |
| created_by | uuid | Creator's user id |
| created_at | timestamptz | Creation timestamp |

**RLS**: Workspace members have full CRUD.

---

### messages

Individual outreach messages.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| campaign_id | uuid | FK to campaigns |
| lead_id | uuid | FK to leads |
| channel | message_channel | 'email' or 'sms' |
| subject | text | Email subject (null for SMS) |
| body | text | Message content |
| ai_rationale | text | Why AI wrote this message |
| approval_status | approval_status | pending, approved, rejected, edited |
| approved_by | uuid | Who approved |
| sent_at | timestamptz | When sent |
| delivered_at | timestamptz | When delivered |
| opened_at | timestamptz | When opened (email) |
| clicked_at | timestamptz | When link clicked |
| replied_at | timestamptz | When reply received |
| created_at | timestamptz | Creation timestamp |

**RLS**: Workspace members have full CRUD.

---

### playbooks

AI prompt templates for message generation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Playbook name |
| type | text | 'win_back', 'nurture', 'upsell', etc. |
| tone | text | Writing tone |
| cta | text | Call-to-action type |
| channels | jsonb | Supported channels |
| prompt_template | text | Custom AI prompt |
| sequence_json | jsonb | Multi-step sequence config |
| active | boolean | Is playbook active |
| created_at | timestamptz | Creation timestamp |

**RLS**: Workspace members have full CRUD.

---

### subscriptions

PayPal subscription records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| user_id | uuid | Subscriber's user id |
| paypal_subscription_id | text | PayPal subscription ID |
| paypal_plan_id | text | PayPal plan ID |
| plan_name | text | 'starter', 'growth', 'scale' |
| status | text | 'pending', 'active', 'cancelled' |
| amount | numeric | Payment amount |
| currency | text | Default 'USD' |
| billing_cycle | text | 'monthly' or 'annual' |
| current_period_start | timestamptz | Billing period start |
| current_period_end | timestamptz | Billing period end |
| created_at, updated_at | timestamptz | Timestamps |

**RLS**: Users can view own subscriptions only. Insert/update via service role.

---

### workspace_integrations

Per-workspace API credentials for third-party services.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| provider | text | 'resend', 'twilio', 'whatsapp', 'hubspot', etc. |
| credentials | jsonb | Encrypted credentials |
| is_active | boolean | Is integration enabled |
| created_at, updated_at | timestamptz | Timestamps |

**RLS**: Members can view, owners can manage.

---

## Supporting Tables

### profiles

User profile data (synced from auth.users).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| display_name | text | Display name |
| avatar_url | text | Profile picture URL |

**RLS**: Users can view/update own profile.

---

### user_roles

App-wide admin roles (separate from workspace roles).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| role | app_role | 'admin' for global admins |

**RLS**: Users can view own roles. Admin-managed via service role.

---

### activity_logs

Audit log of workspace events.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| event_type | text | Event name |
| user_id | uuid | Who performed action |
| lead_id | uuid | Related lead (optional) |
| payload_json | jsonb | Event details |
| created_at | timestamptz | Event timestamp |

---

### ai_usage_log

Track AI function calls for rate limiting.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| user_id | uuid | Who called |
| function_name | text | Which AI function |
| tokens_used | integer | Token consumption |
| created_at | timestamptz | Call timestamp |

---

### suppressions

Do-not-contact list with expiration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| lead_id | uuid | FK to leads |
| reason | text | Why suppressed |
| jurisdiction | text | Legal jurisdiction |
| expires_at | timestamptz | When suppression expires |
| created_at | timestamptz | Creation timestamp |

---

### bookings

Track booked meetings from outreach.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| lead_id | uuid | FK to leads |
| campaign_id | uuid | FK to campaigns |
| booked_at | timestamptz | Meeting time |
| estimated_value | numeric | Deal value |
| created_at | timestamptz | Creation timestamp |

---

### notification_preferences

User email notification settings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| workspace_id | uuid | FK to workspaces |
| weekly_usage_digest | boolean | Weekly summary emails |
| plan_limit_warnings | boolean | Limit approach warnings |
| subscription_updates | boolean | Billing notifications |

---

### paypal_plans

Global PayPal subscription plan configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| plan_name | text | 'starter', 'growth', 'scale' |
| paypal_product_id | text | PayPal product ID |
| paypal_plan_id_monthly | text | Monthly plan ID |
| paypal_plan_id_annual | text | Annual plan ID |
| price_monthly | numeric | Monthly price |
| price_annual | numeric | Annual price |

**Note**: Also has `paypal_plans_public` view for safe frontend access.

---

## Enums

```sql
-- User roles (workspace + global)
CREATE TYPE app_role AS ENUM ('admin', 'member', 'viewer');

-- Message approval workflow
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'edited');

-- Campaign lifecycle
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Communication channel
CREATE TYPE message_channel AS ENUM ('email', 'sms');

-- Lead prioritization
CREATE TYPE revival_bucket AS ENUM ('revive_now', 'review_first', 'nurture_later', 'suppress');
```

---

## Key Functions

### is_workspace_member(user_id, workspace_id)

Check if user belongs to workspace. Used in most RLS policies.

### has_role(user_id, role)

Check if user has global role (e.g., 'admin').

### check_ai_rate_limit(workspace_id, function_name)

Returns rate limit status with daily limits by plan.

### handle_new_user()

Trigger function that:
1. Creates profile
2. Creates default workspace
3. Adds user as workspace admin
4. Grants global admin to founder email

---

## Security Model

1. **Row-Level Security (RLS)** on all tables
2. **Workspace isolation** via `is_workspace_member()` checks
3. **Role-based access** within workspaces (admin, member, viewer)
4. **Global admin role** stored in `user_roles` (not profiles!)
5. **Service role** for cross-workspace operations (cron jobs, webhooks)
