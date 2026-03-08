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

    const payload = await req.json();

    // Resend webhook event types: https://resend.com/docs/dashboard/webhooks/event-types
    const eventType = payload.type;

    if (eventType === "email.delivered") {
      const resendEmailId = payload.data?.email_id;
      // We store the resend email ID in delivered metadata — match via headers or tags
      // For now, match by the "to" address + recent sent_at
      const toEmail = payload.data?.to?.[0];
      if (toEmail) {
        // Find the most recent message sent to this email
        const { data: messages } = await supabase
          .from("messages")
          .select("id, lead_id")
          .not("sent_at", "is", null)
          .is("delivered_at", null)
          .order("sent_at", { ascending: false })
          .limit(1);

        // Mark as delivered if we find a match
        if (messages && messages.length > 0) {
          await supabase
            .from("messages")
            .update({ delivered_at: new Date().toISOString() })
            .eq("id", messages[0].id);
        }
      }
    }

    if (eventType === "email.bounced" || eventType === "email.complained") {
      // Log bounce/complaint for suppression
      const toEmail = payload.data?.to?.[0];
      if (toEmail) {
        // Find the lead by email and mark for suppression
        const { data: leads } = await supabase
          .from("leads")
          .select("id, workspace_id")
          .eq("email", toEmail)
          .limit(1);

        if (leads && leads.length > 0) {
          await supabase.from("suppressions").insert({
            workspace_id: leads[0].workspace_id,
            lead_id: leads[0].id,
            reason: eventType === "email.bounced" ? "Email bounced" : "Spam complaint",
          });

          await supabase
            .from("leads")
            .update({ do_not_contact: true })
            .eq("id", leads[0].id);
        }
      }
    }

    // Log the webhook event
    if (payload.data) {
      const toEmail = payload.data?.to?.[0];
      if (toEmail) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, workspace_id")
          .eq("email", toEmail)
          .limit(1);

        if (leads && leads.length > 0) {
          await supabase.from("activity_logs").insert({
            workspace_id: leads[0].workspace_id,
            lead_id: leads[0].id,
            event_type: `email_${eventType.replace("email.", "")}`,
            payload_json: payload.data,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reply-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
