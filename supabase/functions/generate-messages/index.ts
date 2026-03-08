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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { leads, playbook_type, tone, cta, workspace_id } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error("No leads provided");
    }

    // Fetch workspace business context using service role
    let businessContextPrompt = "";
    if (workspace_id) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ws } = await sb.from("workspaces").select("business_context").eq("id", workspace_id).single();
      if (ws?.business_context) {
        const bc = ws.business_context as any;
        businessContextPrompt = `
SENDER'S BUSINESS CONTEXT (write FROM this company's perspective):
- Company: ${bc.company_name || "N/A"}
- Industry: ${bc.industry || "N/A"}  
- What they do: ${bc.description || "N/A"}
- Target Audience: ${bc.target_audience || "N/A"}
- Key Differentiators: ${bc.key_differentiators || "N/A"}
- Preferred Tone: ${bc.preferred_tone || "friendly"}
- Brand Voice Guidelines: ${bc.brand_voice || "N/A"}
- Topics to AVOID: ${bc.avoid_topics || "None"}
- Goals: ${(bc.goals || []).join(", ")}
- Avg Deal Size: ${bc.avg_deal_size || "N/A"}
- Sales Cycle: ${bc.sales_cycle || "N/A"}`;
      }
    }

    const results = [];

    for (const lead of leads) {
      const enrichment = lead.enrichment_json;
      const enrichmentContext = enrichment ? `
DEEP RESEARCH DATA (use this heavily for personalization):
- Company Summary: ${enrichment.company_summary || 'N/A'}
- Industry: ${enrichment.industry || 'N/A'}
- Company Size: ${enrichment.company_size_estimate || 'N/A'}
- Pain Points: ${(enrichment.pain_points || []).join(', ')}
- Industry Trends: ${(enrichment.recent_trends || []).join(', ')}
- Decision-Maker Profile: ${enrichment.decision_maker_profile || 'N/A'}
- Competitors: ${(enrichment.competitors || []).join(', ')}
- Personalization Hooks: ${(enrichment.personalization_hooks || []).join(' | ')}
- Best Outreach Angle: ${enrichment.best_outreach_angle || 'N/A'}
- Timing Signal: ${enrichment.timing_signal || 'N/A'}` : '';

      const systemPrompt = `You are an elite B2B sales strategist who combines deep business research with persuasive copywriting. Your specialty is crafting hyper-personalized win-back messages that feel like they were written by someone who truly understands the prospect's business.
${businessContextPrompt}

RESEARCH PHASE (internal — do NOT include in output):
Before writing, deeply analyze everything you know about:
1. The company "${lead.company || 'their company'}" — what industry are they in, what challenges do companies like this face, what trends affect them
2. The contact "${lead.first_name || ''} ${lead.last_name || ''}" — based on their role/title, what are their likely priorities and pain points
3. The context clues: source="${lead.source || 'Unknown'}", stage="${lead.stage || 'Unknown'}", closed-lost reason="${lead.closed_lost_reason || 'N/A'}", notes="${lead.notes || 'None'}"
4. The timing: last contacted ${lead.last_contacted_at || 'unknown date'}, no-show=${lead.no_show_flag ? 'Yes' : 'No'}
${enrichmentContext}

WRITING RULES:
- ${enrichment ? 'USE THE DEEP RESEARCH DATA ABOVE — reference specific pain points, industry trends, and personalization hooks' : 'Reference specific, plausible industry challenges or trends for their company/industry'}
- Never fabricate specific facts you don't know (revenue, headcount, etc.) — instead reference industry-level insights
- Open with something that shows you understand THEIR world, not yours
- Keep emails under 120 words — every word must earn its place
- Keep SMS under 155 characters
- Be ${tone || 'friendly'} in tone but always professional
- The CTA should be: ${formatCTA(cta || 'book_call')}
- If they no-showed, acknowledge it gracefully without guilt-tripping
- If closed-lost, reference what may have changed since then
- The message should feel like it was written by a human who spent 10 minutes researching them

PERSONALIZATION ANGLES TO CONSIDER:
- Industry trends that affect "${lead.company || 'their business'}"
- Pain points typical for someone at their stage ("${lead.stage || 'prospect'}")
- The original source of the lead ("${lead.source || 'Unknown'}") — reference how you connected
- Their lead value ($${lead.lead_value || 'Unknown'}) signals the deal size/complexity
- Revival score: ${lead.revival_score || 'N/A'}, Best angle: ${lead.best_angle || 'General'}`;

      const userPrompt = `Generate a hyper-personalized win-back message for this lead:

Playbook: ${formatPlaybookType(playbook_type || 'stale_lead')}
Name: ${lead.first_name || ''} ${lead.last_name || ''}
Company: ${lead.company || 'Unknown'}
Email: ${lead.email || 'N/A'}
Source: ${lead.source || 'Unknown'}
Stage: ${lead.stage || 'Unknown'}
Last contacted: ${lead.last_contacted_at || 'Unknown'}
No-show: ${lead.no_show_flag ? 'Yes' : 'No'}
Closed-lost reason: ${lead.closed_lost_reason || 'N/A'}
Notes: ${lead.notes || 'None'}
Lead value: ${lead.lead_value ? '$' + lead.lead_value : 'Unknown'}

Respond with ONLY valid JSON:
{
  "email_subject": "Short, curiosity-driven subject line (no generic 'follow up')",
  "email_body": "Hyper-personalized email referencing their industry/company context",
  "sms_body": "Concise SMS under 155 chars with personal touch",
  "rationale": "2-3 sentences explaining: what research angle you used, why this approach fits this specific lead, and what makes this message different from a generic template"
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway error [${response.status}]:`, errorText);

        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please check your usage." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        results.push({ lead_id: lead.id, ...generateFallback(lead) });
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          results.push({
            lead_id: lead.id,
            email_subject: parsed.email_subject || "Quick follow-up",
            email_body: parsed.email_body || "",
            sms_body: parsed.sms_body || "",
            rationale: parsed.rationale || "AI-generated message",
          });
        } else {
          results.push({ lead_id: lead.id, ...generateFallback(lead) });
        }
      } catch {
        results.push({ lead_id: lead.id, ...generateFallback(lead) });
      }
    }

    return new Response(JSON.stringify({ messages: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-messages error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatCTA(cta: string): string {
  const map: Record<string, string> = {
    book_call: "Book a quick call",
    reply: "Reply to this email",
    claim_offer: "Claim a special offer",
    answer_question: "Answer a simple question",
  };
  return map[cta] || cta;
}

function formatPlaybookType(type: string): string {
  const map: Record<string, string> = {
    stale_lead: "Stale Lead Reactivation — re-engage a lead that went cold",
    no_show: "No-Show Rescue — follow up after a missed meeting",
    closed_lost: "Closed-Lost Comeback — revisit a deal that was lost",
    proposal_followup: "Proposal Follow-Up — check in on an unanswered proposal",
    dormant_customer: "Dormant Customer Re-engagement — wake up an inactive customer",
  };
  return map[type] || type;
}

function generateFallback(lead: any) {
  const name = lead.first_name || "there";
  return {
    email_subject: `Re: Quick question, ${name}`,
    email_body: `Hi ${name},\n\nI noticed we connected a while back but didn't get the chance to continue our conversation. I wanted to reach out because I think there might still be a great fit here.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`,
    sms_body: `Hi ${name}, just following up on our previous conversation. Would love to reconnect briefly. Are you free for a quick call?`,
    rationale: "Fallback template used — AI generation was unavailable for this lead.",
  };
}
