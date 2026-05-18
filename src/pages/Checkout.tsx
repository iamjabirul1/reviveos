import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, ArrowLeft } from "lucide-react";
import { PayPalPricingProvider, PayPalSubscribeButton, usePayPalPlans } from "@/components/PayPalPricing";
import { toast } from "sonner";

function Inner({ planName, cycle }: { planName: string; cycle: "monthly" | "annual" }) {
  const { plans, loading } = usePayPalPlans();
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto" />;
  const plan = plans.find((p) => p.plan_name.toLowerCase() === planName.toLowerCase());
  if (!plan) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Checkout is not yet configured for the {planName} plan. Please contact support.
      </p>
    );
  }
  return (
    <PayPalSubscribeButton
      planName={plan.plan_name}
      billingCycle={cycle}
      plans={plans}
      onSetupRequired={() => toast.error("PayPal plans not configured yet")}
    />
  );
}

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const planRaw = (searchParams.get("plan") || "growth").toLowerCase();
  const cycle = (searchParams.get("cycle") as "monthly" | "annual") || "monthly";
  const planName = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);

  const [clientId, setClientId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("paypal-config").then(({ data, error }) => {
      if (error || !data?.clientId) {
        setConfigError(error?.message || "PayPal is not configured yet.");
      } else {
        setClientId(data.clientId);
      }
    });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/signup?plan=${planRaw}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">ReviveOS</span>
          </div>
          <CardTitle>Checkout · {planName}</CardTitle>
          <CardDescription>
            Subscribe with PayPal to activate your {planName} plan ({cycle}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError ? (
            <p className="text-sm text-destructive text-center">{configError}</p>
          ) : !clientId ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <PayPalPricingProvider clientId={clientId}>
              <Inner planName={planName} cycle={cycle} />
            </PayPalPricingProvider>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to="/app">
              <ArrowLeft className="h-4 w-4 mr-2" /> Skip for now
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
