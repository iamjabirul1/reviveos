-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paypal_subscription_id text UNIQUE,
  paypal_plan_id text,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.paypal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  paypal_product_id text,
  paypal_plan_id_monthly text,
  paypal_plan_id_annual text,
  price_monthly numeric NOT NULL,
  price_annual numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view paypal plans"
  ON public.paypal_plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();