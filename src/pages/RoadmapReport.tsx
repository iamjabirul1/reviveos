import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoadmapReport() {
  const { share } = useParams<{ share: string }>();
  const [sub, setSub] = useState<any>(null);
  const [magnet, setMagnet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lead_magnet_submissions")
        .select("*")
        .eq("share_slug", share!)
        .maybeSingle();
      setSub(data);
      if (data?.magnet_id) {
        const { data: m } = await supabase.from("lead_magnets").select("*").eq("id", data.magnet_id).maybeSingle();
        setMagnet(m);
      }
      setLoading(false);
    })();
  }, [share]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!sub) return <div className="min-h-screen flex items-center justify-center"><p>Report not found.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{magnet?.name || "Custom Roadmap"}</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {sub.status !== "ready" ? (
          <div className="text-center py-20">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Your roadmap is being generated…</p>
          </div>
        ) : (
          <>
            {sub.report_summary && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm">{sub.report_summary}</p>
              </div>
            )}
            <article
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8"
              dangerouslySetInnerHTML={{ __html: sub.report_html || "" }}
            />
            {magnet?.cta_url && (
              <div className="mt-10 border-t pt-8 text-center">
                <Button asChild size="lg">
                  <a href={magnet.cta_url} target="_blank" rel="noreferrer">{magnet.cta_label || "Book a call"}</a>
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
