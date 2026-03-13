import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Email Verification Edge Function (Deliverability Firewall)
 * 
 * Currently runs in MOCK mode — returns simulated verification results.
 * To activate real verification, add a ZEROBOUNCE_API_KEY or NEVERBOUNCE_API_KEY secret
 * and uncomment the relevant provider block below.
 * 
 * Accepts: { emails: string[] }
 * Returns: { results: Record<string, { status: string, sub_status?: string }> }
 */
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

    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails)) {
      return new Response(JSON.stringify({ error: "emails array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, { status: string; sub_status?: string }> = {};

    // --- REAL PROVIDER INTEGRATION (uncomment when API key is added) ---
    // const ZEROBOUNCE_KEY = Deno.env.get("ZEROBOUNCE_API_KEY");
    // if (ZEROBOUNCE_KEY) {
    //   for (const email of emails) {
    //     const res = await fetch(`https://api.zerobounce.net/v2/validate?api_key=${ZEROBOUNCE_KEY}&email=${encodeURIComponent(email)}`);
    //     const data = await res.json();
    //     results[email] = { status: data.status?.toLowerCase() ?? 'unknown', sub_status: data.sub_status };
    //   }
    //   return new Response(JSON.stringify({ results, provider: 'zerobounce' }), {
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // --- MOCK MODE: Basic syntax + disposable domain detection ---
    const disposableDomains = new Set([
      'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
      'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
      'dispostable.com', 'trashmail.com', 'maildrop.cc', '10minutemail.com',
    ]);

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      
      // Basic syntax check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        results[trimmed] = { status: 'invalid', sub_status: 'bad_syntax' };
        continue;
      }

      const domain = trimmed.split('@')[1];
      
      // Disposable domain check
      if (disposableDomains.has(domain)) {
        results[trimmed] = { status: 'disposable', sub_status: 'disposable_domain' };
        continue;
      }

      // Role-based address check (common spam traps)
      const localPart = trimmed.split('@')[0];
      const roleParts = ['abuse', 'postmaster', 'noreply', 'no-reply', 'mailer-daemon'];
      if (roleParts.includes(localPart)) {
        results[trimmed] = { status: 'abuse', sub_status: 'role_based' };
        continue;
      }

      // Default: valid in mock mode
      results[trimmed] = { status: 'valid' };
    }

    return new Response(JSON.stringify({ results, provider: 'mock' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
