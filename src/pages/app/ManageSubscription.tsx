import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, CreditCard, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  paypal_subscription_id: string | null;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  current_period_end: string | null;
  workspace_id: string;
}

export default function ManageSubscription() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    if (!user || !currentWorkspace) return;
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", currentWorkspace.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub(data as Subscription | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, currentWorkspace?.id]);

  const cancel = async () => {
    if (!sub?.paypal_subscription_id) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("paypal-manage-subscription", {
      body: { action: "cancel", subscription_id: sub.paypal_subscription_id },
    });
    setWorking(false);
    if (error) return toast.error("Could not cancel subscription");
    toast.success("Subscription cancelled");
    load();
  };

  const changeCycle = async () => {
    if (!sub?.paypal_subscription_id) return;
    const next = sub.billing_cycle === "monthly" ? "annual" : "monthly";
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("paypal-manage-subscription", {
      body: { action: "change_cycle", subscription_id: sub.paypal_subscription_id, new_billing_cycle: next },
    });
    setWorking(false);
    if (error) return toast.error("Could not change billing cycle");
    toast.success(`Switched to ${next} billing`);
    if (data?.approval_url) window.location.href = data.approval_url;
    else load();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Subscription</h1>
        <p className="text-muted-foreground">View your current plan and manage billing.</p>
      </div>

      {!sub ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> No active subscription
            </CardTitle>
            <CardDescription>You're currently on the Free plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/checkout?plan=growth">Upgrade plan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{sub.plan_name} plan</CardTitle>
                <CardDescription>
                  ${Number(sub.amount).toFixed(2)} {sub.currency} / {sub.billing_cycle === "monthly" ? "month" : "year"}
                </CardDescription>
              </div>
              <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                {sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Billed via PayPal
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {sub.current_period_end
                  ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`
                  : `${sub.billing_cycle === "monthly" ? "Monthly" : "Annual"} billing`}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={changeCycle} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Switch to {sub.billing_cycle === "monthly" ? "annual" : "monthly"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={working}>Cancel subscription</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your {sub.plan_name} subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll lose access to paid features at the end of your current billing period.
                      Your workspace will revert to the Free plan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={cancel}>Yes, cancel</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Need to change plans? <Link to="/checkout?plan=growth" className="underline">View pricing</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
