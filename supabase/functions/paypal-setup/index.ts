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

async function createProduct(token: string): Promise<string> {
  const res = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "ReviveOS Subscription",
      description: "ReviveOS AI-powered revenue recovery platform",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create product failed: ${JSON.stringify(data)}`);
  return data.id;
}

async function createPlan(
  token: string,
  productId: string,
  name: string,
  price: number,
  interval: "MONTH" | "YEAR"
): Promise<string> {
  const res = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      name: `ReviveOS ${name} (${interval === "MONTH" ? "Monthly" : "Annual"})`,
      billing_cycles: [
        {
          frequency: { interval_unit: interval, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: price.toString(), currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create plan failed: ${JSON.stringify(data)}`);
  return data.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
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

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();
    const productId = await createProduct(accessToken);

    const plans = [
      { name: "Starter", priceMonthly: 39, priceAnnual: 31 * 12 },
      { name: "Growth", priceMonthly: 79, priceAnnual: 63 * 12 },
      { name: "Scale", priceMonthly: 99, priceAnnual: 79 * 12 },
    ];

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results = [];
    for (const plan of plans) {
      const monthlyPlanId = await createPlan(accessToken, productId, plan.name, plan.priceMonthly, "MONTH");
      const annualPlanId = await createPlan(accessToken, productId, plan.name, plan.priceAnnual, "YEAR");

      const { error } = await serviceClient.from("paypal_plans").insert({
        plan_name: plan.name,
        paypal_product_id: productId,
        paypal_plan_id_monthly: monthlyPlanId,
        paypal_plan_id_annual: annualPlanId,
        price_monthly: plan.priceMonthly,
        price_annual: plan.priceAnnual / 12,
      });

      if (error) throw new Error(`DB insert failed: ${error.message}`);
      results.push({ name: plan.name, monthlyPlanId, annualPlanId });
    }

    return new Response(JSON.stringify({ success: true, plans: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PayPal setup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
