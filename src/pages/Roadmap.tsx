import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question { id: string; label: string; type: "text" | "textarea" | "email" | "number" | "select"; options?: string[]; required?: boolean; placeholder?: string; }
interface Magnet { id: string; name: string; slug: string; headline: string | null; subhead: string | null; questions_json: Question[]; cta_label: string | null; }

export default function Roadmap() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [magnet, setMagnet] = useState<Magnet | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      let q = supabase.from("lead_magnets").select("*").eq("is_active", true);
      if (slug) q = q.eq("slug", slug);
      const { data } = await q.order("created_at", { ascending: true }).limit(1).maybeSingle();
      setMagnet(data as any);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!magnet) return <div className="min-h-screen flex items-center justify-center text-center p-8"><div><h1 className="text-2xl font-bold mb-2">No active roadmap funnel</h1><p className="text-muted-foreground">Ask the team for a direct link.</p></div></div>;

  const questions = Array.isArray(magnet.questions_json) ? magnet.questions_json : [];
  const total = questions.length + 1; // +1 contact
  const isContactStep = step === questions.length;
  const progress = Math.round(((step + 1) / total) * 100);

  async function submit() {
    if (!magnet) return;
    if (!contact.name || !contact.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-roadmap", {
        body: { magnet_id: magnet.id, name: contact.name, email: contact.email, phone: contact.phone || null, answers },
      });
      if (error) throw error;
      navigate(`/roadmap/r/${(data as any).share_slug}`);
    } catch (e: any) {
      toast({ title: "Couldn't build your roadmap", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  function next() {
    if (!isContactStep) {
      const q = questions[step];
      if (q.required && !answers[q.id]) { toast({ title: "Please answer to continue", variant: "destructive" }); return; }
      setStep(step + 1);
    } else { submit(); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
            <Sparkles className="h-3 w-3" /> Custom Roadmap
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{magnet.headline || magnet.name}</h1>
          {magnet.subhead && <p className="text-muted-foreground mt-2">{magnet.subhead}</p>}
        </div>

        <Card>
          <CardHeader>
            <Progress value={progress} className="h-1.5" />
            <CardTitle className="text-base mt-3">
              {isContactStep ? "Where should we send it?" : questions[step]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isContactStep ? (
              <>
                <div><Label>Your name</Label><Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Jane Doe" /></div>
                <div><Label>Email</Label><Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="jane@company.com" /></div>
                <div><Label>Phone (optional)</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
              </>
            ) : (
              <QuestionField
                q={questions[step]}
                value={answers[questions[step].id] ?? ""}
                onChange={(v) => setAnswers({ ...answers, [questions[step].id]: v })}
              />
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || submitting}>Back</Button>
              <Button onClick={next} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building…</> : isContactStep ? <>{magnet.cta_label || "Get my roadmap"} <ArrowRight className="ml-2 h-4 w-4" /></> : <>Next <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">Step {step + 1} of {total}</p>
      </div>
    </div>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: any; onChange: (v: any) => void }) {
  if (q.type === "textarea") return <Textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />;
  if (q.type === "select") return (
    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {(q.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return <Input type={q.type === "number" ? "number" : q.type === "email" ? "email" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />;
}
