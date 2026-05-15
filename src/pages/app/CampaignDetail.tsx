import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Send, CheckCheck, Play, Pause, Check, X, Edit, ShieldX,
  Mail, MessageSquare, Eye, Reply, Trophy, Sparkles, Gauge, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { LeadContextPanel } from '@/components/LeadContextPanel';

interface Campaign {
  id: string; name: string; status: string; playbook_id: string | null;
  playbook_type: string | null; lead_count: number | null; created_at: string;
  segment_json: any;
}

interface Lead {
  id: string; first_name: string | null; last_name: string | null; email: string | null;
  phone: string | null; company: string | null; source: string | null; stage: string | null;
  status: string | null; lead_value: number | null; revival_score: number | null;
  revival_bucket: string | null; best_channel: string | null; best_angle: string | null;
  suggested_cta: string | null; last_contacted_at: string | null; last_activity_at: string | null;
  no_show_flag: boolean | null; closed_lost_reason: string | null;
  enrichment_json: any;
}

interface MessageRow {
  id: string; lead_id: string; channel: string; subject: string | null; body: string;
  ai_rationale: string | null; ai_confidence_score: number | null; variant_label: string | null;
  approval_status: string; sent_at: string | null; opened_at: string | null;
  replied_at: string | null; clicked_at: string | null; delivered_at: string | null;
  created_at: string;
  send_error?: string | null; send_attempts?: number | null; last_attempt_at?: string | null;
  lead?: Lead;
}

interface Playbook {
  id: string; name: string; type: string; tone: string | null; cta: string | null;
}

