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
import { Megaphone, Plus, Play, Pause, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  playbook_type: string | null;
  status: string;
  lead_count: number | null;
  created_at: string;
}

export default function CampaignsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [playbookType, setPlaybookType] = useState('stale_lead');

  useEffect(() => {
    if (currentWorkspace) fetchCampaigns();
  }, [currentWorkspace]);

  async function fetchCampaigns() {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('campaigns').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  }

  async function createCampaign() {
    if (!currentWorkspace || !name || !user) return;
    // Count leads that match revive_now for this campaign
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', currentWorkspace.id).eq('revival_bucket', 'revive_now');

    const { error } = await supabase.from('campaigns').insert({
      workspace_id: currentWorkspace.id,
      name,
      playbook_type: playbookType,
      lead_count: count ?? 0,
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Generate mock messages for top leads
      const { data: topLeads } = await supabase.from('leads').select('id')
        .eq('workspace_id', currentWorkspace.id).eq('revival_bucket', 'revive_now').limit(10);
      
      if (topLeads && topLeads.length > 0) {
        const { data: newCampaign } = await supabase.from('campaigns').select('id')
          .eq('workspace_id', currentWorkspace.id).eq('name', name).limit(1).single();
        
        if (newCampaign) {
          const messages = topLeads.map(lead => ({
            workspace_id: currentWorkspace.id,
            lead_id: lead.id,
            campaign_id: newCampaign.id,
            channel: 'email' as const,
            subject: `Re: Quick question about your goals`,
            body: `Hi there,\n\nI noticed we connected a while back but didn't get the chance to continue our conversation. I wanted to reach out because I think there might be a great fit here.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`,
            ai_rationale: 'Lead scored high for revival based on recent activity and timing signals.',
          }));
          await supabase.from('messages').insert(messages);
        }
      }

      toast({ title: 'Campaign created', description: `${count ?? 0} leads targeted` });
      setOpen(false);
      setName('');
      fetchCampaigns();
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('campaigns').update({ status: status as any }).eq('id', id);
    fetchCampaigns();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="March Win-Back" />
              </div>
              <div className="space-y-2">
                <Label>Playbook Type</Label>
                <Select value={playbookType} onValueChange={setPlaybookType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stale_lead">Stale Lead Reactivation</SelectItem>
                    <SelectItem value="no_show">No-Show Rescue</SelectItem>
                    <SelectItem value="closed_lost">Closed-Lost Comeback</SelectItem>
                    <SelectItem value="proposal_followup">Proposal Follow-Up</SelectItem>
                    <SelectItem value="dormant_customer">Dormant Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">This will target all "Revive Now" leads and generate AI draft messages for review.</p>
              <Button onClick={createCampaign} className="w-full" disabled={!name}>Create & Generate Messages</Button>
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
                <div className="flex gap-2">
                  {c.status === 'draft' && (
                    <Button size="sm" onClick={() => updateStatus(c.id, 'active')}>
                      <Play className="mr-1 h-3 w-3" /> Activate
                    </Button>
                  )}
                  {c.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'paused')}>
                      <Pause className="mr-1 h-3 w-3" /> Pause
                    </Button>
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
