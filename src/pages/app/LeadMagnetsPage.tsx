import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Question { id: string; label: string; type: string; required?: boolean; placeholder?: string; }
interface Magnet { id: string; name: string; slug: string; headline: string | null; subhead: string | null; report_prompt: string; questions_json: Question[]; cta_label: string | null; cta_url: string | null; is_active: boolean; }

export default function LeadMagnetsPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [selected, setSelected] = useState<Magnet | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Magnet | null>(null);

  useEffect(() => { if (currentWorkspace) loadAll(); }, [currentWorkspace]);
  async function loadAll() {
    const { data: m } = await supabase.from("lead_magnets").select("*").eq("workspace_id", currentWorkspace!.id).order("created_at", { ascending: false });
    setMagnets((m ?? []) as any);
    const { data: s } = await supabase.from("lead_magnet_submissions").select("*").eq("workspace_id", currentWorkspace!.id).order("created_at", { ascending: false }).limit(100);
    setSubs(s ?? []);
    if (m?.[0] && !selected) setSelected(m[0] as any);
  }

  function newMagnet() {
    setDraft({
      id: "", name: "Custom Roadmap", slug: `roadmap-${Math.random().toString(36).slice(2, 7)}`,
      headline: "Get your custom 90-day roadmap", subhead: "Answer a few questions. We'll send a personalized plan.",
      report_prompt: "You are a B2B strategist. Based on the answers, produce a 90-day roadmap with: diagnosis, top 3 levers, weekly plan, and one-page CEO summary.",
      questions_json: [
        { id: "biz", label: "What does your business do?", type: "textarea", required: true },
        { id: "rev", label: "Current monthly revenue?", type: "text" },
        { id: "goal", label: "Top goal in next 90 days?", type: "textarea", required: true },
      ],
      cta_label: "Book a 15-min call", cta_url: "", is_active: true,
    });
    setEditorOpen(true);
  }

  function editMagnet(m: Magnet) { setDraft({ ...m }); setEditorOpen(true); }

  async function saveMagnet() {
    if (!draft || !currentWorkspace) return;
    const payload = { ...draft, workspace_id: currentWorkspace.id } as any;
    let res;
    if (draft.id) res = await supabase.from("lead_magnets").update(payload).eq("id", draft.id);
    else { delete payload.id; res = await supabase.from("lead_magnets").insert(payload); }
    if (res.error) { toast({ title: "Save failed", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    setEditorOpen(false); loadAll();
  }

  async function removeMagnet(id: string) {
    if (!confirm("Delete this magnet?")) return;
    await supabase.from("lead_magnets").delete().eq("id", id);
    loadAll();
  }

  function publicUrl(slug: string) { return `${window.location.origin}/roadmap/${slug}`; }
  function reportUrl(share: string) { return `${window.location.origin}/roadmap/r/${share}`; }

  const visibleSubs = selected ? subs.filter(s => s.magnet_id === selected.id) : subs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Lead Magnets</h1>
          <p className="text-sm text-muted-foreground">Public questionnaire → AI-generated roadmap → emailed report.</p>
        </div>
        <Button onClick={newMagnet}><Plus className="h-4 w-4 mr-1" /> New magnet</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {magnets.map(m => (
          <Card key={m.id} className={`cursor-pointer ${selected?.id === m.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelected(m)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base truncate">{m.name}</CardTitle>
                {m.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground truncate">/{m.slug}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); editMagnet(m); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(publicUrl(m.slug)); toast({ title: "Link copied" }); }}><Copy className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" asChild><a href={publicUrl(m.slug)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-3 w-3" /></a></Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeMagnet(m.id); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {magnets.length === 0 && (
          <Card className="md:col-span-3"><CardContent className="text-center py-10 text-muted-foreground">No magnets yet. Click "New magnet" to create your first.</CardContent></Card>
        )}
      </div>

      {selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Submissions · {selected.name}</CardTitle></CardHeader>
          <CardContent>
            {visibleSubs.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : (
              <div className="divide-y">
                {visibleSubs.map(s => (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name} · <span className="text-muted-foreground font-normal">{s.email}</span></p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {s.status}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild><a href={reportUrl(s.share_slug)} target="_blank" rel="noreferrer">View report <ExternalLink className="ml-1 h-3 w-3" /></a></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit magnet" : "New magnet"}</DialogTitle></DialogHeader>
          {draft && (
            <Tabs defaultValue="basics">
              <TabsList><TabsTrigger value="basics">Basics</TabsTrigger><TabsTrigger value="questions">Questions</TabsTrigger><TabsTrigger value="prompt">AI Prompt</TabsTrigger></TabsList>
              <TabsContent value="basics" className="space-y-3">
                <div><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                <div><Label>Slug (URL)</Label><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
                <div><Label>Headline</Label><Input value={draft.headline ?? ""} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} /></div>
                <div><Label>Subhead</Label><Input value={draft.subhead ?? ""} onChange={(e) => setDraft({ ...draft, subhead: e.target.value })} /></div>
                <div><Label>CTA label</Label><Input value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} /></div>
                <div><Label>CTA URL (book call etc.)</Label><Input value={draft.cta_url ?? ""} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} placeholder="https://cal.com/you" /></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /><Label>Active</Label></div>
              </TabsContent>
              <TabsContent value="questions" className="space-y-3">
                {(draft.questions_json ?? []).map((q, i) => (
                  <Card key={i}><CardContent className="pt-4 space-y-2">
                    <div className="flex gap-2"><Input placeholder="id" className="w-32" value={q.id} onChange={(e) => updateQ(i, { id: e.target.value })} />
                    <select className="h-10 rounded-md border bg-background px-2 text-sm" value={q.type} onChange={(e) => updateQ(i, { type: e.target.value })}>
                      <option value="text">text</option><option value="textarea">textarea</option><option value="email">email</option><option value="number">number</option><option value="select">select</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!q.required} onChange={(e) => updateQ(i, { required: e.target.checked })} /> required</label>
                    <Button size="sm" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="h-3 w-3" /></Button></div>
                    <Input placeholder="Question label" value={q.label} onChange={(e) => updateQ(i, { label: e.target.value })} />
                  </CardContent></Card>
                ))}
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, questions_json: [...draft.questions_json, { id: `q${draft.questions_json.length + 1}`, label: "", type: "text" }] })}><Plus className="h-3 w-3 mr-1" /> Add question</Button>
              </TabsContent>
              <TabsContent value="prompt">
                <Label>Report system prompt (tells AI how to build the roadmap)</Label>
                <Textarea rows={12} value={draft.report_prompt} onChange={(e) => setDraft({ ...draft, report_prompt: e.target.value })} />
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 pt-3"><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button onClick={saveMagnet}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function updateQ(i: number, patch: Partial<Question>) {
    if (!draft) return;
    const next = [...draft.questions_json];
    next[i] = { ...next[i], ...patch };
    setDraft({ ...draft, questions_json: next });
  }
  function removeQ(i: number) {
    if (!draft) return;
    setDraft({ ...draft, questions_json: draft.questions_json.filter((_, k) => k !== i) });
  }
}
