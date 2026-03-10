import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign, TrendingUp, Target, Trophy, ArrowUpRight, Plus,
  Calculator, PieChart as PieChartIcon, BarChart3, Loader2, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

interface DealOutcome {
  id: string;
  workspace_id: string;
  lead_id: string;
  campaign_id: string | null;
  playbook_id: string | null;
  message_id: string | null;
  outcome: string;
  revenue_amount: number;
  currency: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  lead?: { first_name: string | null; last_name: string | null; company: string | null };
  campaign?: { name: string } | null;
  playbook?: { name: string; type: string } | null;
}

interface LeadOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
}

interface CampaignOption {
  id: string;
  name: string;
}

interface PlaybookOption {
  id: string;
  name: string;
  type: string;
}

export default function RevenuePage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<DealOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formLeadId, setFormLeadId] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');
  const [formPlaybookId, setFormPlaybookId] = useState('');
  const [formOutcome, setFormOutcome] = useState('won');
  const [formRevenue, setFormRevenue] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Dropdown options
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookOption[]>([]);

  // Subscription cost for ROI calc
  const [subscriptionCost, setSubscriptionCost] = useState(0);

  useEffect(() => {
    if (!currentWorkspace) return;
    fetchAll();
  }, [currentWorkspace]);

  async function fetchAll() {
    if (!currentWorkspace) return;
    setLoading(true);
    const wsId = currentWorkspace.id;

    const [dealsRes, leadsRes, campaignsRes, playbooksRes, subRes] = await Promise.all([
      supabase.from('deal_outcomes')
        .select('*, lead:leads(first_name, last_name, company), campaign:campaigns(name), playbook:playbooks(name, type)')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false }),
      supabase.from('leads').select('id, first_name, last_name, company').eq('workspace_id', wsId).order('first_name').limit(500),
      supabase.from('campaigns').select('id, name').eq('workspace_id', wsId).order('created_at', { ascending: false }),
      supabase.from('playbooks').select('id, name, type').eq('workspace_id', wsId),
      supabase.from('subscriptions').select('amount, billing_cycle').eq('workspace_id', wsId).eq('status', 'active').limit(1),
    ]);

    setDeals((dealsRes.data ?? []) as unknown as DealOutcome[]);
    setLeads((leadsRes.data ?? []) as LeadOption[]);
    setCampaigns((campaignsRes.data ?? []) as CampaignOption[]);
    setPlaybooks((playbooksRes.data ?? []) as PlaybookOption[]);

    // Estimate monthly cost
    if (subRes.data && subRes.data.length > 0) {
      const sub = subRes.data[0];
      setSubscriptionCost(sub.billing_cycle === 'annual' ? sub.amount / 12 : sub.amount);
    } else {
      setSubscriptionCost(0); // free plan
    }

    setLoading(false);
  }

  async function handleSubmit() {
    if (!currentWorkspace || !formLeadId) return;
    setSubmitting(true);
    
    const payload: any = {
      workspace_id: currentWorkspace.id,
      lead_id: formLeadId,
      outcome: formOutcome,
      revenue_amount: parseFloat(formRevenue) || 0,
      notes: formNotes || null,
      closed_at: formOutcome !== 'open' ? new Date().toISOString() : null,
    };
    if (formCampaignId) payload.campaign_id = formCampaignId;
    if (formPlaybookId) payload.playbook_id = formPlaybookId;

    const { error } = await supabase.from('deal_outcomes').insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deal recorded', description: `${formOutcome === 'won' ? '🎉 Revenue' : 'Deal'} recorded successfully` });
      setDialogOpen(false);
      resetForm();
      fetchAll();
    }
    setSubmitting(false);
  }

  function resetForm() {
    setFormLeadId('');
    setFormCampaignId('');
    setFormPlaybookId('');
    setFormOutcome('won');
    setFormRevenue('');
    setFormNotes('');
  }

  // Computed metrics
  const metrics = useMemo(() => {
    const wonDeals = deals.filter(d => d.outcome === 'won');
    const totalRevenue = wonDeals.reduce((s, d) => s + (d.revenue_amount || 0), 0);
    const totalDeals = deals.length;
    const wonCount = wonDeals.length;
    const lostCount = deals.filter(d => d.outcome === 'lost').length;
    const openCount = deals.filter(d => d.outcome === 'open').length;
    const winRate = totalDeals > 0 ? Math.round((wonCount / (wonCount + lostCount || 1)) * 100) : 0;
    const avgDealSize = wonCount > 0 ? totalRevenue / wonCount : 0;
    const roi = subscriptionCost > 0 ? Math.round(totalRevenue / subscriptionCost) : 0;

    return { totalRevenue, totalDeals, wonCount, lostCount, openCount, winRate, avgDealSize, roi };
  }, [deals, subscriptionCost]);

  // Revenue by campaign
  const revenueByCampaign = useMemo(() => {
    const map = new Map<string, number>();
    deals.filter(d => d.outcome === 'won' && d.campaign).forEach(d => {
      const name = (d.campaign as any)?.name || 'Uncategorized';
      map.set(name, (map.get(name) || 0) + (d.revenue_amount || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [deals]);

  // Revenue by playbook type
  const revenueByPlaybook = useMemo(() => {
    const map = new Map<string, number>();
    deals.filter(d => d.outcome === 'won' && d.playbook).forEach(d => {
      const type = (d.playbook as any)?.type || 'Unknown';
      map.set(type, (map.get(type) || 0) + (d.revenue_amount || 0));
    });
    return Array.from(map, ([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [deals]);

  // Monthly revenue trend
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    deals.filter(d => d.outcome === 'won' && d.closed_at).forEach(d => {
      const month = new Date(d.closed_at!).toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
      map.set(month, (map.get(month) || 0) + (d.revenue_amount || 0));
    });
    return Array.from(map, ([month, revenue]) => ({ month, revenue })).reverse().slice(-12);
  }, [deals]);

  const outcomeData = [
    { name: 'Won', value: metrics.wonCount, color: 'hsl(var(--success))' },
    { name: 'Lost', value: metrics.lostCount, color: 'hsl(var(--destructive))' },
    { name: 'Open', value: metrics.openCount, color: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-success" /> Revenue Attribution
          </h1>
          <p className="text-sm text-muted-foreground">
            Track exactly how much revenue ReviveOS recovers from dead leads
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Record Deal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Deal Outcome</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Lead *</Label>
                <Select value={formLeadId} onValueChange={setFormLeadId}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.first_name} {l.last_name} {l.company ? `(${l.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={formOutcome} onValueChange={setFormOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Won (Closed)</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="open">Open (In Progress)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Revenue Amount ($)</Label>
                <Input type="number" placeholder="0.00" value={formRevenue} onChange={e => setFormRevenue(e.target.value)} />
              </div>
              <div>
                <Label>Campaign (optional)</Label>
                <Select value={formCampaignId} onValueChange={setFormCampaignId}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {campaigns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Playbook (optional)</Label>
                <Select value={formPlaybookId} onValueChange={setFormPlaybookId}>
                  <SelectTrigger><SelectValue placeholder="Select playbook" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {playbooks.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes about this deal..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={!formLeadId || submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record Deal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue Recovered"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          subtitle={`${metrics.wonCount} deals won`}
          icon={DollarSign}
          color="text-success"
        />
        <KPICard
          label="ROI"
          value={metrics.roi > 0 ? `${metrics.roi}x` : '—'}
          subtitle={subscriptionCost > 0 ? `vs $${subscriptionCost.toFixed(0)}/mo cost` : 'Free plan'}
          icon={TrendingUp}
          color="text-primary"
        />
        <KPICard
          label="Win Rate"
          value={`${metrics.winRate}%`}
          subtitle={`${metrics.wonCount}W / ${metrics.lostCount}L`}
          icon={Trophy}
          color="text-warning"
        />
        <KPICard
          label="Avg Deal Size"
          value={`$${Math.round(metrics.avgDealSize).toLocaleString()}`}
          subtitle={`${metrics.openCount} deals in pipeline`}
          icon={Target}
          color="text-chart-3"
        />
      </div>

      {/* ROI Payback Banner */}
      {metrics.totalRevenue > 0 && subscriptionCost > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-success" />
              <div>
                <p className="font-semibold text-success">
                  ReviveOS paid for itself {metrics.roi}x over
                </p>
                <p className="text-sm text-muted-foreground">
                  You invested ${(subscriptionCost).toFixed(0)}/mo and recovered ${metrics.totalRevenue.toLocaleString()} in revenue from dead leads
                </p>
              </div>
            </div>
            <Calculator className="h-8 w-8 text-success/40" />
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Revenue Over Time
            </CardTitle>
            <CardDescription>Monthly recovered revenue from dead leads</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Record won deals to see revenue trends
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={12} className="fill-muted-foreground" />
                  <YAxis fontSize={12} className="fill-muted-foreground" tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" fill="hsl(var(--success) / 0.2)" stroke="hsl(var(--success))" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Outcome Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" /> Deal Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outcomeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No deals recorded yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {outcomeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {outcomeData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Campaign */}
      {revenueByCampaign.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Campaign</CardTitle>
            <CardDescription>Which campaigns generated the most recovered revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByCampaign} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" fontSize={11} className="fill-muted-foreground" angle={-15} />
                <YAxis fontSize={12} className="fill-muted-foreground" tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Playbook Type */}
      {revenueByPlaybook.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Playbook Type</CardTitle>
            <CardDescription>Which revival strategies generate the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByPlaybook} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" fontSize={12} className="fill-muted-foreground" tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" fontSize={12} className="fill-muted-foreground" width={100} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Deals Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Deal Outcomes</CardTitle>
          <CardDescription>{deals.length} total deals tracked</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {deals.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No deals recorded yet</p>
              <p className="text-muted-foreground mb-4">Record your first deal outcome to start tracking ROI</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Record First Deal
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Playbook</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map(deal => {
                  const lead = deal.lead as any;
                  const campaign = deal.campaign as any;
                  const playbook = deal.playbook as any;
                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        {lead?.first_name} {lead?.last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead?.company || '—'}</TableCell>
                      <TableCell className="text-sm">{campaign?.name || '—'}</TableCell>
                      <TableCell className="text-sm capitalize">{playbook?.type?.replace('_', ' ') || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={deal.outcome === 'won' ? 'default' : deal.outcome === 'lost' ? 'destructive' : 'secondary'}
                          className={deal.outcome === 'won' ? 'bg-success text-success-foreground' : ''}>
                          {deal.outcome === 'won' ? '🎉 Won' : deal.outcome === 'lost' ? 'Lost' : 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {deal.revenue_amount > 0 ? `$${deal.revenue_amount.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deal.closed_at ? new Date(deal.closed_at).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ label, value, subtitle, icon: Icon, color = 'text-primary' }: {
  label: string; value: string; subtitle: string; icon: any; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
