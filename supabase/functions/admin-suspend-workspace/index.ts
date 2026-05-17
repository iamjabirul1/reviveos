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

    const adminUserId = authUser.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin role
    const { data: hasAdmin } = await supabase.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });

    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, action, reason } = await req.json();

    if (!workspace_id || !["suspend", "unsuspend"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request. Provide workspace_id and action (suspend/unsuspend)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace + owner info
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, owner_user_id")
      .eq("id", workspace_id)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suspend") {
      await supabase
        .from("workspaces")
        .update({
          ai_suspended: true,
          ai_suspended_at: new Date().toISOString(),
          ai_suspended_reason: reason || "Unusual AI usage detected. Please contact support.",
        })
        .eq("id", workspace_id);

      // Send email notification to workspace owner
      const { data: ownerData } = await supabase.auth.admin.getUserById(workspace.owner_user_id);
      const ownerEmail = ownerData?.user?.email;

      if (ownerEmail) {
        await sendBrevoEmail({
          from: "ReviveOS <notifications@updates.reviveos.com>",
          to: ownerEmail,
          subject: "⚠️ Your AI access has been suspended",
          html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h1 style="font-size: 22px; color: #dc2626; margin: 0 0 12px 0;">⚠️ AI Access Suspended</h1>
                    <p style="font-size: 16px; color: #1a1a1a; line-height: 1.6; margin: 0;">
                      AI features for your workspace <strong>${workspace.name}</strong> have been temporarily suspended.
                    </p>
                  </div>
                  <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; color: #1a1a1a; margin: 0 0 8px 0;">Reason</h3>
                    <p style="font-size: 15px; color: #4a4a4a; line-height: 1.6; background: #f5f5f5; padding: 12px 16px; border-radius: 8px; margin: 0;">
                      ${reason || "Unusual AI usage patterns detected."}
                    </p>
                  </div>
                  <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; color: #1a1a1a; margin: 0 0 8px 0;">What this means</h3>
                    <ul style="font-size: 15px; color: #4a4a4a; line-height: 1.8; padding-left: 20px; margin: 0;">
                      <li>Message generation, lead enrichment, and AI writing are temporarily disabled</li>
                      <li>Your existing data, leads, and campaigns are <strong>not affected</strong></li>
                      <li>All other features continue to work normally</li>
                    </ul>
                  </div>
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="font-size: 15px; color: #0369a1; margin: 0 0 12px 0;">
                      <strong>Need help? Contact our support team to resolve this.</strong>
                    </p>
                    <a href="mailto:support@reviveos.com" style="display: inline-block; background: #0284c7; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Contact Support
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #999; margin-top: 24px; text-align: center;">
                    If you believe this was done in error, reply to this email or contact support@reviveos.com
                  </p>
                </div>
              `,
        });
      }

      // Log the action
      await supabase.from("activity_logs").insert({
        workspace_id,
        user_id: adminUserId,
        event_type: "admin_ai_suspended",
        payload_json: { reason, admin_user_id: adminUserId },
      });

    } else {
      // Unsuspend
      await supabase
        .from("workspaces")
        .update({
          ai_suspended: false,
          ai_suspended_at: null,
          ai_suspended_reason: null,
        })
        .eq("id", workspace_id);

      // Send reactivation email
      const { data: ownerData } = await supabase.auth.admin.getUserById(workspace.owner_user_id);
      const ownerEmail = ownerData?.user?.email;

      if (ownerEmail) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ReviveOS <notifications@updates.reviveos.com>",
              to: [ownerEmail],
              subject: "✅ Your AI access has been restored",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h1 style="font-size: 22px; color: #16a34a; margin: 0 0 12px 0;">✅ AI Access Restored</h1>
                    <p style="font-size: 16px; color: #1a1a1a; line-height: 1.6; margin: 0;">
                      AI features for your workspace <strong>${workspace.name}</strong> have been reactivated.
                    </p>
                  </div>
                  <p style="font-size: 15px; color: #4a4a4a; line-height: 1.6;">
                    You can now use message generation, lead enrichment, and AI writing features again. Thank you for your patience.
                  </p>
                </div>
              `,
            }),
          });
        }
      }

      await supabase.from("activity_logs").insert({
        workspace_id,
        user_id: adminUserId,
        event_type: "admin_ai_unsuspended",
        payload_json: { admin_user_id: adminUserId },
      });
    }

    return new Response(JSON.stringify({ success: true, action, workspace_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-suspend-workspace error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
