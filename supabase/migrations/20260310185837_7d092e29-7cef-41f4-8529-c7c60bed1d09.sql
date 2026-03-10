
-- Deal outcomes table for revenue attribution
CREATE TABLE public.deal_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL DEFAULT 'open', -- open, won, lost
  revenue_amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.deal_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace deal outcomes" ON public.deal_outcomes
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace deal outcomes" ON public.deal_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update workspace deal outcomes" ON public.deal_outcomes
  FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace deal outcomes" ON public.deal_outcomes
  FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Updated at trigger
CREATE TRIGGER update_deal_outcomes_updated_at
  BEFORE UPDATE ON public.deal_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for deal_outcomes
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_outcomes;
