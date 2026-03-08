import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users, MessageSquare, Mail, CalendarCheck, DollarSign, ShieldX, Zap,
  TrendingUp, ArrowUpRight, ArrowRight, Clock, Target, Send, Eye, MousePointerClick,
  AlertTriangle, Sparkles, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';

interface Metrics {
  totalLeads: number;
  reviveNow: number;
  reviewFirst: number;
  nurtureLater: number;
  suppressed: number;
  messagesSent: number;
  messagesDelivered: number;
  opens: number;
  clicks: number;
  replies: number;
  bookings: number;
  pipelineValue: number;
  pendingApprovals: number;
  activeCampaigns: number;
}

interface RecentLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  revival_score: number | null;
  revival_bucket: string | null;
  best_angle: string | null;
  created_at: string;
}

interface RecentActivity {
  id: string;
  event_type: string;
  created_at: string;
  payload_json: any;
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  lead_count: number | null;
}

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({
    totalLeads: 0, reviveNow: 0, reviewFirst: 0, nurtureLater: 0,
    suppressed: 0, messagesSent: 0, messagesDelivered: 0, opens: 0,
    clicks: 0, replies: 0, bookings: 0, pipelineValue: 0,
    pendingApprovals: 0, activeCampaigns: 0,
  });
  const [topLeads, setTopLeads] = useState<RecentLead[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    fetchAll();
  }, [currentWorkspace]);

  async function fetchAll() {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    try {
    const [
      totalRes, reviveRes, reviewRes, nurtureRes, suppressRes,
      sentRes, deliveredRes, openedRes, clickedRes, repliedRes,
      bookingsRes, valueRes, pendingRes, activeCampRes,
      topLeadsRes, activityRes, campaignsRes,
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'revive_now'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'review_first'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'nurture_later'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'suppress'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('sent_at', 'is', null),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('delivered_at', 'is', null),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('opened_at', 'is', null),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('clicked_at', 'is', null),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('replied_at', 'is', null),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('bookings').select('estimated_value').eq('workspace_id', wsId),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('approval_status', 'pending'),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('status', 'active'),
      supabase.from('leads').select('id, first_name, last_name, company, revival_score, revival_bucket, best_angle, created_at')
        .eq('workspace_id', wsId).order('revival_score', { ascending: false }).limit(5),
      supabase.from('activity_logs').select('id, event_type, created_at, payload_json')
        .eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(8),
      supabase.from('campaigns').select('id, name, status, lead_count')
        .eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(5),
    ]);

    const pipelineValue = (valueRes.data ?? []).reduce((sum, b) => sum + (b.estimated_value ?? 0), 0);

    setMetrics({
      totalLeads: totalRes.count ?? 0,
      reviveNow: reviveRes.count ?? 0,
      reviewFirst: reviewRes.count ?? 0,
      nurtureLater: nurtureRes.count ?? 0,
      suppressed: suppressRes.count ?? 0,
      messagesSent: sentRes.count ?? 0,
      messagesDelivered: deliveredRes.count ?? 0,
      opens: openedRes.count ?? 0,
      clicks: clickedRes.count ?? 0,
      replies: repliedRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
      pipelineValue,
      pendingApprovals: pendingRes.count ?? 0,
      activeCampaigns: activeCampRes.count ?? 0,
    });
    setTopLeads((topLeadsRes.data ?? []) as RecentLead[]);
    setRecentActivity((activityRes.data ?? []) as RecentActivity[]);
    setCampaigns((campaignsRes.data ?? []) as CampaignSummary[]);
    setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setLoading(false);
    }
  }

  const pct = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100);

  const replyRate = pct(metrics.replies, metrics.messagesSent);
  const openRate = pct(metrics.opens, metrics.messagesSent);
  const clickRate = pct(metrics.clicks, metrics.messagesSent);
  const bookingRate = pct(metrics.bookings, metrics.replies || 1);

  const bucketData = [
    { name: 'Revive Now', value: metrics.reviveNow, color: 'hsl(var(--success))' },
    { name: 'Review First', value: metrics.reviewFirst, color: 'hsl(var(--warning))' },
    { name: 'Nurture Later', value: metrics.nurtureLater, color: 'hsl(var(--chart-1))' },
    { name: 'Suppress', value: metrics.suppressed, color: 'hsl(var(--destructive))' },
  ];

  const funnelData = [
    { stage: 'Sent', value: metrics.messagesSent, icon: Send },
    { stage: 'Delivered', value: metrics.messagesDelivered, icon: Mail },
    { stage: 'Opened', value: metrics.opens, icon: Eye },
    { stage: 'Clicked', value: metrics.clicks, icon: MousePointerClick },
    { stage: 'Replied', value: metrics.replies, icon: MessageSquare },
    { stage: 'Booked', value: metrics.bookings, icon: CalendarCheck },
  ];

  const bucketStatusLabel = (bucket: string | null) => {
    switch (bucket) {
      case 'revive_now': return { label: 'Revive Now', variant: 'default' as const };
      case 'review_first': return { label: 'Review', variant: 'secondary' as const };
      case 'nurture_later': return { label: 'Nurture', variant: 'outline' as const };
      default: return { label: 'Suppress', variant: 'destructive' as const };
    }
  };

  const eventIcon = (type: string) => {
    if (type.includes('import')) return Users;
    if (type.includes('message') || type.includes('send')) return Send;
    if (type.includes('reply')) return MessageSquare;
    if (type.includes('book')) return CalendarCheck;
    if (type.includes('campaign')) return Target;
    return Zap;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="h-9 w-36 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-40 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (metrics.totalLeads === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Zap className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-3">Welcome to ReviveOS</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Import your first leads to start recovering dormant revenue.
        </p>
        <Button size="lg" onClick={() => navigate('/app/import')}>
          Import Leads <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {metrics.totalLeads.toLocaleString()} leads · {metrics.activeCampaigns} active campaigns
          </p>
        </div>
        <div className="flex gap-2">
          {metrics.pendingApprovals > 0 && (
            <Button variant="outline" onClick={() => navigate('/app/approvals')} className="gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {metrics.pendingApprovals} Pending
            </Button>
          )}
          <Button onClick={() => navigate('/app/campaigns')} className="gap-2">
            <Sparkles className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HighlightCard
          label="Recoverable Pipeline"
          value={`$${metrics.pipelineValue.toLocaleString()}`}
          subtitle={`${metrics.reviveNow} leads ready now`}
          icon={DollarSign}
          trend={metrics.reviveNow > 0 ? 'up' : undefined}
          color="text-success"
        />
        <HighlightCard
          label="Reply Rate"
          value={`${replyRate}%`}
          subtitle={`${metrics.replies} / ${metrics.messagesSent} messages`}
          icon={MessageSquare}
          trend={replyRate > 5 ? 'up' : undefined}
          color="text-primary"
        />
        <HighlightCard
          label="Meetings Booked"
          value={metrics.bookings.toString()}
          subtitle={`${bookingRate}% conversion from replies`}
          icon={CalendarCheck}
          trend={metrics.bookings > 0 ? 'up' : undefined}
          color="text-info"
        />
        <HighlightCard
          label="Open Rate"
          value={`${openRate}%`}
          subtitle={`${metrics.opens} opened of ${metrics.messagesSent}`}
          icon={Eye}
          color="text-chart-4"
        />
      </div>

      {/* Engagement Funnel + Revival Buckets */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Funnel */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Engagement Funnel
            </CardTitle>
            <CardDescription>Message lifecycle from send to booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {funnelData.map((step, i) => {
                const rate = i === 0 ? 100 : pct(step.value, funnelData[0].value);
                return (
                  <div key={step.stage} className="text-center">
                    <div className="relative mx-auto w-full">
                      <div className="h-24 flex items-end justify-center">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${Math.max(rate, 5)}%`,
                            background: `hsl(var(--chart-${(i % 5) + 1}))`,
                            opacity: 0.8 + (i * 0.04),
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <step.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                      <p className="text-xs font-medium mt-1">{step.value}</p>
                      <p className="text-[10px] text-muted-foreground">{step.stage}</p>
                      {i > 0 && (
                        <p className="text-[10px] text-muted-foreground font-medium">{rate}%</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revival Buckets Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Revival Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={bucketData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                >
                  {bucketData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {bucketData.map(b => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                    <span className="text-muted-foreground">{b.name}</span>
                  </div>
                  <span className="font-semibold">{b.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Leads + Activity Feed + Campaigns */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Revival Leads */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" /> Top Revival Leads
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/leads')} className="text-xs">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No scored leads yet</p>
            ) : (
              topLeads.map(lead => {
                const bucket = bucketStatusLabel(lead.revival_bucket);
                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/app/leads')}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.first_name || 'Unknown'} {lead.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.company || lead.best_angle || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{lead.revival_score ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground">score</p>
                      </div>
                      <Badge variant={bucket.variant} className="text-[10px]">{bucket.label}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              recentActivity.map(a => {
                const Icon = eventIcon(a.event_type);
                const timeAgo = getTimeAgo(a.created_at);
                return (
                  <div key={a.id} className="flex items-start gap-3 py-1.5">
                    <div className="mt-0.5 p-1 rounded bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium capitalize">
                        {a.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Campaigns
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/campaigns')} className="text-xs">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No campaigns yet</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/app/campaigns')}>
                  Create First Campaign
                </Button>
              </div>
            ) : (
              campaigns.map(c => {
                const statusColor = c.status === 'active' ? 'default' : c.status === 'draft' ? 'secondary' : 'outline';
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/app/campaigns')}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.lead_count ?? 0} leads</p>
                    </div>
                    <Badge variant={statusColor as any} className="capitalize text-[10px]">{c.status}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Performance Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Message Performance Overview</CardTitle>
          <CardDescription>Breakdown of engagement across all messages</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="stage" fontSize={12} className="fill-muted-foreground" />
              <YAxis fontSize={12} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction label="Import Leads" icon={Users} onClick={() => navigate('/app/import')} />
        <QuickAction label="Review Approvals" icon={Mail} onClick={() => navigate('/app/approvals')} count={metrics.pendingApprovals} />
        <QuickAction label="View Analytics" icon={TrendingUp} onClick={() => navigate('/app/analytics')} />
        <QuickAction label="Manage Playbooks" icon={Target} onClick={() => navigate('/app/playbooks')} />
      </div>
    </div>
  );
}

function HighlightCard({
  label, value, subtitle, icon: Icon, trend, color = 'text-primary',
}: {
  label: string; value: string; subtitle: string; icon: any; trend?: 'up'; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${color}`} />
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-success" />}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ label, icon: Icon, onClick, count }: { label: string; icon: any; onClick: () => void; count?: number }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-4 flex flex-col items-center gap-2 relative"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Button>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
