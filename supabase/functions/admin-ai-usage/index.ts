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

    const userId = claimsData.claims.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: hasAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all usage logs with workspace info
    const { data: logs, error: logsErr } = await supabase
      .from("ai_usage_log")
      .select("workspace_id, function_name, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (logsErr) throw logsErr;

    // Get all workspaces
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name, plan, owner_user_id");

    const wsMap: Record<string, { name: string; plan: string }> = {};
    (workspaces ?? []).forEach((ws) => {
      wsMap[ws.id] = { name: ws.name, plan: ws.plan };
    });

    // Aggregate per workspace
    const perWorkspace: Record<string, { total: number; by_function: Record<string, number>; by_day: Record<string, number> }> = {};

    (logs ?? []).forEach((log) => {
      if (!perWorkspace[log.workspace_id]) {
        perWorkspace[log.workspace_id] = { total: 0, by_function: {}, by_day: {} };
      }
      const ws = perWorkspace[log.workspace_id];
      ws.total++;
      ws.by_function[log.function_name] = (ws.by_function[log.function_name] || 0) + 1;
      const day = new Date(log.created_at).toISOString().split("T")[0];
      ws.by_day[day] = (ws.by_day[day] || 0) + 1;
    });

    // Build response
    const workspaceStats = Object.entries(perWorkspace)
      .map(([wsId, stats]) => ({
        workspace_id: wsId,
        workspace_name: wsMap[wsId]?.name || "Unknown",
        plan: wsMap[wsId]?.plan || "free",
        total_calls: stats.total,
        by_function: stats.by_function,
        by_day: stats.by_day,
      }))
      .sort((a, b) => b.total_calls - a.total_calls);

    // Daily totals across all workspaces
    const dailyTotals: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      dailyTotals[d.toISOString().split("T")[0]] = 0;
    }
    (logs ?? []).forEach((log) => {
      const day = new Date(log.created_at).toISOString().split("T")[0];
      if (dailyTotals[day] !== undefined) dailyTotals[day]++;
    });

    return new Response(JSON.stringify({
      period_days: days,
      total_calls: (logs ?? []).length,
      total_workspaces: Object.keys(perWorkspace).length,
      daily_totals: Object.entries(dailyTotals).map(([date, calls]) => ({ date, calls })),
      workspaces: workspaceStats,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-ai-usage error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
