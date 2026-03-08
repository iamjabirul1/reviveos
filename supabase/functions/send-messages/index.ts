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

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/email-tracking`;

    const { campaign_id, workspace_id } = await req.json();
    if (!campaign_id || !workspace_id) {
      throw new Error("campaign_id and workspace_id are required");
    }

    // Fetch ALL approved unsent messages (email + sms)
    const { data: messages, error: fetchError } = await supabase
      .from("messages")
      .select("*, leads!inner(email, phone, first_name, last_name)")
      .eq("campaign_id", campaign_id)
      .eq("workspace_id", workspace_id)
      .eq("approval_status", "approved")
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
      const lead = msg as any;
      const channel = msg.channel || "email";

      if (channel === "email") {
        if (!RESEND_API_KEY) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: RESEND_API_KEY not configured`);
          continue;
        }
        const leadEmail = lead.leads?.email;
        if (!leadEmail) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: no email address`);
          continue;
        }

        const openPixelUrl = `${trackingBaseUrl}?mid=${msg.id}&action=open`;
        const htmlBody = convertToTrackedHtml(msg.body, msg.id, trackingBaseUrl, openPixelUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
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
              html: htmlBody,
            }),
          });

          if (res.ok) {
            await supabase
              .from("messages")
              .update({ sent_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
              .eq("id", msg.id);
            sentCount++;
          } else {
            const errBody = await res.text();
            failCount++;
            errors.push(`Lead ${msg.lead_id}: Resend error — ${errBody}`);
          }
        } catch (sendErr) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: ${sendErr instanceof Error ? sendErr.message : "Unknown send error"}`);
        }

      } else if (channel === "sms") {
        // SMS via Twilio
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: Twilio credentials not configured`);
          continue;
        }

        const leadPhone = lead.leads?.phone;
        if (!leadPhone) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: no phone number`);
          continue;
        }

        // Determine if WhatsApp (phone starts with whatsapp: prefix or we detect it)
        const isWhatsApp = leadPhone.startsWith("whatsapp:");
        const toNumber = isWhatsApp ? leadPhone : leadPhone;
        const fromNumber = isWhatsApp ? `whatsapp:${TWILIO_PHONE_NUMBER}` : TWILIO_PHONE_NUMBER;

        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          const basicAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

          const formData = new URLSearchParams();
          formData.append("To", toNumber);
          formData.append("From", fromNumber);
          formData.append("Body", msg.body);

          const res = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          });

          const resBody = await res.json();

          if (res.ok || resBody.sid) {
            await supabase
              .from("messages")
              .update({ sent_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
              .eq("id", msg.id);
            sentCount++;
          } else {
            failCount++;
            errors.push(`Lead ${msg.lead_id}: Twilio error — ${resBody.message || JSON.stringify(resBody)}`);
          }
        } catch (sendErr) {
          failCount++;
          errors.push(`Lead ${msg.lead_id}: ${sendErr instanceof Error ? sendErr.message : "Unknown SMS error"}`);
        }
      }
    }

    // Update campaign status if all messages sent
    if (sentCount > 0) {
      const { count: remainingCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("approval_status", "approved")
        .is("sent_at", null);

      if (remainingCount === 0) {
        await supabase.from("campaigns").update({ status: "completed" as any }).eq("id", campaign_id);
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      workspace_id,
      event_type: "campaign_sent",
      user_id: authUser.id,
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

function convertToTrackedHtml(
  body: string,
  messageId: string,
  trackingBaseUrl: string,
  openPixelUrl: string
): string {
  let html = body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  html = html.replace(urlRegex, (url) => {
    const trackedUrl = `${trackingBaseUrl}?mid=${messageId}&action=click&url=${encodeURIComponent(url)}`;
    return `<a href="${trackedUrl}" style="color: #2563eb;">${url}</a>`;
  });

  html += `<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

  return `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">${html}</body></html>`;
}
