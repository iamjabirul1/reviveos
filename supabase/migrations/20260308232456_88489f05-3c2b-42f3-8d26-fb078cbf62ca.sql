-- Store workspace-level integration credentials
-- Credentials are stored as encrypted JSONB per provider
CREATE TABLE public.workspace_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'twilio', 'resend', 'whatsapp', 'hubspot', 'gohighlevel', 'shopify'
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

-- Only workspace members can view their integrations
CREATE POLICY "Members can view workspace integrations"
  ON public.workspace_integrations FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Only workspace owner can manage integrations
CREATE POLICY "Owner can insert workspace integrations"
  ON public.workspace_integrations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_integrations.workspace_id AND owner_user_id = auth.uid()));

CREATE POLICY "Owner can update workspace integrations"
  ON public.workspace_integrations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_integrations.workspace_id AND owner_user_id = auth.uid()));

CREATE POLICY "Owner can delete workspace integrations"
  ON public.workspace_integrations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_integrations.workspace_id AND owner_user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_workspace_integrations_updated_at
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();