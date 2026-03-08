ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_json jsonb DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone DEFAULT NULL;