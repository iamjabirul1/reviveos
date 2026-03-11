import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This function processes message outcome feedback and updates workspace_ai_insights
// Called when a message outcome is recorded (reply, booking, deal won/lost)
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

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, message_id, outcome_type, revenue_amount } = await req.json();
    // outcome_type: "replied" | "booked" | "deal_won" | "deal_lost" | "no_response"

    if (!workspace_id || !message_id || !outcome_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get message details
    const { data: message } = await sb
      .from("messages")
      .select("*, lead:leads(company, first_name)")
      .eq("id", message_id)
      .single();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or find existing outcome record
    const { data: existingOutcome } = await sb
      .from("message_outcomes")
      .select("*")
      .eq("message_id", message_id)
      .maybeSingle();

    const isWin = ["replied", "booked", "deal_won"].includes(outcome_type);
    const outcomeData = {
      workspace_id,
      message_id,
      lead_id: message.lead_id,
      campaign_id: message.campaign_id,
      tone_used: (message as any).tone_used || "friendly",
      cta_used: (message as any).cta_used || "book_call",
      angle_used: (message as any).angle_used || "general",
      subject_used: message.subject || "",
      channel: message.channel,
      variant_label: message.variant_label || "A",
      replied: outcome_type === "replied" || outcome_type === "booked" || outcome_type === "deal_won",
      booked: outcome_type === "booked" || outcome_type === "deal_won",
      deal_won: outcome_type === "deal_won",
      outcome: outcome_type,
      revenue_amount: revenue_amount || 0,
      updated_at: new Date().toISOString(),
    };

    if (existingOutcome) {
      await sb.from("message_outcomes").update(outcomeData).eq("id", existingOutcome.id);
    } else {
      await sb.from("message_outcomes").insert(outcomeData);
    }

    // Update message timestamps based on outcome
    const messageUpdate: Record<string, string> = {};
    if (outcome_type === "replied") messageUpdate.replied_at = new Date().toISOString();
    if (Object.keys(messageUpdate).length > 0) {
      await sb.from("messages").update(messageUpdate).eq("id", message_id);
    }

    // === Update workspace_ai_insights ===
    const insightsToUpsert = [
      { type: "tone", key: outcomeData.tone_used },
      { type: "cta", key: outcomeData.cta_used },
      { type: "angle", key: outcomeData.angle_used },
      { type: "channel", key: outcomeData.channel },
      { type: "variant", key: outcomeData.variant_label },
    ];

    // Extract subject pattern (first 3 words as pattern)
    if (outcomeData.subject_used) {
      const subjectPattern = outcomeData.subject_used.split(" ").slice(0, 3).join(" ") + "...";
      insightsToUpsert.push({ type: "subject_pattern", key: subjectPattern });
    }

    for (const insight of insightsToUpsert) {
      if (!insight.key) continue;

      const { data: existing } = await sb
        .from("workspace_ai_insights")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("insight_type", insight.type)
        .eq("insight_key", insight.key)
        .maybeSingle();

      if (existing) {
        const newWin = existing.win_count + (isWin ? 1 : 0);
        const newLoss = existing.loss_count + (isWin ? 0 : 1);
        const newTotal = existing.total_count + 1;
        const newWinRate = newTotal > 0 ? newWin / newTotal : 0;
        const newAvgRevenue = isWin && revenue_amount
          ? ((existing.avg_revenue * existing.win_count) + revenue_amount) / newWin
          : existing.avg_revenue;

        await sb.from("workspace_ai_insights").update({
          win_count: newWin,
          loss_count: newLoss,
          total_count: newTotal,
          win_rate: newAvgRevenue ? Math.round(newWinRate * 1000) / 1000 : newWinRate,
          avg_revenue: Math.round(newAvgRevenue * 100) / 100,
          last_updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await sb.from("workspace_ai_insights").insert({
          workspace_id,
          insight_type: insight.type,
          insight_key: insight.key,
          win_count: isWin ? 1 : 0,
          loss_count: isWin ? 0 : 1,
          total_count: 1,
          win_rate: isWin ? 1 : 0,
          avg_revenue: isWin ? (revenue_amount || 0) : 0,
          last_updated_at: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, outcome: outcome_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-message-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
