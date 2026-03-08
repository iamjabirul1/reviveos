
-- Add AI suspension fields to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN ai_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_suspended_at timestamp with time zone,
  ADD COLUMN ai_suspended_reason text;

-- Update rate limit function to check suspension
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
  _suspended boolean;
  _suspended_reason text;
  _daily_limit integer;
  _used_today integer;
  _remaining integer;
BEGIN
  SELECT plan, ai_suspended, ai_suspended_reason
    INTO _plan, _suspended, _suspended_reason
    FROM public.workspaces WHERE id = _workspace_id;

  IF _suspended THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'suspended', true,
      'reason', COALESCE(_suspended_reason, 'AI access has been suspended. Contact support.'),
      'daily_limit', 0,
      'used_today', 0,
      'remaining', 0,
      'plan', _plan
    );
  END IF;

  CASE _plan
    WHEN 'scale' THEN _daily_limit := 2000;
    WHEN 'growth' THEN _daily_limit := 500;
    WHEN 'starter' THEN _daily_limit := 50;
    WHEN 'free' THEN _daily_limit := 10;
    ELSE _daily_limit := 10;
  END CASE;

  SELECT count(*) INTO _used_today
  FROM public.ai_usage_log
  WHERE workspace_id = _workspace_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  _remaining := GREATEST(0, _daily_limit - _used_today);

  RETURN jsonb_build_object(
    'allowed', _remaining > 0,
    'suspended', false,
    'daily_limit', _daily_limit,
    'used_today', _used_today,
    'remaining', _remaining,
    'plan', _plan
  );
END;
$$;
