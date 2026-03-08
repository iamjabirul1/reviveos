-- Remove public access to base paypal_plans table - use the view instead
DROP POLICY IF EXISTS "Anyone can view paypal plans" ON public.paypal_plans;