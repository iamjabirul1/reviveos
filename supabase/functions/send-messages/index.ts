import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/email-tracking`;

    const { campaign_id, workspace_id, message_ids } = await req.json();
    if (!workspace_id) {
      throw new Error("workspace_id is required");
    }
    if (!campaign_id && (!Array.isArray(message_ids) || message_ids.length === 0)) {
      throw new Error("campaign_id or message_ids is required");
    }

    // Fetch workspace-specific integration credentials
    const { data: integrations } = await supabase
      .from("workspace_integrations")
      .select("provider, credentials, is_active")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    const integrationMap: Record<string, Record<string, string>> = {};
    for (const i of integrations || []) {
      integrationMap[i.provider] = i.credentials as Record<string, string>;
    }

    // Resolve credentials: workspace-level first, global env only for founder
    const emailCreds = resolveEmailCreds(integrationMap, workspace_id);
    const smsCreds = resolveSmsCreds(integrationMap, workspace_id);
    const whatsappCreds = resolveWhatsAppCreds(integrationMap, workspace_id);

    const missingProviders: string[] = [];
    if (!emailCreds) missingProviders.push("resend");
    if (!smsCreds) missingProviders.push("twilio");

    // Fetch approved unsent messages — either a specific set (retry) or campaign-wide
    let q = supabase
      .from("messages")
      .select("*, leads!inner(email, phone, first_name, last_name)")
      .eq("workspace_id", workspace_id)
      .eq("approval_status", "approved")
      .is("sent_at", null);
    if (Array.isArray(message_ids) && message_ids.length > 0) {
      q = q.in("id", message_ids);
    } else {
      q = q.eq("campaign_id", campaign_id);
    }
    const { data: messages, error: fetchError } = await q;

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
      const leadPhone = lead.leads?.phone;
      const isWhatsApp = channel === "sms" && leadPhone?.startsWith("whatsapp:");

      let result: { success: boolean; error?: string };
      if (channel === "email") {
        result = await sendEmail(msg, lead, emailCreds, trackingBaseUrl);
      } else if (channel === "sms") {
        const creds = isWhatsApp ? whatsappCreds : smsCreds;
        result = await sendSms(msg, lead, creds, isWhatsApp);
      } else {
        result = { success: false, error: `Unsupported channel: ${channel}` };
      }

      const nowIso = new Date().toISOString();
      if (result.success) {
        await supabase.from("messages").update({
          sent_at: nowIso,
          delivered_at: nowIso,
          send_error: null,
          last_attempt_at: nowIso,
          send_attempts: (msg.send_attempts ?? 0) + 1,
        }).eq("id", msg.id);
        sentCount++;
      } else {
        await supabase.from("messages").update({
          send_error: result.error ?? "Unknown error",
          last_attempt_at: nowIso,
          send_attempts: (msg.send_attempts ?? 0) + 1,
        }).eq("id", msg.id);
        failCount++;
        errors.push(`Lead ${msg.lead_id}: ${result.error}`);
      }
    }

    // Update campaign status if all messages sent (only when scoped to a campaign)
    if (sentCount > 0 && campaign_id) {
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
      JSON.stringify({
        sent: sentCount,
        failed: failCount,
        errors: errors.slice(0, 10),
        reason: sentCount === 0 && failCount > 0 && missingProviders.length ? "no_credentials" : undefined,
        missing_providers: missingProviders,
      }),
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

// --- Credential resolution: workspace-level → global env fallback ---
// Global env secrets belong to the founder's workspace only
const FOUNDER_WORKSPACE_ID = "8fb8fcae-ef4d-4d99-b599-39d0ba47c808";

interface EmailCreds {
  api_key: string;
  from_email: string;
  from_name: string;
}

interface SmsCreds {
  account_sid: string;
  auth_token: string;
  phone_number: string;
}

function resolveEmailCreds(integrations: Record<string, Record<string, string>>, workspaceId?: string): EmailCreds | null {
  // Brevo is the default global provider for all workspaces.
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (brevoKey) {
    const ws = integrations["resend"] || integrations["brevo"] || {};
    return {
      api_key: brevoKey,
      from_email: ws.from_email || Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@reviveos.com",
      from_name: ws.from_name || Deno.env.get("BREVO_SENDER_NAME") || "ReviveOS",
    };
  }
  return null;
}

function resolveSmsCreds(integrations: Record<string, Record<string, string>>, workspaceId?: string): SmsCreds | null {
  const ws = integrations["twilio"];
  if (ws?.account_sid && ws?.auth_token) {
    return { account_sid: ws.account_sid, auth_token: ws.auth_token, phone_number: ws.phone_number || "" };
  }
  // Only fall back to global env for founder's workspace
  if (workspaceId === FOUNDER_WORKSPACE_ID) {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const phone = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (sid && token) return { account_sid: sid, auth_token: token, phone_number: phone || "" };
  }
  return null;
}

function resolveWhatsAppCreds(integrations: Record<string, Record<string, string>>, workspaceId?: string): SmsCreds | null {
  const ws = integrations["whatsapp"];
  if (ws?.account_sid && ws?.auth_token) {
    return { account_sid: ws.account_sid, auth_token: ws.auth_token, phone_number: ws.whatsapp_number || "" };
  }
  // Fall back to twilio creds with whatsapp prefix
  return resolveSmsCreds(integrations, workspaceId);
}

// --- Send functions ---

async function sendEmail(
  msg: any, lead: any, creds: EmailCreds | null, trackingBaseUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!creds) return { success: false, error: "Email not configured (no Resend API key)" };

  const leadEmail = lead.leads?.email;
  if (!leadEmail) return { success: false, error: "No email address" };

  const openPixelUrl = `${trackingBaseUrl}?mid=${msg.id}&action=open`;
  const htmlBody = convertToTrackedHtml(msg.body, msg.id, trackingBaseUrl, openPixelUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${creds.from_name} <${creds.from_email}>`,
        to: [leadEmail],
        subject: msg.subject || "Quick follow-up",
        text: msg.body,
        html: htmlBody,
      }),
    });

    if (res.ok) return { success: true };
    const errBody = await res.text();
    return { success: false, error: `Resend error — ${errBody}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown send error" };
  }
}

async function sendSms(
  msg: any, lead: any, creds: SmsCreds | null, isWhatsApp: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!creds) return { success: false, error: `${isWhatsApp ? "WhatsApp" : "SMS"} not configured (no Twilio credentials)` };

  const leadPhone = lead.leads?.phone;
  if (!leadPhone) return { success: false, error: "No phone number" };

  const toNumber = isWhatsApp ? leadPhone : leadPhone;
  const fromNumber = isWhatsApp ? `whatsapp:${creds.phone_number}` : creds.phone_number;

  if (!fromNumber || fromNumber === "whatsapp:") {
    return { success: false, error: "No from phone number configured" };
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`;
    const basicAuth = btoa(`${creds.account_sid}:${creds.auth_token}`);

    const formData = new URLSearchParams();
    formData.append("To", toNumber);
    formData.append("From", fromNumber);
    formData.append("Body", msg.body);

    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const resBody = await res.json();

    if (res.ok || resBody.sid) return { success: true };
    return { success: false, error: `Twilio error — ${resBody.message || JSON.stringify(resBody)}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown SMS error" };
  }
}

function convertToTrackedHtml(
  body: string, messageId: string, trackingBaseUrl: string, openPixelUrl: string
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
