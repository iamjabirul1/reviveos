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
    // Auth check
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, playbook_type, tone, cta, channel, context } = await req.json();

    // Fetch business context from workspace
    let businessContext = "";
    if (workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("business_context")
        .eq("id", workspace_id)
        .single();

      if (ws?.business_context) {
        const bc = ws.business_context as any;
        businessContext = `
SENDER'S BUSINESS CONTEXT (use this to write FROM their perspective):
- Company: ${bc.company_name || "N/A"}
- Industry: ${bc.industry || "N/A"}
- Description: ${bc.description || "N/A"}
- Target Audience: ${bc.target_audience || "N/A"}
- Key Differentiators: ${bc.key_differentiators || "N/A"}
- Preferred Tone: ${bc.preferred_tone || "friendly"}
- Brand Voice: ${bc.brand_voice || "N/A"}
- Topics to Avoid: ${bc.avoid_topics || "None"}
- Goals: ${(bc.goals || []).join(", ")}
- Avg Deal Size: ${bc.avg_deal_size || "N/A"}`;
      }
    }

    const channelType = channel || "email";
    const systemPrompt = `You are an expert B2B copywriter who crafts high-converting ${channelType === "sms" ? "SMS messages" : "emails"} for sales outreach.
${businessContext}

RULES:
- Tone: ${tone || "friendly"}
- CTA: ${cta || "book a call"}
- Playbook type: ${playbook_type || "general outreach"}
- ${channelType === "sms" ? "SMS must be under 155 characters" : "Email should be under 120 words"}
- Write as if you ARE the sender's company, using their brand voice and differentiators
- ${context ? `Additional context: ${context}` : ""}
- Never mention topics the sender wants to avoid

Respond with ONLY valid JSON:
{
  ${channelType === "email" ? '"subject": "Compelling subject line",' : ""}
  "body": "The ${channelType} content",
  "rationale": "Brief explanation of the approach"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write a ${channelType} for a ${playbook_type || "general"} playbook. The tone should be ${tone || "friendly"} and the CTA is "${cta || "book a call"}".` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse AI response");
  } catch (e) {
    console.error("write-with-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
