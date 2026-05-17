import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan limits mirrored from planLimits.ts
const PLAN_LIMITS: Record<string, { maxLeads: number; maxCampaigns: number | null; maxPlaybooks: number | null; maxAICallsPerDay: number }> = {
  free: { maxLeads: 500, maxCampaigns: 1, maxPlaybooks: 3, maxAICallsPerDay: 10 },
  starter: { maxLeads: 1000, maxCampaigns: 3, maxPlaybooks: 3, maxAICallsPerDay: 50 },
  growth: { maxLeads: 10000, maxCampaigns: null, maxPlaybooks: 7, maxAICallsPerDay: 500 },
  scale: { maxLeads: 25000, maxCampaigns: null, maxPlaybooks: null, maxAICallsPerDay: 2000 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all workspaces with their owners
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name, plan, owner_user_id");

    if (wsError || !workspaces) {
      throw new Error(`Failed to fetch workspaces: ${wsError?.message}`);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    let emailsSent = 0;
    let workspacesChecked = 0;

    for (const ws of workspaces) {
      workspacesChecked++;
      const limits = PLAN_LIMITS[ws.plan] || PLAN_LIMITS.free;

      // Get counts
      const [leadsRes, campRes, pbRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
        supabase.from("playbooks").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
      ]);

      const usageItems: Array<{ label: string; current: number; max: number; pct: number }> = [];

      const leadCount = leadsRes.count ?? 0;
      const leadPct = Math.round((leadCount / limits.maxLeads) * 100);
      if (leadPct >= 80) {
        usageItems.push({ label: "Leads", current: leadCount, max: limits.maxLeads, pct: leadPct });
      }

      if (limits.maxCampaigns !== null) {
        const campCount = campRes.count ?? 0;
        const campPct = Math.round((campCount / limits.maxCampaigns) * 100);
        if (campPct >= 80) {
          usageItems.push({ label: "Campaigns", current: campCount, max: limits.maxCampaigns, pct: campPct });
        }
      }

      if (limits.maxPlaybooks !== null) {
        const pbCount = pbRes.count ?? 0;
        const pbPct = Math.round((pbCount / limits.maxPlaybooks) * 100);
        if (pbPct >= 80) {
          usageItems.push({ label: "Playbooks", current: pbCount, max: limits.maxPlaybooks, pct: pbPct });
        }
      }

      if (usageItems.length === 0) continue;

      // Check notification preferences for the owner
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("plan_limit_warnings")
        .eq("user_id", ws.owner_user_id)
        .eq("workspace_id", ws.id)
        .maybeSingle();

      // Default is opted-in; skip only if explicitly opted out
      if (prefs && !prefs.plan_limit_warnings) continue;

      // Get owner email
      const { data: userData } = await supabase.auth.admin.getUserById(ws.owner_user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Build and send email
      const itemsHtml = usageItems
        .map(
          (item) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.label}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">
              <strong>${item.current}</strong> / ${item.max}
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right; color: ${item.pct >= 90 ? "#dc2626" : "#f59e0b"};">
              ${item.pct}%
            </td>
          </tr>`
        )
        .join("");

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 16px;">Weekly Plan Limit Report</h1>
          <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
            Your workspace <strong>${ws.name}</strong> is approaching one or more plan limits:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 14px; color: #666;">Resource</th>
                <th style="padding: 8px 12px; text-align: right; font-size: 14px; color: #666;">Usage</th>
                <th style="padding: 8px 12px; text-align: right; font-size: 14px; color: #666;">%</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
            Consider upgrading your plan to avoid disruptions.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">
            You can disable these emails in Settings → Notifications.
          </p>
        </div>
      `;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ReviveOS <notifications@updates.reviveos.com>",
          to: [email],
          subject: "⚠️ Weekly Plan Limit Report",
          html,
        }),
      });

      if (resendRes.ok) {
        emailsSent++;
        // Log the notification
        await supabase.from("activity_logs").insert({
          workspace_id: ws.id,
          user_id: ws.owner_user_id,
          event_type: "notification_weekly_limit_check",
          payload_json: { items: usageItems },
        });
      } else {
        console.error(`Failed to send to ${email}:`, await resendRes.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true, workspaces_checked: workspacesChecked, emails_sent: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("weekly-limit-check error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
