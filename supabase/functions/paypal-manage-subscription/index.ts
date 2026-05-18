import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API = "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secretKey = Deno.env.get("PAYPAL_SECRET_KEY")!;
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, subscription_id, new_billing_cycle, reason } = await req.json();
    if (!action || !subscription_id) {
      return new Response(JSON.stringify({ error: "Missing action or subscription_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify ownership
    const { data: sub, error: subErr } = await service
      .from("subscriptions")
      .select("*")
      .eq("paypal_subscription_id", subscription_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getPayPalAccessToken();

    if (action === "cancel") {
      const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "User requested cancellation" }),
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.text();
        throw new Error(`PayPal cancel failed: ${err}`);
      }
      await service.from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      await service.from("workspaces").update({ plan: "free" }).eq("id", sub.workspace_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_cycle") {
      if (new_billing_cycle !== "monthly" && new_billing_cycle !== "annual") {
        return new Response(JSON.stringify({ error: "Invalid billing cycle" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (new_billing_cycle === sub.billing_cycle) {
        return new Response(JSON.stringify({ error: "Already on this billing cycle" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: planRow } = await service
        .from("paypal_plans")
        .select("*")
        .eq("plan_name", sub.plan_name)
        .maybeSingle();
      if (!planRow) throw new Error(`Plan ${sub.plan_name} not configured`);

      const newPlanId = new_billing_cycle === "monthly"
        ? planRow.paypal_plan_id_monthly
        : planRow.paypal_plan_id_annual;
      const newAmount = new_billing_cycle === "monthly"
        ? planRow.price_monthly
        : planRow.price_annual;

      const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}/revise`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: newPlanId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`PayPal revise failed: ${JSON.stringify(data)}`);

      const approvalUrl = (data.links || []).find((l: any) => l.rel === "approve")?.href || null;

      await service.from("subscriptions").update({
        billing_cycle: new_billing_cycle,
        paypal_plan_id: newPlanId,
        amount: newAmount,
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id);

      return new Response(JSON.stringify({ success: true, approval_url: approvalUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manage subscription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
