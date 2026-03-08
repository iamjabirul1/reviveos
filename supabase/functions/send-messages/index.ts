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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, workspace_id } = await req.json();
    if (!campaign_id || !workspace_id) {
      throw new Error("campaign_id and workspace_id are required");
    }

    // Fetch approved messages for this campaign that haven't been sent yet
    const { data: messages, error: fetchError } = await supabase
      .from("messages")
      .select("*, leads!inner(email, first_name, last_name)")
      .eq("campaign_id", campaign_id)
      .eq("workspace_id", workspace_id)
      .eq("approval_status", "approved")
      .eq("channel", "email")
      .is("sent_at", null);

    if (fetchError) throw fetchError;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No approved unsent messages found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      const leadEmail = (msg as any).leads?.email;
      if (!leadEmail) {
        failCount++;
        errors.push(`Lead ${msg.lead_id}: no email address`);
        continue;
      }

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ReviveOS <noreply@reviveos.com>",
            to: [leadEmail],
            subject: msg.subject || "Quick follow-up",
            text: msg.body,
          }),
        });

        if (resendResponse.ok) {
          // Mark as sent
          await supabase
            .from("messages")
            .update({ sent_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
            .eq("id", msg.id);
          sentCount++;
        } else {
          const errBody = await resendResponse.text();
          failCount++;
          errors.push(`Lead ${msg.lead_id}: Resend error — ${errBody}`);
        }
      } catch (sendErr) {
        failCount++;
        errors.push(`Lead ${msg.lead_id}: ${sendErr instanceof Error ? sendErr.message : "Unknown send error"}`);
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      workspace_id,
      event_type: "campaign_sent",
      payload_json: { campaign_id, sent: sentCount, failed: failCount, errors: errors.slice(0, 10) },
    });

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failCount, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-messages error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
