-- 1) Failed delivery tracking on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS send_error text,
  ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- 2) Lead magnets (public roadmap funnels)
CREATE TABLE IF NOT EXISTS public.lead_magnets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  headline text,
  subhead text,
  questions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_prompt text NOT NULL DEFAULT '',
  cta_label text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workspace lead magnets"
  ON public.lead_magnets FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Public can view active lead magnets"
  ON public.lead_magnets FOR SELECT TO anon
  USING (is_active = true);

CREATE TRIGGER lead_magnets_updated_at
  BEFORE UPDATE ON public.lead_magnets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Lead magnet submissions
CREATE TABLE IF NOT EXISTS public.lead_magnet_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  magnet_id uuid NOT NULL REFERENCES public.lead_magnets(id) ON DELETE CASCADE,
  lead_id uuid,
  share_slug text NOT NULL UNIQUE,
  name text,
  email text NOT NULL,
  phone text,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_html text,
  report_summary text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_magnet_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace submissions"
  ON public.lead_magnet_submissions FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members update workspace submissions"
  ON public.lead_magnet_submissions FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members delete workspace submissions"
  ON public.lead_magnet_submissions FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Public can insert submissions"
  ON public.lead_magnet_submissions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view submission by share_slug"
  ON public.lead_magnet_submissions FOR SELECT TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_lm_submissions_magnet ON public.lead_magnet_submissions(magnet_id);
CREATE INDEX IF NOT EXISTS idx_lm_submissions_workspace ON public.lead_magnet_submissions(workspace_id);

CREATE TRIGGER lead_magnet_submissions_updated_at
  BEFORE UPDATE ON public.lead_magnet_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();