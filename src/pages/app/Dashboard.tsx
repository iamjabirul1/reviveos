import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Mail, CalendarCheck, DollarSign, ShieldX, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Metrics {
  totalLeads: number;
  reviveNow: number;
  reviewFirst: number;
  nurtureLater: number;
  suppressed: number;
  messagesSent: number;
  replies: number;
  bookings: number;
  pipelineValue: number;
}

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState<Metrics>({
    totalLeads: 0, reviveNow: 0, reviewFirst: 0, nurtureLater: 0,
    suppressed: 0, messagesSent: 0, replies: 0, bookings: 0, pipelineValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    fetchMetrics();
  }, [currentWorkspace]);

  async function fetchMetrics() {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    // Use count queries to avoid 1000-row limit
    const [
      totalRes, reviveRes, reviewRes, nurtureRes, suppressRes,
      sentRes, repliedRes, bookingsRes, valueRes,
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'revive_now'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'review_first'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'nurture_later'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('revival_bucket', 'suppress'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('sent_at', 'is', null),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).not('replied_at', 'is', null),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('bookings').select('estimated_value').eq('workspace_id', wsId),
    ]);

    const pipelineValue = (valueRes.data ?? []).reduce((sum, b) => sum + (b.estimated_value ?? 0), 0);

    setMetrics({
      totalLeads: totalRes.count ?? 0,
      reviveNow: reviveRes.count ?? 0,
      reviewFirst: reviewRes.count ?? 0,
      nurtureLater: nurtureRes.count ?? 0,
      suppressed: suppressRes.count ?? 0,
      messagesSent: sentRes.count ?? 0,
      replies: repliedRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
      pipelineValue,
    });
    setLoading(false);
  }

  const bucketData = [
    { name: 'Revive Now', value: metrics.reviveNow, color: 'hsl(142, 71%, 45%)' },
    { name: 'Review First', value: metrics.reviewFirst, color: 'hsl(38, 92%, 50%)' },
    { name: 'Nurture Later', value: metrics.nurtureLater, color: 'hsl(220, 70%, 50%)' },
    { name: 'Suppress', value: metrics.suppressed, color: 'hsl(0, 72%, 51%)' },
  ];

  const kpis = [
    { label: 'Recoverable Now', value: metrics.reviveNow, icon: Zap, color: 'text-success' },
    { label: 'Messages Sent', value: metrics.messagesSent, icon: Mail, color: 'text-primary' },
    { label: 'Replies', value: metrics.replies, icon: MessageSquare, color: 'text-info' },
    { label: 'Meetings Booked', value: metrics.bookings, icon: CalendarCheck, color: 'text-success' },
    { label: 'Revived Pipeline', value: `$${metrics.pipelineValue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
    { label: 'Suppressed', value: metrics.suppressed, icon: ShieldX, color: 'text-destructive' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (metrics.totalLeads === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Zap className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-3">Welcome to ReviveOS</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Import your first leads to start recovering dormant revenue.
        </p>
        <a href="/app/import">
          <Badge className="text-base px-6 py-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
            Import Leads →
          </Badge>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revival Buckets</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={bucketData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {bucketData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Bucket</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bucketData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bucketData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
