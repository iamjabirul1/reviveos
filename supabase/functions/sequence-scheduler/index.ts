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

    // Find active campaigns with playbooks that have multi-step sequences
    const { data: activeCampaigns, error: campError } = await supabase
      .from("campaigns")
      .select("id, workspace_id, playbook_id, created_at")
      .eq("status", "active")
      .not("playbook_id", "is", null);

    if (campError) throw campError;
    if (!activeCampaigns || activeCampaigns.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No active campaigns with playbooks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalGenerated = 0;

    for (const campaign of activeCampaigns) {
      // Get the playbook sequence
      const { data: playbook } = await supabase
        .from("playbooks")
        .select("sequence_json, tone, cta, type")
        .eq("id", campaign.playbook_id)
        .single();

      if (!playbook?.sequence_json || !Array.isArray(playbook.sequence_json)) continue;

      const sequence = playbook.sequence_json as Array<{
        step: number;
        channel: string;
        label: string;
        delay_days: number;
      }>;

      // Get messages already generated for this campaign, grouped by lead
      const { data: existingMessages } = await supabase
        .from("messages")
        .select("lead_id, created_at")
        .eq("campaign_id", campaign.id);

      // Count messages per lead to determine which step they're on
      const leadStepMap = new Map<string, number>();
      if (existingMessages) {
        for (const msg of existingMessages) {
          leadStepMap.set(msg.lead_id, (leadStepMap.get(msg.lead_id) || 0) + 1);
        }
      }

      // Get all leads targeted by this campaign (from first step messages)
      const leadIds = [...new Set(existingMessages?.map(m => m.lead_id) || [])];
      if (leadIds.length === 0) continue;

      const campaignCreated = new Date(campaign.created_at);
      const now = new Date();

      for (const leadId of leadIds) {
        const currentStep = leadStepMap.get(leadId) || 0;
        const nextStepIndex = currentStep; // 0-indexed, currentStep is count of completed steps

        if (nextStepIndex >= sequence.length) continue; // All steps completed

        const nextStep = sequence[nextStepIndex];

        // Calculate cumulative delay
        let cumulativeDelay = 0;
        for (let i = 0; i <= nextStepIndex; i++) {
          cumulativeDelay += sequence[i].delay_days;
        }

        const dueDate = new Date(campaignCreated.getTime() + cumulativeDelay * 24 * 60 * 60 * 1000);
        if (now < dueDate) continue; // Not due yet

        // Get lead data for AI generation
        const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
        if (!lead) continue;

        // Generate message via AI
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          console.error("LOVABLE_API_KEY not configured");
          continue;
        }

        const aiResponse = await fetch(`${supabaseUrl}/functions/v1/generate-messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            leads: [lead],
            playbook_type: playbook.type,
            tone: playbook.tone || "friendly",
            cta: playbook.cta || "book_call",
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const msg = aiData.messages?.[0];
          if (msg) {
            await supabase.from("messages").insert({
              workspace_id: campaign.workspace_id,
              lead_id: leadId,
              campaign_id: campaign.id,
              channel: nextStep.channel as any,
              subject: nextStep.channel === "email" ? msg.email_subject : null,
              body: nextStep.channel === "email" ? msg.email_body : msg.sms_body,
              ai_rationale: `Step ${nextStepIndex + 1}: ${nextStep.label}. ${msg.rationale}`,
            });
            totalGenerated++;
          }
        } else {
          await aiResponse.text(); // consume body
        }
      }
    }

    return new Response(JSON.stringify({ processed: activeCampaigns.length, generated: totalGenerated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sequence-scheduler error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
