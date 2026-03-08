
-- ============================================
-- ReviveOS Full Database Schema
-- ============================================

-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Enum for revival buckets
CREATE TYPE public.revival_bucket AS ENUM ('revive_now', 'review_first', 'nurture_later', 'suppress');

-- Enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'edited');

-- Enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Enum for message channel
CREATE TYPE public.message_channel AS ENUM ('email', 'sms');

-- ============================================
-- Profiles table (auto-created on signup)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Workspaces
-- ============================================
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Workspace Members
-- ============================================
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User Roles (separate from profiles, for security)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Security definer function for role checks
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- Helper: check workspace membership
-- ============================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- ============================================
-- Workspace RLS Policies
-- ============================================
CREATE POLICY "Members can view their workspaces" ON public.workspaces
  FOR SELECT USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner can update workspace" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner can delete workspace" ON public.workspaces
  FOR DELETE USING (auth.uid() = owner_user_id);

-- Workspace members RLS
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace owner can manage members" ON public.workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_user_id = auth.uid())
  );
CREATE POLICY "Workspace owner can update members" ON public.workspace_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_user_id = auth.uid())
  );
CREATE POLICY "Workspace owner can delete members" ON public.workspace_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_user_id = auth.uid())
  );

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Leads
-- ============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT,
  stage TEXT,
  status TEXT DEFAULT 'imported',
  lead_value NUMERIC,
  last_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  no_show_flag BOOLEAN DEFAULT false,
  closed_lost_reason TEXT,
  notes TEXT,
  do_not_contact BOOLEAN DEFAULT false,
  consent_status TEXT DEFAULT 'unknown',
  jurisdiction TEXT,
  revival_score INTEGER,
  revival_bucket public.revival_bucket,
  best_angle TEXT,
  best_channel TEXT,
  risk_flag TEXT,
  suggested_cta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace leads" ON public.leads
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace leads" ON public.leads
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace leads" ON public.leads
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace leads" ON public.leads
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_leads_workspace ON public.leads(workspace_id);
CREATE INDEX idx_leads_revival_bucket ON public.leads(workspace_id, revival_bucket);
CREATE INDEX idx_leads_email ON public.leads(workspace_id, email);
CREATE INDEX idx_leads_score ON public.leads(workspace_id, revival_score DESC);

-- ============================================
-- Playbooks
-- ============================================
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  tone TEXT DEFAULT 'friendly',
  cta TEXT DEFAULT 'book_call',
  channels JSONB DEFAULT '["email"]'::jsonb,
  prompt_template TEXT,
  sequence_json JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace playbooks" ON public.playbooks
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace playbooks" ON public.playbooks
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace playbooks" ON public.playbooks
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace playbooks" ON public.playbooks
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- Campaigns
-- ============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,
  playbook_type TEXT,
  segment_json JSONB,
  channels_json JSONB DEFAULT '["email"]'::jsonb,
  offer_json JSONB,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  lead_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace campaigns" ON public.campaigns
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace campaigns" ON public.campaigns
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- Messages
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  channel public.message_channel NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  ai_rationale TEXT,
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace messages" ON public.messages
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace messages" ON public.messages
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace messages" ON public.messages
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace messages" ON public.messages
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_messages_approval ON public.messages(workspace_id, approval_status);
CREATE INDEX idx_messages_campaign ON public.messages(campaign_id);

-- ============================================
-- Bookings
-- ============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  booked_at TIMESTAMPTZ,
  estimated_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace bookings" ON public.bookings
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace bookings" ON public.bookings
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- Activity Logs
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace activity" ON public.activity_logs
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace activity" ON public.activity_logs
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_activity_logs_workspace ON public.activity_logs(workspace_id, created_at DESC);

-- ============================================
-- Suppressions
-- ============================================
CREATE TABLE public.suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  jurisdiction TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, lead_id)
);
ALTER TABLE public.suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace suppressions" ON public.suppressions
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace suppressions" ON public.suppressions
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace suppressions" ON public.suppressions
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace suppressions" ON public.suppressions
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Auto-create profile + workspace on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Create default workspace
  INSERT INTO public.workspaces (name, owner_user_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add owner as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'admin');

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
