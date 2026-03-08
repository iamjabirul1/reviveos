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
    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }

    const { leads, playbook_type, tone, cta } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error("No leads provided");
    }

    const results = [];

    for (const lead of leads) {
      const systemPrompt = `You are an expert B2B sales copywriter specializing in win-back and re-engagement campaigns. You write personalized, human-sounding messages that get replies.

Rules:
- Never invent specific details not provided in the lead context
- Never make unsupported claims
- Keep emails under 150 words
- Keep SMS under 160 characters
- Be ${tone || 'friendly'} in tone
- The CTA should be: ${formatCTA(cta || 'book_call')}
- Include a one-line rationale for why this message approach was chosen`;

      const userPrompt = `Generate a win-back message for this lead:

Playbook type: ${formatPlaybookType(playbook_type || 'stale_lead')}
Lead name: ${lead.first_name || ''} ${lead.last_name || ''}
Company: ${lead.company || 'Unknown'}
Email: ${lead.email || 'N/A'}
Source: ${lead.source || 'Unknown'}
Stage: ${lead.stage || 'Unknown'}
Last contacted: ${lead.last_contacted_at || 'Unknown'}
No-show: ${lead.no_show_flag ? 'Yes' : 'No'}
Closed-lost reason: ${lead.closed_lost_reason || 'N/A'}
Notes: ${lead.notes || 'None'}
Lead value: ${lead.lead_value ? '$' + lead.lead_value : 'Unknown'}
Revival score: ${lead.revival_score || 'N/A'}
Best angle: ${lead.best_angle || 'General re-engagement'}

Respond with ONLY valid JSON in this exact format:
{
  "email_subject": "...",
  "email_body": "...",
  "sms_body": "...",
  "rationale": "..."
}`;

      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Cerebras API error [${response.status}]:`, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fallback to template for this lead
        results.push({
          lead_id: lead.id,
          ...generateFallback(lead, playbook_type, tone, cta),
        });
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      try {
        // Extract JSON from response (handle markdown code blocks)
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
          results.push({
            lead_id: lead.id,
            ...generateFallback(lead, playbook_type, tone, cta),
          });
        }
      } catch {
        results.push({
          lead_id: lead.id,
          ...generateFallback(lead, playbook_type, tone, cta),
        });
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

function generateFallback(lead: any, playbookType: string, tone: string, cta: string) {
  const name = lead.first_name || "there";
  return {
    email_subject: `Re: Quick question, ${name}`,
    email_body: `Hi ${name},\n\nI noticed we connected a while back but didn't get the chance to continue our conversation. I wanted to reach out because I think there might still be a great fit here.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`,
    sms_body: `Hi ${name}, just following up on our previous conversation. Would love to reconnect briefly. Are you free for a quick call?`,
    rationale: "Fallback template used — AI generation was unavailable for this lead.",
  };
}
