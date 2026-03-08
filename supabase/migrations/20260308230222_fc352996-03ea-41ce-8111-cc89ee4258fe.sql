-- Fix security definer view - use security invoker instead
CREATE OR REPLACE VIEW public.paypal_plans_public 
WITH (security_invoker = true) AS
SELECT id, plan_name, price_monthly, price_annual, created_at
FROM public.paypal_plans;