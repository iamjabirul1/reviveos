import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLAYBOOK_TYPES = [
  { value: 'stale_lead', label: 'Stale Lead Reactivation', emoji: '🔄' },
  { value: 'no_show', label: 'No-Show Rescue', emoji: '📅' },
  { value: 'closed_lost', label: 'Closed-Lost Comeback', emoji: '🔙' },
  { value: 'proposal_followup', label: 'Proposal Follow-Up', emoji: '📋' },
  { value: 'dormant_customer', label: 'Dormant Customer Re-engagement', emoji: '💤' },
];

const TONES = ['friendly', 'direct', 'consultative'];
const CTAS = ['book_call', 'reply', 'claim_offer', 'answer_question'];

interface SequenceStep {
  step: number;
  channel: string;
  label: string;
  delay_days: number;
}

interface Playbook {
  id: string;
  name: string;
  type: string;
  tone: string | null;
  cta: string | null;
  channels: unknown;
  active: boolean | null;
  sequence_json: unknown;
  created_at: string;
}

const DEFAULT_SEQUENCE: SequenceStep[] = [
  { step: 1, channel: 'email', label: 'Initial reach-out', delay_days: 0 },
  { step: 2, channel: 'email', label: 'Follow-up', delay_days: 3 },
  { step: 3, channel: 'sms', label: 'Quick nudge', delay_days: 2 },
  { step: 4, channel: 'email', label: 'Close the loop', delay_days: 5 },
];

export default function PlaybooksPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailPlaybook, setDetailPlaybook] = useState<Playbook | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('stale_lead');
  const [tone, setTone] = useState('friendly');
  const [cta, setCta] = useState('book_call');
  const [sequence, setSequence] = useState<SequenceStep[]>(DEFAULT_SEQUENCE);

  useEffect(() => {
    if (currentWorkspace) fetchPlaybooks();
  }, [currentWorkspace]);

  async function fetchPlaybooks() {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('playbooks').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
    setPlaybooks((data ?? []) as Playbook[]);
    setLoading(false);
  }

  function addStep() {
    setSequence(prev => [...prev, {
      step: prev.length + 1,
      channel: 'email',
      label: `Step ${prev.length + 1}`,
      delay_days: 3,
    }]);
  }

  function removeStep(index: number) {
    setSequence(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 })));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const newSeq = [...sequence];
    const target = index + direction;
    if (target < 0 || target >= newSeq.length) return;
    [newSeq[index], newSeq[target]] = [newSeq[target], newSeq[index]];
    setSequence(newSeq.map((s, i) => ({ ...s, step: i + 1 })));
  }

  function updateStep(index: number, field: keyof SequenceStep, value: string | number) {
    setSequence(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function createPlaybook() {
    if (!currentWorkspace || !name) return;
    const channels = [...new Set(sequence.map(s => s.channel))];
    const { error } = await supabase.from('playbooks').insert({
      workspace_id: currentWorkspace.id,
      name,
      type,
      tone,
      cta,
      channels: channels as any,
      sequence_json: sequence as any,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Playbook created' });
      setOpen(false);
      setName('');
      setSequence(DEFAULT_SEQUENCE);
      fetchPlaybooks();
    }
  }

  async function deletePlaybook(id: string) {
    await supabase.from('playbooks').delete().eq('id', id);
    fetchPlaybooks();
  }

  async function toggleActive(pb: Playbook) {
    await supabase.from('playbooks').update({ active: !pb.active }).eq('id', pb.id);
    fetchPlaybooks();
  }

  const typeLabel = (t: string) => PLAYBOOK_TYPES.find(p => p.value === t)?.label ?? t;
  const typeEmoji = (t: string) => PLAYBOOK_TYPES.find(p => p.value === t)?.emoji ?? '📖';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Playbooks</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Playbook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Playbook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Playbook Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Win-Back" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAYBOOK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CTA</Label>
                  <Select value={cta} onValueChange={setCta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CTAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sequence Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Sequence Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="mr-1 h-3 w-3" /> Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {sequence.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                      <div className="flex flex-col gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(i, 1)} disabled={i === sequence.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{s.step}</Badge>
                      <Select value={s.channel} onValueChange={(v) => updateStep(i, 'channel', v)}>
                        <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={s.label}
                        onChange={(e) => updateStep(i, 'label', e.target.value)}
                        className="h-8 flex-1"
                        placeholder="Step label"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          value={s.delay_days}
                          onChange={(e) => updateStep(i, 'delay_days', parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-center"
                          min={0}
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStep(i)} disabled={sequence.length <= 1}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={createPlaybook} className="w-full" disabled={!name}>Create Playbook</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : playbooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No playbooks yet</p>
            <p className="text-muted-foreground mb-4">Create your first playbook to define multi-step win-back sequences</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Playbook</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map(pb => {
            const steps = Array.isArray(pb.sequence_json) ? pb.sequence_json as SequenceStep[] : [];
            return (
              <Card key={pb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailPlaybook(pb)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{typeEmoji(pb.type)} {pb.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleActive(pb); }}>
                        <Badge className={pb.active ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                          {pb.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deletePlaybook(pb.id); }}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{typeLabel(pb.type)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <Badge variant="secondary" className="capitalize">{pb.tone}</Badge>
                    <Badge variant="outline" className="capitalize">{pb.cta?.replace('_', ' ')}</Badge>
                  </div>
                  {steps.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {steps.length} steps · {steps.filter(s => s.channel === 'email').length} emails · {steps.filter(s => s.channel === 'sms').length} SMS
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Playbook Detail Dialog */}
      <Dialog open={!!detailPlaybook} onOpenChange={() => setDetailPlaybook(null)}>
        <DialogContent className="max-w-lg">
          {detailPlaybook && (
            <>
              <DialogHeader>
                <DialogTitle>{typeEmoji(detailPlaybook.type)} {detailPlaybook.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{typeLabel(detailPlaybook.type)}</Badge>
                  <Badge variant="secondary" className="capitalize">{detailPlaybook.tone}</Badge>
                  <Badge variant="outline" className="capitalize">{detailPlaybook.cta?.replace('_', ' ')}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Sequence</p>
                  <div className="space-y-2">
                    {(Array.isArray(detailPlaybook.sequence_json) ? detailPlaybook.sequence_json as SequenceStep[] : []).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                        <Badge variant="secondary">{s.step}</Badge>
                        <Badge variant={s.channel === 'email' ? 'default' : 'outline'} className="capitalize">{s.channel}</Badge>
                        <span className="text-sm flex-1">{s.label}</span>
                        {s.delay_days > 0 && (
                          <span className="text-xs text-muted-foreground">+{s.delay_days}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
