import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendBrevoEmail } from "../_shared/brevo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  magnet_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  answers: z.record(z.any()),
});

function slug(len = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

function mdToHtml(md: string): string {
  // Minimal markdown -> HTML (headings, bold, italics, lists, paragraphs).
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${esc(line.replace(/^\s*[-*]\s+/, ""))}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (/^###\s+/.test(line)) html += `<h3>${esc(line.replace(/^###\s+/, ""))}</h3>`;
    else if (/^##\s+/.test(line)) html += `<h2>${esc(line.replace(/^##\s+/, ""))}</h2>`;
    else if (/^#\s+/.test(line)) html += `<h1>${esc(line.replace(/^#\s+/, ""))}</h1>`;
    else if (line.trim() === "") html += "";
    else html += `<p>${esc(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { magnet_id, name, email, phone, answers } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: magnet, error: mErr } = await supabase
      .from("lead_magnets").select("*").eq("id", magnet_id).eq("is_active", true).maybeSingle();
    if (mErr || !magnet) {
      return new Response(JSON.stringify({ error: "Magnet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert lead by email in workspace.
    const [first, ...rest] = name.split(" ");
    const last = rest.join(" ") || null;
    let leadId: string | null = null;
    const { data: existing } = await supabase.from("leads")
      .select("id").eq("workspace_id", magnet.workspace_id).eq("email", email).maybeSingle();
    if (existing) {
      leadId = existing.id;
      await supabase.from("leads").update({
        first_name: first, last_name: last, phone: phone ?? null, source: "lead_magnet",
        last_activity_at: new Date().toISOString(),
      }).eq("id", leadId);
    } else {
      const { data: ins, error: lErr } = await supabase.from("leads").insert({
        workspace_id: magnet.workspace_id,
        first_name: first, last_name: last, email, phone: phone ?? null,
        source: "lead_magnet", status: "new",
      }).select("id").single();
      if (lErr) throw lErr;
      leadId = ins.id;
    }

    const share = slug();
    const { data: sub, error: sErr } = await supabase.from("lead_magnet_submissions").insert({
      workspace_id: magnet.workspace_id,
      magnet_id, lead_id: leadId, name, email, phone: phone ?? null,
      answers_json: answers, share_slug: share, status: "generating",
    }).select("id").single();
    if (sErr) throw sErr;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let reportMd = "";
    let summary = "";
    if (LOVABLE_API_KEY) {
      const sys = `You are an elite B2B strategist. Generate a custom, actionable roadmap report based on the prospect's answers.
Use the founder's system prompt below to set tone, structure, and offer framing.
Output strict markdown. Start with an H1 title using the prospect's first name, then sections with H2 headings.
Be specific, no fluff. End with a single-sentence summary line prefixed exactly: SUMMARY: ...`;
      const userMsg = `## Founder system prompt\n${magnet.report_prompt || "Build a personalized 90-day roadmap."}\n\n## Prospect\nName: ${name}\nEmail: ${email}\n\n## Answers\n${JSON.stringify(answers, null, 2)}`;
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        }),
      });
      if (aiRes.ok) {
        const j = await aiRes.json();
        reportMd = j.choices?.[0]?.message?.content ?? "";
        const m = reportMd.match(/SUMMARY:\s*(.+)$/m);
        summary = m?.[1]?.trim() ?? "";
        reportMd = reportMd.replace(/^SUMMARY:.*$/m, "").trim();
      } else {
        console.error("AI error", await aiRes.text());
      }
    }

    if (!reportMd) {
      reportMd = `# ${name}, your custom roadmap\n\nWe captured your answers and will follow up shortly.`;
      summary = "Roadmap generated.";
    }

    const reportHtml = mdToHtml(reportMd);

    await supabase.from("lead_magnet_submissions").update({
      report_html: reportHtml, report_summary: summary, status: "ready",
    }).eq("id", sub.id);

    // Deliver via Brevo (best-effort).
    const origin = req.headers.get("origin") || "";
    const reportUrl = `${origin}/roadmap/r/${share}`;
    try {
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h1 style="font-size:22px;margin:0 0 12px">Your roadmap is ready, ${name}</h1>
          <p style="font-size:15px;line-height:1.6;color:#4a4a4a;margin:0 0 16px">${summary || "We've built a personalized plan based on your answers."}</p>
          <p style="margin:24px 0">
            <a href="${reportUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open my roadmap</a>
          </p>
          <p style="font-size:12px;color:#999;margin-top:24px">Or paste this link into your browser: ${reportUrl}</p>
        </div>`;
      const sent = await sendBrevoEmail({
        to: email,
        subject: `${name.split(" ")[0]}, your custom roadmap is ready`,
        html,
      });
      if (!sent.success) console.warn("email send failed", sent.error);
    } catch (e) {
      console.warn("email send skipped", e);
    }

    return new Response(JSON.stringify({ share_slug: share }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-roadmap error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
