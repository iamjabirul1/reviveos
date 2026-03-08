
-- Usage tracking table for AI edge function calls per workspace
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS: members can view their workspace usage
CREATE POLICY "Members can view workspace ai usage"
  ON public.ai_usage_log FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- RLS: members can insert usage records
CREATE POLICY "Members can insert workspace ai usage"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Indexes
CREATE INDEX idx_ai_usage_log_workspace_id ON public.ai_usage_log(workspace_id);
CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log(created_at DESC);
CREATE INDEX idx_ai_usage_log_workspace_period ON public.ai_usage_log(workspace_id, created_at);

-- Rate limit check function (returns remaining calls allowed this period)
-- Plan limits: free=0, starter=0, growth=500/day, scale=2000/day
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _workspace_id uuid,
  _function_name text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _daily_limit integer;
  _used_today integer;
  _remaining integer;
BEGIN
  -- Get workspace plan
  SELECT plan INTO _plan FROM public.workspaces WHERE id = _workspace_id;
  
  -- Set daily limits per plan
  CASE _plan
    WHEN 'scale' THEN _daily_limit := 2000;
    WHEN 'growth' THEN _daily_limit := 500;
    WHEN 'starter' THEN _daily_limit := 50;
    WHEN 'free' THEN _daily_limit := 10;
    ELSE _daily_limit := 10;
  END CASE;
  
  -- Count usage today
  SELECT count(*) INTO _used_today
  FROM public.ai_usage_log
  WHERE workspace_id = _workspace_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  
  _remaining := GREATEST(0, _daily_limit - _used_today);
  
  RETURN jsonb_build_object(
    'allowed', _remaining > 0,
    'daily_limit', _daily_limit,
    'used_today', _used_today,
    'remaining', _remaining,
    'plan', _plan
  );
END;
$$;
