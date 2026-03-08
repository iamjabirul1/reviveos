-- Fix: Restrict workspace owners from modifying plan and ai_suspended fields
-- Replace the unrestricted UPDATE policy with one that prevents changing sensitive columns
DROP POLICY IF EXISTS "Owner can update workspace" ON public.workspaces;

-- Allow owners to update only safe columns (name, business_context, onboarding_completed)
-- by adding a WITH CHECK that ensures plan and ai_suspended fields haven't changed
CREATE POLICY "Owner can update workspace safe fields" ON public.workspaces
FOR UPDATE TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (
  auth.uid() = owner_user_id
  AND plan = (SELECT w.plan FROM public.workspaces w WHERE w.id = workspaces.id)
  AND ai_suspended = (SELECT w.ai_suspended FROM public.workspaces w WHERE w.id = workspaces.id)
  AND ai_suspended_at IS NOT DISTINCT FROM (SELECT w.ai_suspended_at FROM public.workspaces w WHERE w.id = workspaces.id)
  AND ai_suspended_reason IS NOT DISTINCT FROM (SELECT w.ai_suspended_reason FROM public.workspaces w WHERE w.id = workspaces.id)
);