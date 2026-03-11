
-- Table 1: message_outcomes — tracks win/loss feedback per message
CREATE TABLE public.message_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL DEFAULT 'pending',
  tone_used TEXT,
  cta_used TEXT,
  angle_used TEXT,
  subject_used TEXT,
  channel TEXT DEFAULT 'email',
  replied BOOLEAN DEFAULT false,
  booked BOOLEAN DEFAULT false,
  deal_won BOOLEAN DEFAULT false,
  revenue_amount NUMERIC DEFAULT 0,
  variant_label TEXT DEFAULT 'A',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace message outcomes" ON public.message_outcomes
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace message outcomes" ON public.message_outcomes
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace message outcomes" ON public.message_outcomes
  FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- Table 2: workspace_ai_insights — learned patterns per workspace
CREATE TABLE public.workspace_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  insight_key TEXT NOT NULL,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  avg_revenue NUMERIC DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(workspace_id, insight_type, insight_key)
);

ALTER TABLE public.workspace_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace ai insights" ON public.workspace_ai_insights
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace ai insights" ON public.workspace_ai_insights
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace ai insights" ON public.workspace_ai_insights
  FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- Add variant_label to messages table for A/B tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS variant_label TEXT DEFAULT 'A';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC DEFAULT NULL;
