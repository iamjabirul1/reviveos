import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { leads } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error("No leads provided");
    }

    const results = [];

    for (const lead of leads) {
      const prompt = `You are a B2B sales intelligence analyst. Your job is to deeply research a company and contact to provide actionable sales intelligence.

LEAD TO RESEARCH:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Email: ${lead.email || 'N/A'}
- Company: ${lead.company || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Stage: ${lead.stage || 'Unknown'}
- Notes: ${lead.notes || 'None'}

RESEARCH DEEPLY AND PROVIDE:

1. **Company Intelligence**: What does this company do? What industry/vertical? Approximate size? Key products/services? Recent news or developments?

2. **Industry Context**: What macro trends affect this industry right now? What challenges are companies like this facing in 2025-2026? What opportunities exist?

3. **Likely Pain Points**: Based on the company type and size, what are the top 3 business challenges they're probably dealing with?

4. **Decision-Maker Profile**: Based on the contact name and company, what is their likely role? What do people in this role care about most? What KPIs do they own?

5. **Competitive Landscape**: Who are the likely competitors of this company? What differentiates them?

6. **Personalization Hooks**: What are 3 specific, non-generic conversation starters that would resonate with this person? These should reference real industry trends, not platitudes.

7. **Best Outreach Angle**: Given all the above, what is the single most compelling reason to re-engage this lead? Frame it as a one-sentence value proposition.

8. **Timing Signals**: Are there any seasonal, fiscal, or industry timing factors that make NOW a good or bad time to reach out?

Respond with ONLY valid JSON in this exact format:
{
  "company_summary": "2-3 sentence company overview",
  "industry": "Primary industry/vertical",
  "company_size_estimate": "startup/smb/midmarket/enterprise",
  "recent_trends": ["trend 1", "trend 2", "trend 3"],
  "pain_points": ["pain 1", "pain 2", "pain 3"],
  "decision_maker_profile": "Likely role and what they care about",
  "competitors": ["competitor 1", "competitor 2"],
  "personalization_hooks": ["hook 1", "hook 2", "hook 3"],
  "best_outreach_angle": "Single most compelling reason to reach out",
  "timing_signal": "Why now is/isn't a good time",
  "confidence_score": 0.0-1.0
}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a B2B sales intelligence analyst who provides deep, actionable research on companies and contacts. Always respond with valid JSON only." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI gateway error [${response.status}]:`, errorText);

          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          results.push({ lead_id: lead.id, enrichment: null, error: `AI error: ${response.status}` });
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          results.push({ lead_id: lead.id, enrichment: parsed });
        } else {
          results.push({ lead_id: lead.id, enrichment: null, error: "Could not parse AI response" });
        }
      } catch (parseErr) {
        console.error("Error processing lead:", lead.id, parseErr);
        results.push({ lead_id: lead.id, enrichment: null, error: "Processing error" });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-leads error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
