import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAD_FIELDS = [
  { key: "first_name", label: "First Name", description: "Contact's first/given name" },
  { key: "last_name", label: "Last Name", description: "Contact's last/family/surname" },
  { key: "email", label: "Email", description: "Contact's email address" },
  { key: "phone", label: "Phone", description: "Contact's phone number" },
  { key: "company", label: "Company", description: "Company/organization name" },
  { key: "source", label: "Source", description: "Lead source/origin (e.g. website, referral, LinkedIn)" },
  { key: "stage", label: "Stage", description: "Sales pipeline stage (e.g. prospect, qualified, proposal)" },
  { key: "status", label: "Status", description: "Lead status (e.g. active, inactive, converted)" },
  { key: "lead_value", label: "Lead Value", description: "Monetary value/deal size (number)" },
  { key: "last_contacted_at", label: "Last Contacted", description: "Date last contacted" },
  { key: "last_activity_at", label: "Last Activity", description: "Date of last activity/interaction" },
  { key: "no_show_flag", label: "No Show Flag", description: "Whether the lead missed a meeting (boolean)" },
  { key: "closed_lost_reason", label: "Closed Lost Reason", description: "Why a deal was lost" },
  { key: "notes", label: "Notes", description: "Free-text notes, comments, or additional context about the lead" },
  { key: "consent_status", label: "Consent Status", description: "GDPR/marketing consent status" },
  { key: "jurisdiction", label: "Jurisdiction", description: "Geographic jurisdiction for compliance" },
];

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

    const { headers, sample_rows } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      throw new Error("No headers provided");
    }

    const fieldsDescription = LEAD_FIELDS.map(f => `- "${f.key}": ${f.description}`).join("\n");

    const sampleDataStr = (sample_rows || []).slice(0, 3).map((row: Record<string, string>, i: number) => {
      return `Row ${i + 1}: ${headers.map((h: string) => `${h}="${row[h] || ''}"`).join(", ")}`;
    }).join("\n");

    const prompt = `You are a data mapping expert. Given CSV column headers and sample data, map each CSV column to the most appropriate CRM lead field.

AVAILABLE CRM FIELDS:
${fieldsDescription}

CSV COLUMNS TO MAP:
${headers.map((h: string) => `- "${h}"`).join("\n")}

SAMPLE DATA:
${sampleDataStr}

IMPORTANT RULES:
1. Look at BOTH the column header name AND the sample data values to determine the best match
2. If a column contains email addresses (has @ symbol), map it to "email"
3. If a column contains phone numbers (digits with dashes/parentheses/+), map it to "phone"
4. If a column contains URLs/websites, map it to "notes"
5. If a column contains company/organization names, map it to "company"
6. If a column contains person names, try to split into first_name and last_name
7. If a column contains monetary values or deal amounts, map it to "lead_value"
8. If a column contains dates, determine if it's "last_contacted_at" or "last_activity_at"
9. If a column has no good match, map it to "notes"
10. Each CRM field should only be mapped once (except "notes")
11. NEVER skip data — every column must map to something

Respond with ONLY valid JSON in this format:
{
  "mapping": {
    "CSV Column Name 1": "crm_field_key",
    "CSV Column Name 2": "crm_field_key"
  },
  "confidence": 0.0-1.0,
  "notes_columns": ["columns that were merged into notes"],
  "reasoning": "Brief explanation of mapping decisions"
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
          { role: "system", content: "You are a data mapping expert. Always respond with valid JSON only. Never skip columns." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ mapping: null, error: "AI unavailable, using manual mapping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ mapping: null, error: "Could not parse AI response" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("map-csv-fields error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
