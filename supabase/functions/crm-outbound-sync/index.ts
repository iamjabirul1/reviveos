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

    const { workspace_id, lead_id, providers } = await req.json();
    if (!workspace_id || !lead_id) {
      throw new Error("workspace_id and lead_id are required");
    }

    // Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active CRM integrations for this workspace
    const { data: integrations } = await supabase
      .from("workspace_integrations")
      .select("provider, credentials, is_active")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    const activeIntegrations = (integrations || []).filter(
      (i) => ["hubspot", "gohighlevel", "shopify"].includes(i.provider)
    );

    // Optionally filter to specific providers
    const targetProviders = providers
      ? activeIntegrations.filter((i) => providers.includes(i.provider))
      : activeIntegrations;

    if (targetProviders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: [], message: "No active CRM integrations found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { provider: string; success: boolean; error?: string }[] = [];

    for (const integration of targetProviders) {
      const creds = integration.credentials as Record<string, string>;
      try {
        switch (integration.provider) {
          case "hubspot":
            results.push(await syncToHubSpot(lead, creds));
            break;
          case "gohighlevel":
            results.push(await syncToGoHighLevel(lead, creds));
            break;
          case "shopify":
            results.push(await syncToShopify(lead, creds));
            break;
          default:
            results.push({ provider: integration.provider, success: false, error: "Unknown provider" });
        }
      } catch (err) {
        results.push({
          provider: integration.provider,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      workspace_id,
      lead_id,
      user_id: user.id,
      event_type: "crm_outbound_sync",
      payload_json: { results },
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("crm-outbound-sync error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- HubSpot ---
async function syncToHubSpot(
  lead: Record<string, any>,
  creds: Record<string, string>
): Promise<{ provider: string; success: boolean; error?: string }> {
  const token = creds.api_key;
  if (!token) return { provider: "hubspot", success: false, error: "Missing API token" };

  const properties: Record<string, string> = {};
  if (lead.email) properties.email = lead.email;
  if (lead.first_name) properties.firstname = lead.first_name;
  if (lead.last_name) properties.lastname = lead.last_name;
  if (lead.phone) properties.phone = lead.phone;
  if (lead.company) properties.company = lead.company;
  if (lead.notes) properties.notes_last_contacted = lead.notes;
  if (lead.lead_value) properties.amount = String(lead.lead_value);
  if (lead.status) properties.hs_lead_status = lead.status;

  if (!lead.email) return { provider: "hubspot", success: false, error: "Lead has no email for HubSpot sync" };

  // Search for existing contact by email
  const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: lead.email }] }],
    }),
  });
  const searchData = await searchRes.json();

  if (searchData.total > 0) {
    // Update existing
    const contactId = searchData.results[0].id;
    const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    const body = await updateRes.text();
    return { provider: "hubspot", success: updateRes.ok, error: updateRes.ok ? undefined : body };
  } else {
    // Create new
    const createRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    const body = await createRes.text();
    return { provider: "hubspot", success: createRes.ok, error: createRes.ok ? undefined : body };
  }
}

// --- GoHighLevel ---
async function syncToGoHighLevel(
  lead: Record<string, any>,
  creds: Record<string, string>
): Promise<{ provider: string; success: boolean; error?: string }> {
  const apiKey = creds.api_key;
  const locationId = creds.location_id;
  if (!apiKey) return { provider: "gohighlevel", success: false, error: "Missing API key" };

  const contactPayload: Record<string, any> = {};
  if (lead.email) contactPayload.email = lead.email;
  if (lead.first_name) contactPayload.firstName = lead.first_name;
  if (lead.last_name) contactPayload.lastName = lead.last_name;
  if (lead.phone) contactPayload.phone = lead.phone;
  if (lead.company) contactPayload.companyName = lead.company;
  if (locationId) contactPayload.locationId = locationId;

  if (!lead.email && !lead.phone) {
    return { provider: "gohighlevel", success: false, error: "Lead needs email or phone for GHL sync" };
  }

  // Search by email
  if (lead.email) {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId || ""}&query=${encodeURIComponent(lead.email)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28" } }
    );
    const searchData = await searchRes.json();

    if (searchData.contacts?.length > 0) {
      const contactId = searchData.contacts[0].id;
      const updateRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-07-28" },
        body: JSON.stringify(contactPayload),
      });
      const body = await updateRes.text();
      return { provider: "gohighlevel", success: updateRes.ok, error: updateRes.ok ? undefined : body };
    }
  }

  // Create new
  const createRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-07-28" },
    body: JSON.stringify(contactPayload),
  });
  const body = await createRes.text();
  return { provider: "gohighlevel", success: createRes.ok, error: createRes.ok ? undefined : body };
}

// --- Shopify ---
async function syncToShopify(
  lead: Record<string, any>,
  creds: Record<string, string>
): Promise<{ provider: string; success: boolean; error?: string }> {
  const token = creds.access_token;
  const domain = creds.store_domain;
  if (!token || !domain) return { provider: "shopify", success: false, error: "Missing access token or store domain" };

  if (!lead.email) return { provider: "shopify", success: false, error: "Lead has no email for Shopify sync" };

  // Search for existing customer by email
  const searchRes = await fetch(
    `https://${domain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(lead.email)}`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const searchData = await searchRes.json();

  const customerPayload: Record<string, any> = {
    customer: {
      email: lead.email,
      first_name: lead.first_name || undefined,
      last_name: lead.last_name || undefined,
      phone: lead.phone || undefined,
      note: lead.notes || undefined,
      tags: `reviveos,${lead.status || ""}`.replace(/,$/, ""),
    },
  };

  if (searchData.customers?.length > 0) {
    const customerId = searchData.customers[0].id;
    const updateRes = await fetch(
      `https://${domain}/admin/api/2024-01/customers/${customerId}.json`,
      {
        method: "PUT",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify(customerPayload),
      }
    );
    const body = await updateRes.text();
    return { provider: "shopify", success: updateRes.ok, error: updateRes.ok ? undefined : body };
  } else {
    const createRes = await fetch(
      `https://${domain}/admin/api/2024-01/customers.json`,
      {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify(customerPayload),
      }
    );
    const body = await createRes.text();
    return { provider: "shopify", success: createRes.ok, error: createRes.ok ? undefined : body };
  }
}
