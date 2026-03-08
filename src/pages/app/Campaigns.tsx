import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Megaphone, Plus, Play, Pause, CheckCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { LimitReached } from '@/components/UpgradePrompt';

interface Campaign {
  id: string;
  name: string;
  playbook_type: string | null;
  playbook_id: string | null;
  status: string;
  lead_count: number | null;
  segment_json: any;
  created_at: string;
}

interface Playbook {
  id: string;
  name: string;
  type: string;
  tone: string | null;
  cta: string | null;
  active: boolean | null;
}

export default function CampaignsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits, upgradePlan, canAddCampaign, canUseChannel } = usePlanLimits();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState('');
  const [targetBucket, setTargetBucket] = useState('revive_now');
  const [scoreRange, setScoreRange] = useState([50, 100]);
  const [maxLeads, setMaxLeads] = useState(50);
  const [matchingLeadCount, setMatchingLeadCount] = useState<number | null>(null);
  const [leadsWithoutContact, setLeadsWithoutContact] = useState(0);

  useEffect(() => {
    if (currentWorkspace) {
      fetchCampaigns();
      fetchPlaybooks();
    }
  }, [currentWorkspace]);

  // Live preview of matching leads when filters change
  useEffect(() => {
    if (!currentWorkspace || !open) return;
    async function countLeads() {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace!.id)
        .eq('revival_bucket', targetBucket as any)
        .gte('revival_score', scoreRange[0])
        .lte('revival_score', scoreRange[1]);
      setMatchingLeadCount(count ?? 0);

      // Check how many leads have no contact info
      const { count: noContact } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace!.id)
        .is('email', null)
        .is('phone', null);
      setLeadsWithoutContact(noContact ?? 0);
    }
    countLeads();
  }, [currentWorkspace, targetBucket, scoreRange, open]);

  async function fetchCampaigns() {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('campaigns').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  }

  async function fetchPlaybooks() {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('playbooks').select('id, name, type, tone, cta, active').eq('workspace_id', currentWorkspace.id).eq('active', true);
    setPlaybooks((data ?? []) as Playbook[]);
  }

  async function createCampaign() {
    if (!currentWorkspace || !name || !user || !selectedPlaybookId) return;
    setCreating(true);

    const selectedPlaybook = playbooks.find(p => p.id === selectedPlaybookId);
    if (!selectedPlaybook) return;

    // Build lead query with filters
    let query = supabase.from('leads').select('*')
      .eq('workspace_id', currentWorkspace.id)
      .eq('revival_bucket', targetBucket as any)
      .gte('revival_score', scoreRange[0])
      .lte('revival_score', scoreRange[1])
      .limit(maxLeads);

    const { data: targetLeads, count } = await query;
    const leads = targetLeads ?? [];

    const segmentFilter = { bucket: targetBucket, score_min: scoreRange[0], score_max: scoreRange[1], max_leads: maxLeads };

    const { data: newCampaign, error } = await supabase.from('campaigns').insert({
      workspace_id: currentWorkspace.id,
      name,
      playbook_id: selectedPlaybookId,
      playbook_type: selectedPlaybook.type,
      lead_count: leads.length,
      segment_json: segmentFilter as any,
      created_by: user.id,
    }).select('id').single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    // Generate AI messages using playbook config
    if (leads.length > 0 && newCampaign) {
      toast({ title: 'Generating AI messages...', description: `Drafting personalized messages for ${leads.length} leads` });

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('generate-messages', {
        body: {
          leads,
          playbook_type: selectedPlaybook.type,
          tone: selectedPlaybook.tone || 'friendly',
          cta: selectedPlaybook.cta || 'book_call',
        },
      });

      if (aiError || !aiResult?.messages) {
        console.error('AI generation failed, using fallbacks:', aiError);
        const messages = leads.map(lead => ({
          workspace_id: currentWorkspace.id,
          lead_id: lead.id,
          campaign_id: newCampaign.id,
          channel: 'email' as const,
          subject: `Re: Quick question, ${lead.first_name || 'there'}`,
          body: `Hi ${lead.first_name || 'there'},\n\nI noticed we connected a while back but didn't get the chance to continue our conversation. I wanted to reach out because I think there might still be a great fit here.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`,
          ai_rationale: 'Template message — AI generation was unavailable.',
        }));
        await supabase.from('messages').insert(messages);
      } else {
        const messages = aiResult.messages.map((msg: any) => ({
          workspace_id: currentWorkspace.id,
          lead_id: msg.lead_id,
          campaign_id: newCampaign.id,
          channel: 'email' as const,
          subject: msg.email_subject,
          body: msg.email_body,
          ai_rationale: msg.rationale,
        }));
        await supabase.from('messages').insert(messages);
      }
    }

    toast({ title: 'Campaign created', description: `${leads.length} leads targeted with AI-generated messages` });
    setOpen(false);
    setName('');
    setSelectedPlaybookId('');
    setCreating(false);
    fetchCampaigns();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('campaigns').update({ status: status as any }).eq('id', id);
    fetchCampaigns();
  }

  async function sendCampaign(campaignId: string) {
    if (!currentWorkspace) return;
    toast({ title: 'Sending...', description: 'Delivering approved messages via email' });
    const { data, error } = await supabase.functions.invoke('send-messages', {
      body: { campaign_id: campaignId, workspace_id: currentWorkspace.id },
    });
    if (error) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campaign sent', description: `${data?.sent ?? 0} delivered, ${data?.failed ?? 0} failed` });
      fetchCampaigns();
    }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-success text-success-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {!canAddCampaign(campaigns.length) && (
        <LimitReached resource="Campaigns" current={campaigns.length} max={limits.maxCampaigns} upgradePlan={upgradePlan} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {campaigns.length}{limits.maxCampaigns !== 'unlimited' ? ` / ${limits.maxCampaigns}` : ''} campaigns
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => {
          if (o && !canAddCampaign(campaigns.length)) {
            toast({ title: 'Campaign limit reached', description: 'Upgrade your plan to create more campaigns.', variant: 'destructive' });
            return;
          }
          setOpen(o);
        }}>
          <DialogTrigger asChild>
            <Button disabled={!canAddCampaign(campaigns.length)}>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="March Win-Back" />
              </div>

              <div className="space-y-2">
                <Label>Playbook</Label>
                {playbooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active playbooks. Create one in the Playbooks page first.</p>
                ) : (
                  <Select value={selectedPlaybookId} onValueChange={setSelectedPlaybookId}>
                    <SelectTrigger><SelectValue placeholder="Select a playbook..." /></SelectTrigger>
                    <SelectContent>
                      {playbooks.map(pb => (
                        <SelectItem key={pb.id} value={pb.id}>
                          {pb.name} ({pb.type.replace('_', ' ')}) · {pb.tone} · {pb.cta?.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Bucket</Label>
                <Select value={targetBucket} onValueChange={setTargetBucket}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revive_now">Revive Now (highest priority)</SelectItem>
                    <SelectItem value="review_first">Review First</SelectItem>
                    <SelectItem value="nurture_later">Nurture Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Score Range: {scoreRange[0]} – {scoreRange[1]}</Label>
                <Slider
                  value={scoreRange}
                  onValueChange={setScoreRange}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Leads</Label>
                <Input type="number" value={maxLeads} onChange={(e) => setMaxLeads(parseInt(e.target.value) || 10)} min={1} max={500} />
              </div>

              {/* Live lead count preview */}
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">
                  {matchingLeadCount !== null ? (
                    matchingLeadCount > 0 ? (
                      <span className="text-success">{Math.min(matchingLeadCount, maxLeads)} leads will be targeted</span>
                    ) : (
                      <span className="text-destructive">0 leads match these filters</span>
                    )
                  ) : 'Counting matching leads...'}
                </p>
                {leadsWithoutContact > 0 && (
                  <p className="text-xs text-warning">⚠ {leadsWithoutContact} leads have no email or phone and are auto-suppressed. Re-import with contact info to include them.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  AI will deeply research each lead's company and craft hyper-personalized messages.
                </p>
              </div>
              <Button onClick={createCampaign} className="w-full" disabled={!name || !selectedPlaybookId || creating || matchingLeadCount === 0}>
                {creating ? 'Creating...' : 'Create & Generate Messages'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-muted-foreground mb-4">Create your first campaign to start reaching out to leads</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge className={statusColor(c.status)}>{statusIcon(c.status)} {c.status}</Badge>
                </div>
                <CardDescription className="capitalize">{c.playbook_type?.replace('_', ' ')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{c.lead_count ?? 0} leads targeted</p>
                <div className="flex gap-2 flex-wrap">
                  {c.status === 'draft' && (
                    <Button size="sm" onClick={() => updateStatus(c.id, 'active')}>
                      <Play className="mr-1 h-3 w-3" /> Activate
                    </Button>
                  )}
                  {c.status === 'active' && (
                    <>
                      <Button size="sm" onClick={() => sendCampaign(c.id)}>
                        <Send className="mr-1 h-3 w-3" /> Send
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'paused')}>
                        <Pause className="mr-1 h-3 w-3" /> Pause
                      </Button>
                    </>
                  )}
                  {c.status === 'paused' && (
                    <Button size="sm" onClick={() => updateStatus(c.id, 'active')}>
                      <Play className="mr-1 h-3 w-3" /> Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
