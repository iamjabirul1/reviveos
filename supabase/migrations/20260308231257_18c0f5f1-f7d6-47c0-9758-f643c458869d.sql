-- Fix 1: RESTRICTIVE policies - recreate all as PERMISSIVE (default)
-- Drop and recreate all RLS policies without RESTRICTIVE clause

-- activity_logs
DROP POLICY IF EXISTS "Members can insert workspace activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Members can view workspace activity" ON public.activity_logs;
CREATE POLICY "Members can insert workspace activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace activity" ON public.activity_logs FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- ai_usage_log
DROP POLICY IF EXISTS "Members can insert workspace ai usage" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Members can view workspace ai usage" ON public.ai_usage_log;
CREATE POLICY "Members can insert workspace ai usage" ON public.ai_usage_log FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace ai usage" ON public.ai_usage_log FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- bookings
DROP POLICY IF EXISTS "Members can insert workspace bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members can view workspace bookings" ON public.bookings;
CREATE POLICY "Members can insert workspace bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace bookings" ON public.bookings FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- campaigns
DROP POLICY IF EXISTS "Members can delete workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can insert workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can update workspace campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Members can view workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can delete workspace campaigns" ON public.campaigns FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace campaigns" ON public.campaigns FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- leads
DROP POLICY IF EXISTS "Members can delete workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can insert workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can update workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Members can view workspace leads" ON public.leads;
CREATE POLICY "Members can delete workspace leads" ON public.leads FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace leads" ON public.leads FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace leads" ON public.leads FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- messages
DROP POLICY IF EXISTS "Members can delete workspace messages" ON public.messages;
DROP POLICY IF EXISTS "Members can insert workspace messages" ON public.messages;
DROP POLICY IF EXISTS "Members can update workspace messages" ON public.messages;
DROP POLICY IF EXISTS "Members can view workspace messages" ON public.messages;
CREATE POLICY "Members can delete workspace messages" ON public.messages FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace messages" ON public.messages FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace messages" ON public.messages FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- notification_preferences
DROP POLICY IF EXISTS "Users can insert own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification prefs" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification prefs" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notification prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- playbooks
DROP POLICY IF EXISTS "Members can delete workspace playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Members can insert workspace playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Members can update workspace playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Members can view workspace playbooks" ON public.playbooks;
CREATE POLICY "Members can delete workspace playbooks" ON public.playbooks FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace playbooks" ON public.playbooks FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace playbooks" ON public.playbooks FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace playbooks" ON public.playbooks FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- subscriptions (SELECT only - INSERT/UPDATE removed for security)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- suppressions
DROP POLICY IF EXISTS "Members can delete workspace suppressions" ON public.suppressions;
DROP POLICY IF EXISTS "Members can insert workspace suppressions" ON public.suppressions;
DROP POLICY IF EXISTS "Members can update workspace suppressions" ON public.suppressions;
DROP POLICY IF EXISTS "Members can view workspace suppressions" ON public.suppressions;
CREATE POLICY "Members can delete workspace suppressions" ON public.suppressions FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace suppressions" ON public.suppressions FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update workspace suppressions" ON public.suppressions FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can view workspace suppressions" ON public.suppressions FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- workspace_members
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can update members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members" ON public.workspace_members FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace owner can delete members" ON public.workspace_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_user_id = auth.uid()));
CREATE POLICY "Workspace owner can manage members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_user_id = auth.uid()));
-- Fix 2: Add WITH CHECK to prevent workspace_id manipulation
CREATE POLICY "Workspace owner can update members" ON public.workspace_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_user_id = auth.uid()));

-- workspaces
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owner can update workspace safe fields" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Members can view their workspaces" ON public.workspaces FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner can delete workspace" ON public.workspaces FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owner can update workspace safe fields" ON public.workspaces FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id AND plan = (SELECT w.plan FROM public.workspaces w WHERE w.id = workspaces.id) AND ai_suspended = (SELECT w.ai_suspended FROM public.workspaces w WHERE w.id = workspaces.id) AND ai_suspended_at IS NOT DISTINCT FROM (SELECT w.ai_suspended_at FROM public.workspaces w WHERE w.id = workspaces.id) AND ai_suspended_reason IS NOT DISTINCT FROM (SELECT w.ai_suspended_reason FROM public.workspaces w WHERE w.id = workspaces.id));