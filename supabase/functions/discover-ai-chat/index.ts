import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple IP-based rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_MESSAGES = 20;
const WINDOW_MS = 30 * 60 * 1000; // 30 min

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_MESSAGES) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { leadCount, avgDealSize, coldReason, websiteUrl, totalPipeline, recoverableRevenue } = context || {};

    const systemPrompt = `You are the ReviveOS AI Revenue Advisor — an expert in lead revival and win-back campaigns. You are providing an interactive product demo for a prospect.

## CONTEXT (from the prospect's inputs)
- Dead leads in CRM: ${leadCount?.toLocaleString() || 'unknown'}
- Average deal size: $${avgDealSize?.toLocaleString() || 'unknown'}
- Primary cold reason: ${coldReason || 'unknown'}
- Website URL: ${websiteUrl || 'not provided'}
- Total dormant pipeline: $${totalPipeline?.toLocaleString() || 'unknown'}
- Recoverable revenue (15% baseline): $${recoverableRevenue?.toLocaleString() || 'unknown'}

## SCORING RULES (ReviveOS deterministic algorithm)
- Score 0-24 = Suppress bucket (do not contact)
- Score 25-49 = Nurture Later (soft drip sequences)
- Score 50-74 = Review First (needs human review)
- Score 75-100 = Revive Now (high priority, auto-send ready)
- Signals that boost score: recent no-show (+25), timing objection (+20), contacted 14-120 days ago (+15), high deal value (+15), engagement notes (+10)
- Signals that suppress: do_not_contact flag, missing email+phone, invalid/disposable email, opted out

## YOUR BEHAVIOR
1. Be conversational, confident, and data-driven. Reference THEIR specific numbers always.
2. When drafting sample emails, make them personalized using their website context and cold reason.
3. Only output calculations based on the numbers the user provided. NEVER invent features or capabilities that don't exist.
4. After showing one sample email, mention that ReviveOS can generate personalized messages for ALL their leads automatically.
5. When they ask how to execute: push toward the $299/mo Starter plan (up to 1,000 leads) or $599/mo Growth plan (up to 10,000 leads).
6. Include the ROI math: "At $${avgDealSize || 5000} per deal, you only need to recover ${Math.max(1, Math.ceil((599 * 12) / (avgDealSize || 5000)))} deals per year to 10x your investment."
7. Keep responses concise and punchy. Use markdown formatting.
8. If they provide a website URL, reference their business name, product, or value prop naturally in sample messages.

## GUARDRAILS
- Do NOT hallucinate features. ReviveOS does: lead scoring, AI message generation, multi-step sequences, email delivery, analytics.
- Do NOT mention competitors by name.
- Do NOT promise specific revenue numbers beyond the 15% baseline recovery rate.
- Always be honest about what the tool does and doesn't do.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("discover-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
