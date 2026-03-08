ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS business_context jsonb DEFAULT NULL;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;