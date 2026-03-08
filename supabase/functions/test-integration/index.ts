import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, provider } = await req.json();
    if (!workspace_id || !provider) {
      throw new Error("workspace_id and provider are required");
    }

    // Fetch credentials
    const { data: integration, error: fetchErr } = await supabase
      .from("workspace_integrations")
      .select("credentials, is_active")
      .eq("workspace_id", workspace_id)
      .eq("provider", provider)
      .single();

    if (fetchErr || !integration) {
      return new Response(JSON.stringify({ success: false, error: "Integration not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = integration.credentials as Record<string, string>;

    switch (provider) {
      case "twilio":
      case "whatsapp": {
        const sid = creds.account_sid;
        const token = creds.auth_token;
        if (!sid || !token) {
          return new Response(JSON.stringify({ success: false, error: "Missing Account SID or Auth Token" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
        });
        const body = await res.text();

        if (res.ok) {
          return new Response(JSON.stringify({ success: true, message: "Twilio connection verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: `Twilio error: ${res.status}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "resend": {
        const apiKey = creds.api_key;
        if (!apiKey) {
          return new Response(JSON.stringify({ success: false, error: "Missing API key" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const body = await res.text();

        if (res.ok) {
          return new Response(JSON.stringify({ success: true, message: "Resend connection verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: `Resend error: ${res.status}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "hubspot": {
        const token = creds.api_key;
        if (!token) {
          return new Response(JSON.stringify({ success: false, error: "Missing API token" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.text();

        return new Response(JSON.stringify({
          success: res.ok,
          message: res.ok ? "HubSpot connection verified" : `HubSpot error: ${res.status}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "gohighlevel": {
        const apiKey = creds.api_key;
        if (!apiKey) {
          return new Response(JSON.stringify({ success: false, error: "Missing API key" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await fetch("https://rest.gohighlevel.com/v1/contacts/?limit=1", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const body = await res.text();

        return new Response(JSON.stringify({
          success: res.ok,
          message: res.ok ? "GoHighLevel connection verified" : `GHL error: ${res.status}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "shopify": {
        const token = creds.access_token;
        const domain = creds.store_domain;
        if (!token || !domain) {
          return new Response(JSON.stringify({ success: false, error: "Missing access token or store domain" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const res = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
          headers: { "X-Shopify-Access-Token": token },
        });
        const body = await res.text();

        return new Response(JSON.stringify({
          success: res.ok,
          message: res.ok ? "Shopify connection verified" : `Shopify error: ${res.status}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown provider: ${provider}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("test-integration error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
