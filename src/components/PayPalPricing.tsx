import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PayPalPlan {
  plan_name: string;
  paypal_plan_id_monthly: string;
  paypal_plan_id_annual: string;
  price_monthly: number;
  price_annual: number;
}

interface PayPalSubscribeButtonProps {
  planName: string;
  billingCycle: "monthly" | "annual";
  plans: PayPalPlan[];
  onSetupRequired: () => void;
}

export function PayPalSubscribeButton({ planName, billingCycle, plans, onSetupRequired }: PayPalSubscribeButtonProps) {
  const navigate = useNavigate();
  const plan = plans.find((p) => p.plan_name === planName);

  if (!plan) {
    return (
      <button
        onClick={onSetupRequired}
        className="w-full text-sm text-muted-foreground underline"
      >
        Setup PayPal plans first
      </button>
    );
  }

  const planId = billingCycle === "monthly" ? plan.paypal_plan_id_monthly : plan.paypal_plan_id_annual;

  return (
    <PayPalButtons
      style={{
        shape: "rect",
        color: "blue",
        layout: "vertical",
        label: "subscribe",
      }}
      createSubscription={(_data, actions) => {
        return actions.subscription.create({
          plan_id: planId,
        });
      }}
      onApprove={async (data) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("Please log in to subscribe");
            navigate("/login");
            return;
          }

          // Get user's workspace
          const { data: members } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", session.user.id)
            .limit(1);

          const workspaceId = members?.[0]?.workspace_id;
          if (!workspaceId) {
            toast.error("No workspace found. Please complete onboarding first.");
            return;
          }

          const amount = billingCycle === "monthly" ? plan.price_monthly : plan.price_annual;

          const { error } = await supabase.functions.invoke("paypal-create-subscription", {
            body: {
              paypal_subscription_id: data.subscriptionID,
              plan_name: planName,
              paypal_plan_id: planId,
              workspace_id: workspaceId,
              amount,
              billing_cycle: billingCycle,
            },
          });

          if (error) throw error;

          toast.success(`Successfully subscribed to ${planName}!`);
          navigate("/app");
        } catch (err) {
          console.error("Subscription error:", err);
          toast.error("Failed to activate subscription. Please contact support.");
        }
      }}
      onError={(err) => {
        console.error("PayPal error:", err);
        toast.error("PayPal encountered an error. Please try again.");
      }}
    />
  );
}

interface PayPalPricingProviderProps {
  clientId: string;
  children: React.ReactNode;
}

export function PayPalPricingProvider({ clientId, children }: PayPalPricingProviderProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId,
        vault: true,
        intent: "subscription",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}

export function usePayPalPlans() {
  const [plans, setPlans] = useState<PayPalPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase
        .from("paypal_plans_public" as any)
        .select("*");

      if (!error && data) {
        setPlans(data as PayPalPlan[]);
      }
      setLoading(false);
    }
    fetchPlans();
  }, []);

  return { plans, loading };
}
