import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`PayPal webhook event: ${eventType}`, JSON.stringify(resource));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const subscriptionId = resource?.id;
    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: "No subscription ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status: string;
    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        status = "active";
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
        status = "cancelled";
        break;
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        status = "suspended";
        break;
      case "BILLING.SUBSCRIPTION.EXPIRED":
        status = "expired";
        break;
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        status = "payment_failed";
        break;
      case "BILLING.SUBSCRIPTION.RENEWED":
        status = "active";
        break;
      case "BILLING.SUBSCRIPTION.CREATED":
        status = "pending";
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update subscription status
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status,
        current_period_start: resource.billing_info?.last_payment?.time || null,
        current_period_end: resource.billing_info?.next_billing_time || null,
      })
      .eq("paypal_subscription_id", subscriptionId);

    if (error) {
      console.error("Failed to update subscription:", error);
    }

    // If subscription activated, update workspace plan
    if (status === "active") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("workspace_id, plan_name")
        .eq("paypal_subscription_id", subscriptionId)
        .single();

      if (sub) {
        await supabase
          .from("workspaces")
          .update({ plan: sub.plan_name.toLowerCase() })
          .eq("id", sub.workspace_id);
      }
    }

    // If subscription cancelled/suspended/expired, downgrade workspace to free
    if (["cancelled", "suspended", "expired"].includes(status)) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("workspace_id")
        .eq("paypal_subscription_id", subscriptionId)
        .single();

      if (sub) {
        await supabase
          .from("workspaces")
          .update({ plan: "free" })
          .eq("id", sub.workspace_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
