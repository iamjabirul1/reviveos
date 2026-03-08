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
import { BookOpen, Plus, Trash2 } from 'lucide-react';
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

export default function PlaybooksPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('stale_lead');
  const [tone, setTone] = useState('friendly');
  const [cta, setCta] = useState('book_call');

  useEffect(() => {
    if (currentWorkspace) fetchPlaybooks();
  }, [currentWorkspace]);

  async function fetchPlaybooks() {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('playbooks').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
    setPlaybooks((data ?? []) as Playbook[]);
    setLoading(false);
  }

  async function createPlaybook() {
    if (!currentWorkspace || !name) return;
    const sequence = [
      { step: 1, channel: 'email', label: 'Email 1 — Initial reach-out' },
      { step: 2, channel: 'email', label: 'Email 2 — Follow-up' },
      { step: 3, channel: 'sms', label: 'SMS — Quick nudge' },
      { step: 4, channel: 'email', label: 'Final — Close the loop' },
    ];
    const { error } = await supabase.from('playbooks').insert({
      workspace_id: currentWorkspace.id,
      name,
      type,
      tone,
      cta,
      channels: ['email', 'sms'],
      sequence_json: sequence,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Playbook created' });
      setOpen(false);
      setName('');
      fetchPlaybooks();
    }
  }

  async function deletePlaybook(id: string) {
    await supabase.from('playbooks').delete().eq('id', id);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Playbook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Playbook Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Win-Back Campaign" />
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
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Sequence Preview</p>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Email 1 — Initial reach-out</li>
                  <li>2. Email 2 — Follow-up</li>
                  <li>3. SMS — Quick nudge</li>
                  <li>4. Email — Close the loop</li>
                </ol>
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
            <p className="text-muted-foreground mb-4">Create your first playbook to start generating win-back sequences</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Playbook</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map(pb => (
            <Card key={pb.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{typeEmoji(pb.type)} {pb.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deletePlaybook(pb.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <CardDescription>{typeLabel(pb.type)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">{pb.tone}</Badge>
                  <Badge variant="outline" className="capitalize">{pb.cta?.replace('_', ' ')}</Badge>
                  {pb.active && <Badge className="bg-success text-success-foreground">Active</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
