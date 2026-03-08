-- 1. CRITICAL: Remove INSERT and UPDATE RLS policies from subscriptions
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

-- 2. Secure PayPal plan IDs: Create a safe public view
CREATE OR REPLACE VIEW public.paypal_plans_public AS
SELECT id, plan_name, price_monthly, price_annual, created_at
FROM public.paypal_plans;

GRANT SELECT ON public.paypal_plans_public TO anon, authenticated;