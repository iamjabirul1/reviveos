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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { paypal_subscription_id, plan_name, paypal_plan_id, workspace_id, amount, billing_cycle } = await req.json();

    if (!paypal_subscription_id || !plan_name || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save subscription to database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cancel any existing active subscription for this workspace
    await serviceClient
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("workspace_id", workspace_id)
      .eq("status", "active");

    const { data, error } = await serviceClient.from("subscriptions").insert({
      user_id: userId,
      workspace_id,
      paypal_subscription_id,
      paypal_plan_id,
      plan_name,
      amount: amount || 0,
      billing_cycle: billing_cycle || "monthly",
      status: "active",
    }).select().single();

    if (error) throw new Error(`Failed to save subscription: ${error.message}`);

    // Update workspace plan
    await serviceClient
      .from("workspaces")
      .update({ plan: plan_name.toLowerCase() })
      .eq("id", workspace_id);

    return new Response(JSON.stringify({ success: true, subscription: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
