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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const source = url.searchParams.get("source") || "webhook";

    const payload = await req.json();

    const { workspace_id, event_type } = payload;
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (event_type || source) {
      case "contact_updated":
      case "deal_updated":
      case "hubspot":
      case "gohighlevel":
      case "highlevel":
      case "shopify":
      case "shopify_customer": {
        // Normalize fields from different CRM formats
        const leadData = mapCrmPayloadToLead(payload, source, workspace_id);

        // Check if lead exists by email
        let existingLead = null;
        if (leadData.email) {
          const { data } = await supabase
            .from("leads")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("email", leadData.email)
            .limit(1)
            .single();
          existingLead = data;
        }

        if (existingLead) {
          await supabase.from("leads").update(leadData).eq("id", existingLead.id);
        } else {
          await supabase.from("leads").insert(leadData);
        }

        await supabase.from("activity_logs").insert({
          workspace_id,
          event_type: `webhook_${event_type || source}`,
          payload_json: { source, email: leadData.email },
        });

        return new Response(
          JSON.stringify({ success: true, action: existingLead ? "updated" : "created" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "shopify_order": {
        // Shopify order → create/update lead + booking
        const customer = payload.customer || {};
        const email = customer.email || payload.email;
        const leadData = {
          workspace_id,
          first_name: customer.first_name || null,
          last_name: customer.last_name || null,
          email: email || null,
          phone: customer.phone || payload.phone || null,
          company: customer.company || payload.company || null,
          source: "shopify",
          status: "imported",
          lead_value: parseFloat(payload.total_price || payload.subtotal_price || "0") || null,
          last_activity_at: new Date().toISOString(),
        };

        let lead_id: string | null = null;
        if (email) {
          const { data } = await supabase
            .from("leads")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("email", email)
            .limit(1)
            .single();
          if (data) {
            lead_id = data.id;
            await supabase.from("leads").update(leadData).eq("id", lead_id);
          }
        }

        if (!lead_id) {
          const { data: newLead } = await supabase
            .from("leads")
            .insert(leadData)
            .select("id")
            .single();
          lead_id = newLead?.id || null;
        }

        if (lead_id) {
          await supabase.from("bookings").insert({
            workspace_id,
            lead_id,
            estimated_value: leadData.lead_value,
            booked_at: payload.created_at || new Date().toISOString(),
          });
        }

        await supabase.from("activity_logs").insert({
          workspace_id,
          lead_id,
          event_type: "webhook_shopify_order",
          payload_json: { source: "shopify", order_id: payload.id, total: payload.total_price },
        });

        return new Response(
          JSON.stringify({ success: true, action: "shopify_order_synced" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "booking_created": {
        const { lead_email, campaign_id, estimated_value, booked_at } = payload;
        let lead_id = payload.lead_id;
        if (!lead_id && lead_email) {
          const { data } = await supabase
            .from("leads")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("email", lead_email)
            .limit(1)
            .single();
          lead_id = data?.id;
        }

        if (!lead_id) {
          return new Response(
            JSON.stringify({ error: "Could not resolve lead" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase.from("bookings").insert({
          workspace_id,
          lead_id,
          campaign_id: campaign_id || null,
          estimated_value: estimated_value || null,
          booked_at: booked_at || new Date().toISOString(),
        });

        await supabase
          .from("leads")
          .update({ status: "booked", last_activity_at: new Date().toISOString() })
          .eq("id", lead_id);

        await supabase.from("activity_logs").insert({
          workspace_id,
          lead_id,
          event_type: "booking_created",
          payload_json: { source, estimated_value },
        });

        return new Response(
          JSON.stringify({ success: true, action: "booking_created" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reply_received": {
        const { message_id, lead_email } = payload;

        if (message_id) {
          await supabase
            .from("messages")
            .update({ replied_at: new Date().toISOString() })
            .eq("id", message_id);
        } else if (lead_email) {
          const { data: lead } = await supabase
            .from("leads")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("email", lead_email)
            .limit(1)
            .single();

          if (lead) {
            const { data: msg } = await supabase
              .from("messages")
              .select("id")
              .eq("lead_id", lead.id)
              .not("sent_at", "is", null)
              .is("replied_at", null)
              .order("sent_at", { ascending: false })
              .limit(1)
              .single();

            if (msg) {
              await supabase
                .from("messages")
                .update({ replied_at: new Date().toISOString() })
                .eq("id", msg.id);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, action: "reply_tracked" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (e) {
    console.error("crm-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Normalize CRM payloads from HubSpot, GoHighLevel, Shopify into a unified lead format.
 */
function mapCrmPayloadToLead(payload: any, source: string, workspace_id: string) {
  // Shopify customer format
  if (source === "shopify" || payload.event_type === "shopify_customer" || payload.event_type === "shopify") {
    const customer = payload.customer || payload;
    return {
      workspace_id,
      first_name: customer.first_name || null,
      last_name: customer.last_name || null,
      email: customer.email || payload.email || null,
      phone: customer.phone || payload.phone || null,
      company: customer.company || (customer.default_address?.company) || null,
      source: "shopify",
      stage: payload.stage || null,
      status: payload.status || "imported",
      lead_value: customer.total_spent ? parseFloat(customer.total_spent) : (payload.deal_value || null),
      notes: customer.note || payload.notes || null,
      last_activity_at: payload.updated_at || new Date().toISOString(),
    };
  }

  // GoHighLevel format
  if (source === "gohighlevel" || source === "highlevel" || payload.event_type === "gohighlevel" || payload.event_type === "highlevel") {
    return {
      workspace_id,
      first_name: payload.first_name || payload.firstName || payload.contact?.firstName || null,
      last_name: payload.last_name || payload.lastName || payload.contact?.lastName || null,
      email: payload.email || payload.contact?.email || null,
      phone: payload.phone || payload.contact?.phone || null,
      company: payload.company || payload.companyName || payload.contact?.companyName || null,
      source: "gohighlevel",
      stage: payload.stage || payload.pipelineStage || payload.opportunity?.stage || null,
      status: payload.status || "imported",
      lead_value: payload.deal_value || payload.monetary_value || payload.opportunity?.monetaryValue || null,
      closed_lost_reason: payload.closed_reason || payload.lost_reason || null,
      notes: payload.notes || null,
      last_activity_at: payload.last_activity_at || payload.dateUpdated || new Date().toISOString(),
    };
  }

  // HubSpot / generic format
  return {
    workspace_id,
    first_name: payload.first_name || payload.firstName || payload.properties?.firstname || null,
    last_name: payload.last_name || payload.lastName || payload.properties?.lastname || null,
    email: payload.email || payload.properties?.email || null,
    phone: payload.phone || payload.properties?.phone || null,
    company: payload.company || payload.companyName || payload.properties?.company || null,
    source: source || "crm_webhook",
    stage: payload.stage || payload.dealStage || payload.properties?.dealstage || null,
    status: payload.status || "imported",
    lead_value: payload.deal_value || payload.monetary_value || payload.properties?.amount || null,
    closed_lost_reason: payload.closed_reason || payload.lost_reason || payload.properties?.closed_lost_reason || null,
    notes: payload.notes || payload.properties?.notes_last_contacted || null,
    last_activity_at: payload.last_activity_at || payload.properties?.notes_last_updated || new Date().toISOString(),
  };
}
