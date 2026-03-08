
-- ===========================================
-- 1. Add updated_at triggers to key tables
-- ===========================================

-- Leads table trigger
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles table trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriptions table trigger
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 2. Performance indexes on foreign key columns
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_revival_bucket ON public.leads(revival_bucket);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON public.messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON public.messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_approval_status ON public.messages(approval_status);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON public.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_playbook_id ON public.campaigns(playbook_id);

CREATE INDEX IF NOT EXISTS idx_playbooks_workspace_id ON public.playbooks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_id ON public.activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_workspace_id ON public.bookings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON public.bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON public.bookings(campaign_id);

CREATE INDEX IF NOT EXISTS idx_suppressions_workspace_id ON public.suppressions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppressions_lead_id ON public.suppressions(lead_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ===========================================
-- 3. PayPal webhook: downgrade plan on cancel
-- Handled in paypal-webhook edge function already
-- ===========================================

-- 4. Add NOT NULL constraint validation via trigger for workspace_id references
CREATE OR REPLACE FUNCTION public.validate_workspace_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'Invalid workspace_id: %', NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply validation to tables that don't have FK constraints enforced at insert time
CREATE TRIGGER validate_activity_log_workspace
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_workspace_member();
