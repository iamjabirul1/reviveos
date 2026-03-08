import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    // Validate required fields
    const { workspace_id, event_type } = payload;
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle different CRM event types
    switch (event_type || source) {
      case "contact_updated":
      case "deal_updated":
      case "hubspot":
      case "gohighlevel": {
        // Upsert lead from CRM data
        const leadData = {
          workspace_id,
          first_name: payload.first_name || payload.firstName || null,
          last_name: payload.last_name || payload.lastName || null,
          email: payload.email || null,
          phone: payload.phone || null,
          company: payload.company || payload.companyName || null,
          source: source || "crm_webhook",
          stage: payload.stage || payload.dealStage || null,
          status: payload.status || "imported",
          lead_value: payload.deal_value || payload.monetary_value || null,
          closed_lost_reason: payload.closed_reason || payload.lost_reason || null,
          notes: payload.notes || null,
          last_activity_at: payload.last_activity_at || new Date().toISOString(),
        };

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
          await supabase
            .from("leads")
            .update(leadData)
            .eq("id", existingLead.id);
        } else {
          await supabase.from("leads").insert(leadData);
        }

        // Log the webhook event
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

      case "booking_created": {
        // Create a booking record
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

        // Update lead status
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
        // Mark a message as replied
        const { message_id, lead_email } = payload;

        if (message_id) {
          await supabase
            .from("messages")
            .update({ replied_at: new Date().toISOString() })
            .eq("id", message_id);
        } else if (lead_email) {
          // Find most recent sent message for this lead
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
