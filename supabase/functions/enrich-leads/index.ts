import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const DELAY_BETWEEN_LEADS_MS = 1500;

async function fetchWithRetry(url: string, options: RequestInit, label: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      let delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      if (retryAfter) {
        delayMs = Math.max(parseInt(retryAfter) * 1000, delayMs);
      }
      console.warn(`Rate limited for ${label}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 30000)));
      continue;
    }

    return response;
  }

  throw new Error(`Max retries exceeded for ${label}`);
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { leads, workspace_id } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error("No leads provided");
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit check
    if (workspace_id) {
      const { data: rateLimit } = await sb.rpc("check_ai_rate_limit", {
        _workspace_id: workspace_id,
        _function_name: "enrich-leads",
      });
      if (rateLimit && !rateLimit.allowed) {
        return new Response(JSON.stringify({
          error: "Daily AI usage limit reached",
          daily_limit: rateLimit.daily_limit,
          used_today: rateLimit.used_today,
          plan: rateLimit.plan,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      if (i > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_LEADS_MS));
      }

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
2. **Industry Context**: What macro trends affect this industry right now? What challenges are companies like this facing in 2025-2026?
3. **Likely Pain Points**: Based on the company type and size, what are the top 3 business challenges they're probably dealing with?
4. **Decision-Maker Profile**: Based on the contact name and company, what is their likely role? What do people in this role care about most?
5. **Competitive Landscape**: Who are the likely competitors of this company?
6. **Personalization Hooks**: What are 3 specific, non-generic conversation starters that would resonate with this person?
7. **Best Outreach Angle**: Given all the above, what is the single most compelling reason to re-engage this lead?
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
        const response = await fetchWithRetry(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
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
          },
          `lead-${lead.id}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI gateway error [${response.status}]:`, errorText);

          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please check your usage." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      } catch (retryErr) {
        console.error("Error processing lead:", lead.id, retryErr);
        results.push({ lead_id: lead.id, enrichment: null, error: retryErr instanceof Error ? retryErr.message : "Processing error" });
      }
    }

    // Log AI usage
    if (workspace_id) {
      const userId = authUser.id;
      await sb.from("ai_usage_log").insert(
        results.map((r: any) => ({
          workspace_id,
          user_id: userId,
          function_name: "enrich-leads",
        }))
      );
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
