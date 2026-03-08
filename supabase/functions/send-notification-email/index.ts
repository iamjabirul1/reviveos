import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  type: "subscription_cancelled" | "plan_limit_warning";
  workspace_id: string;
  details?: Record<string, unknown>;
}

function buildCancelledEmail(workspaceName: string): { subject: string; html: string } {
  return {
    subject: "Your subscription has been cancelled",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 16px;">Subscription Cancelled</h1>
        <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
          Your subscription for workspace <strong>${workspaceName}</strong> has been cancelled and your plan has been downgraded to Free.
        </p>
        <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
          You'll still have access to your data, but some features may be limited. You can upgrade again at any time from your Settings page.
        </p>
        <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="font-size: 14px; color: #666; margin: 0;">
            If you didn't request this cancellation, please contact support immediately.
          </p>
        </div>
      </div>
    `,
  };
}

function buildLimitWarningEmail(
  workspaceName: string,
  details: Record<string, unknown>
): { subject: string; html: string } {
  const items = (details.items as Array<{ label: string; current: number; max: number; pct: number }>) || [];
  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.label}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">
            <strong>${item.current.toLocaleString()}</strong> / ${item.max.toLocaleString()}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right; color: ${item.pct >= 90 ? '#dc2626' : '#f59e0b'};">
            ${item.pct}%
          </td>
        </tr>
      `
    )
    .join("");

  return {
    subject: `⚠️ You're approaching your plan limits`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 16px;">Plan Limit Warning</h1>
        <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
          Your workspace <strong>${workspaceName}</strong> is approaching one or more plan limits:
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
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { type, workspace_id, details } = (await req.json()) as NotificationPayload;

    // Verify user is member of workspace
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("plan_limit_warnings, subscription_updates")
      .eq("user_id", userId)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    // Respect opt-out (default is opted-in if no record exists)
    if (prefs) {
      if (type === "plan_limit_warning" && !prefs.plan_limit_warnings) {
        return new Response(JSON.stringify({ skipped: true, reason: "User opted out of plan limit warnings" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (type === "subscription_cancelled" && !prefs.subscription_updates) {
        return new Response(JSON.stringify({ skipped: true, reason: "User opted out of subscription updates" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get user email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace name
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspace_id)
      .single();

    const workspaceName = workspace?.name || "Your workspace";

    // Build email
    let emailContent: { subject: string; html: string };
    if (type === "subscription_cancelled") {
      emailContent = buildCancelledEmail(workspaceName);
    } else if (type === "plan_limit_warning") {
      emailContent = buildLimitWarningEmail(workspaceName, details || {});
    } else {
      return new Response(JSON.stringify({ error: "Unknown notification type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ReviveOS <notifications@updates.reviveos.com>",
        to: [userEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the notification
    await supabaseAdmin.from("activity_logs").insert({
      workspace_id,
      user_id: userId,
      event_type: `notification_${type}`,
      payload_json: { email: userEmail, type },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