interface Insight {
  insight_type: string; insight_key: string; win_rate: number | null;
  win_count: number | null; total_count: number | null;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [wonRevenue, setWonRevenue] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);

  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentWorkspace && id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, id]);

  async function fetchAll() {
    if (!currentWorkspace || !id) return;
    setLoading(true);
    try {
      const [campRes, msgRes, bookRes, dealRes, insRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', id).single(),
        supabase
          .from('messages')
          .select('*, lead:leads(*)')
          .eq('campaign_id', id)
          .order('created_at', { ascending: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('campaign_id', id),
        supabase.from('deal_outcomes').select('revenue_amount, outcome').eq('campaign_id', id),
        supabase.from('workspace_ai_insights').select('insight_type, insight_key, win_rate, win_count, total_count')
          .eq('workspace_id', currentWorkspace.id)
          .order('win_rate', { ascending: false })
          .limit(20),
      ]);

      if (campRes.error) throw campRes.error;
      setCampaign(campRes.data as Campaign);
      setMessages((msgRes.data ?? []) as unknown as MessageRow[]);
      setBookingsCount(bookRes.count ?? 0);
      const won = (dealRes.data ?? []).filter((d: any) => d.outcome === 'won')
        .reduce((s: number, d: any) => s + Number(d.revenue_amount || 0), 0);
      setWonRevenue(won);
      setInsights((insRes.data ?? []) as Insight[]);

      if (campRes.data?.playbook_id) {
        const { data: pb } = await supabase.from('playbooks')
          .select('id, name, type, tone, cta')
          .eq('id', campRes.data.playbook_id).single();
        setPlaybook(pb as Playbook | null);
      }
    } catch (err) {
      console.error('CampaignDetail fetch error:', err);
      toast({ title: 'Error loading campaign', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ----- Stats -----
  const stats = useMemo(() => {
    const total = messages.length;
    const approved = messages.filter(m => m.approval_status === 'approved').length;
    const pending = messages.filter(m => m.approval_status === 'pending').length;
    const sent = messages.filter(m => m.sent_at).length;
    const opened = messages.filter(m => m.opened_at).length;
    const replied = messages.filter(m => m.replied_at).length;
    const failed = messages.filter(m => !m.sent_at && (m.send_attempts ?? 0) > 0).length;
    const target = campaign?.lead_count ?? total;
    return { total, approved, pending, sent, opened, replied, failed, target };
  }, [messages, campaign]);

  // ----- Mutations -----
  async function updateStatus(status: string) {
    if (!campaign) return;
    await supabase.from('campaigns').update({ status: status as any }).eq('id', campaign.id);
    fetchAll();
  }

  async function approveMessage(m: MessageRow) {
    if (!user) return;
    setBusy(true);
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).eq('id', m.id);
    await logActivity('message_approved', m.id, m.lead_id);
    setBusy(false);
    fetchAll();
  }

  async function rejectMessage(m: MessageRow) {
    if (!user) return;
    setBusy(true);
    await supabase.from('messages').update({ approval_status: 'rejected', approved_by: user.id }).eq('id', m.id);
    await logActivity('message_rejected', m.id, m.lead_id);
    setBusy(false);
    fetchAll();
  }

  async function suppressLead(m: MessageRow) {
    if (!currentWorkspace) return;
    setBusy(true);
    await supabase.from('leads').update({ do_not_contact: true, revival_bucket: 'suppress' as any }).eq('id', m.lead_id);
    await supabase.from('messages').update({ approval_status: 'rejected' }).eq('id', m.id);
    await supabase.from('suppressions').insert({
      workspace_id: currentWorkspace.id, lead_id: m.lead_id, reason: 'Manually suppressed from campaign detail',
    });
    await logActivity('lead_suppressed', m.id, m.lead_id);
    toast({ title: '⊘ Lead suppressed' });
    setBusy(false);
    fetchAll();
  }

  function openEdit(m: MessageRow) {
    setEditing(m);
    setEditSubject(m.subject ?? '');
    setEditBody(m.body);
  }

  async function saveEdit() {
    if (!editing || !user) return;
    setBusy(true);
    await supabase.from('messages').update({
      subject: editSubject, body: editBody,
      approval_status: 'approved', approved_by: user.id,
    }).eq('id', editing.id);
    await logActivity('message_edited_approved', editing.id, editing.lead_id);
    toast({ title: '✓ Edited & approved' });
    setEditing(null);
    setBusy(false);
    fetchAll();
  }

  async function approveAll() {
    if (!user || !campaign) return;
    const ids = messages.filter(m => m.approval_status === 'pending').map(m => m.id);
    if (ids.length === 0) {
      toast({ title: 'Nothing to approve', description: 'No pending messages.' });
      return;
    }
    setBusy(true);
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).in('id', ids);
    toast({ title: `${ids.length} messages approved` });
    setBusy(false);
    fetchAll();
  }

  async function sendApproved() {
    if (!campaign || !currentWorkspace) return;
    const approvedUnsent = messages.filter(m => m.approval_status === 'approved' && !m.sent_at).length;
    if (approvedUnsent === 0) {
      toast({
        title: 'Nothing to send',
        description: stats.pending > 0
          ? `${stats.pending} message${stats.pending === 1 ? '' : 's'} still pending — approve them first.`
          : 'All approved messages have already been sent.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    toast({ title: 'Sending...', description: `Delivering ${approvedUnsent} approved message${approvedUnsent === 1 ? '' : 's'}` });
    const { data, error } = await supabase.functions.invoke('send-messages', {
      body: { campaign_id: campaign.id, workspace_id: currentWorkspace.id },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.reason === 'no_credentials') {
      toast({
        title: 'Email/SMS not configured',
        description: `Missing credentials for: ${(data.missing_providers || []).join(', ')}. Add them in Settings → Integrations.`,
        variant: 'destructive',
      });
      return;
    }
    const failNote = data?.failed ? ` · ${data.failed} failed${data.errors?.length ? `: ${data.errors[0]}` : ''}` : '';
    toast({ title: 'Sent', description: `${data?.sent ?? 0} delivered${failNote}` });
    fetchAll();
  }

  async function approveAndSend() {
    await approveAll();
    // small delay so DB sees the updates before send
    setTimeout(() => sendApproved(), 400);
  }

  async function retryMessages(ids: string[]) {
    if (!currentWorkspace || ids.length === 0) return;
    setBusy(true);
    toast({ title: 'Retrying...', description: `Resending ${ids.length} message${ids.length === 1 ? '' : 's'}` });
    const { data, error } = await supabase.functions.invoke('send-messages', {
      body: { workspace_id: currentWorkspace.id, message_ids: ids },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Retry failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.reason === 'no_credentials') {
      toast({ title: 'Email/SMS not configured', description: `Missing: ${(data.missing_providers || []).join(', ')}. Add them in Settings → Integrations.`, variant: 'destructive' });
      return;
    }
    const failNote = data?.failed ? ` · ${data.failed} failed` : '';
    toast({ title: 'Retry complete', description: `${data?.sent ?? 0} delivered${failNote}` });
    fetchAll();
  }

  async function logActivity(eventType: string, messageId: string, leadId?: string) {
    if (!currentWorkspace || !user) return;
    await supabase.from('activity_logs').insert({
      workspace_id: currentWorkspace.id,
      lead_id: leadId,
      user_id: user.id,
      event_type: eventType,
      payload_json: { message_id: messageId, campaign_id: campaign?.id },
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!campaign) {
    return <div className="text-center py-20"><p>Campaign not found.</p><Button asChild variant="link"><Link to="/app/campaigns">Back to campaigns</Link></Button></div>;
  }

  const openMessage = messages.find(m => m.id === openMessageId) || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link to="/app/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> All campaigns
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant="outline" className="capitalize">{campaign.status}</Badge>
            {playbook && <Badge variant="secondary" className="capitalize">{playbook.name} · {playbook.tone} · {playbook.cta?.replace('_', ' ')}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created {new Date(campaign.created_at).toLocaleDateString()} · {campaign.lead_count ?? 0} leads targeted
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {campaign.status === 'active' && (
            <Button variant="outline" size="sm" onClick={() => updateStatus('paused')}><Pause className="mr-1 h-3 w-3" /> Pause</Button>
          )}
          {campaign.status === 'paused' && (
            <Button variant="outline" size="sm" onClick={() => updateStatus('active')}><Play className="mr-1 h-3 w-3" /> Resume</Button>
          )}
          {campaign.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => updateStatus('active')}><Play className="mr-1 h-3 w-3" /> Activate</Button>
          )}
          <Button size="sm" variant="outline" onClick={approveAll} disabled={busy || stats.pending === 0}>
            <CheckCheck className="mr-1 h-3 w-3" /> Approve all ({stats.pending})
          </Button>
          <Button size="sm" onClick={approveAndSend} disabled={busy || (stats.pending === 0 && stats.approved === stats.sent)}>
            <Send className="mr-1 h-3 w-3" /> Approve all & Send
          </Button>
          <Button size="sm" variant="default" onClick={sendApproved} disabled={busy}>
            <Send className="mr-1 h-3 w-3" /> Send approved
          </Button>
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress funnel</CardTitle>
          <CardDescription>Live stats for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <FunnelStat label="Targeted" value={stats.target} />
            <FunnelStat label="Drafted" value={stats.total} max={stats.target} />
            <FunnelStat label="Approved" value={stats.approved} max={stats.target} />
            <FunnelStat label="Sent" value={stats.sent} max={stats.target} />
            <FunnelStat label="Opened" value={stats.opened} max={Math.max(stats.sent, 1)} />
            <FunnelStat label="Replied" value={stats.replied} max={Math.max(stats.sent, 1)} />
            <FunnelStat label="Booked" value={bookingsCount} max={Math.max(stats.sent, 1)} />
          </div>
          {wonRevenue > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-success" />
              <span className="font-medium">${wonRevenue.toLocaleString()}</span>
              <span className="text-muted-foreground">in won revenue from this campaign</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Messages ({messages.length})</CardTitle>
          <CardDescription>Click a row to see the AI rationale and lead context</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages generated for this campaign yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Channel</TableHead>
                  <TableHead>Subject / Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map(m => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => setOpenMessageId(m.id)}>
                    <TableCell>
                      <div className="font-medium text-sm">{m.lead?.first_name} {m.lead?.last_name}</div>
                      <div className="text-xs text-muted-foreground">{m.lead?.company || m.lead?.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="capitalize">
                        {m.channel === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {m.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="truncate text-sm font-medium">{m.subject || '—'}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.body}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={m.approval_status} />
                        {m.sent_at && <Badge variant="outline" className="text-[10px]"><Send className="h-2.5 w-2.5 mr-0.5" />sent</Badge>}
                        {m.opened_at && <Badge variant="outline" className="text-[10px]"><Eye className="h-2.5 w-2.5 mr-0.5" />opened</Badge>}
                        {m.replied_at && <Badge className="text-[10px] bg-success text-success-foreground"><Reply className="h-2.5 w-2.5 mr-0.5" />replied</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {m.ai_confidence_score ? (
                        <span className="text-xs inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{m.ai_confidence_score}%</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {m.approval_status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => approveMessage(m)} disabled={busy}><Check className="h-3 w-3" /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)} disabled={busy}><Edit className="h-3 w-3" /></Button>
                        {m.approval_status !== 'rejected' && (
                          <Button size="sm" variant="ghost" onClick={() => rejectMessage(m)} disabled={busy}><X className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!openMessageId} onOpenChange={(o) => !o && setOpenMessageId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {openMessage && (
            <>
              <SheetHeader>
                <SheetTitle>{openMessage.lead?.first_name} {openMessage.lead?.last_name}</SheetTitle>
                <SheetDescription>
                  {openMessage.lead?.company || openMessage.lead?.email} · {openMessage.channel}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="message" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="message">Message</TabsTrigger>
                  <TabsTrigger value="why">Why this works</TabsTrigger>
                  <TabsTrigger value="context">Lead context</TabsTrigger>
                </TabsList>

                <TabsContent value="message" className="space-y-3 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={openMessage.approval_status} />
                    {openMessage.sent_at && <Badge variant="outline">Sent {new Date(openMessage.sent_at).toLocaleString()}</Badge>}
                    {openMessage.opened_at && <Badge variant="outline">Opened {new Date(openMessage.opened_at).toLocaleString()}</Badge>}
                    {openMessage.replied_at && <Badge className="bg-success text-success-foreground">Replied</Badge>}
                  </div>
                  <div className="border rounded-lg p-4 space-y-2">
                    {openMessage.subject && <p className="font-semibold">{openMessage.subject}</p>}
                    <p className="text-sm whitespace-pre-wrap">{openMessage.body}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {openMessage.approval_status === 'pending' && (
                      <Button size="sm" onClick={() => approveMessage(openMessage)} disabled={busy}>
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(openMessage)} disabled={busy}>
                      <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    {openMessage.approval_status !== 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => rejectMessage(openMessage)} disabled={busy}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => suppressLead(openMessage)} disabled={busy}>
                      <ShieldX className="mr-1 h-3 w-3" /> Suppress lead
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="why" className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">AI reasoning for this draft</h3>
                  </div>
                  {openMessage.ai_rationale ? (
                    <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{openMessage.ai_rationale}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No rationale recorded.</p>
                  )}

                  {openMessage.ai_confidence_score && (
                    <div className="text-sm flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      <span className="font-medium">{openMessage.ai_confidence_score}% confidence</span>
                      <span className="text-muted-foreground">based on this workspace's history</span>
                    </div>
                  )}

                  {playbook && (
                    <div className="border rounded-lg p-3 text-sm space-y-1">
                      <p className="font-medium">Playbook applied</p>
                      <p className="text-muted-foreground">{playbook.name} — tone <span className="capitalize">{playbook.tone}</span>, CTA <span className="capitalize">{playbook.cta?.replace('_', ' ')}</span></p>
                    </div>
                  )}

                  {insights.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top patterns this workspace has learned</p>
                      <div className="space-y-1">
                        {insights.slice(0, 5).map((ins, i) => (
                          <div key={i} className="flex items-center justify-between text-xs border rounded px-2 py-1.5">
                            <span><span className="capitalize text-muted-foreground">{ins.insight_type}:</span> <span className="font-medium">{ins.insight_key}</span></span>
                            <span className="text-success font-medium">{Math.round(Number(ins.win_rate || 0) * 100)}% win · {ins.win_count}/{ins.total_count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="context" className="space-y-4 mt-4">
                  <LeadContextPanel lead={openMessage.lead} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit & approve message</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {editing.channel === 'email' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <Textarea value={editSubject} onChange={(e) => setEditSubject(e.target.value)} rows={1} />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Body</p>
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={busy}><Check className="mr-1 h-3 w-3" /> Save & approve</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FunnelStat({ label, value, max }: { label: string; value: number; max?: number }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {max !== undefined && <Progress value={pct} className="h-1" />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };
  return <Badge className={`text-[10px] capitalize ${map[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</Badge>;
}
