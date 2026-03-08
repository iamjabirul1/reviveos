import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    bucketBreakdown: [] as { name: string; value: number; color: string }[],
    messageStats: { sent: 0, approved: 0, rejected: 0, pending: 0 },
    revenueTimeline: [] as { date: string; value: number }[],
  });

  useEffect(() => {
    if (currentWorkspace) fetchAnalytics();
  }, [currentWorkspace]);

  async function fetchAnalytics() {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    const [leadsRes, msgsRes, bookingsRes] = await Promise.all([
      supabase.from('leads').select('revival_bucket, source, stage').eq('workspace_id', wsId),
      supabase.from('messages').select('approval_status, sent_at').eq('workspace_id', wsId),
      supabase.from('bookings').select('estimated_value, booked_at').eq('workspace_id', wsId),
    ]);

    const leads = leadsRes.data ?? [];
    const msgs = msgsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];

    const bucketCounts = { revive_now: 0, review_first: 0, nurture_later: 0, suppress: 0 };
    leads.forEach(l => { if (l.revival_bucket) bucketCounts[l.revival_bucket as keyof typeof bucketCounts]++; });

    const bucketBreakdown = [
      { name: 'Revive Now', value: bucketCounts.revive_now, color: 'hsl(142, 71%, 45%)' },
      { name: 'Review First', value: bucketCounts.review_first, color: 'hsl(38, 92%, 50%)' },
      { name: 'Nurture Later', value: bucketCounts.nurture_later, color: 'hsl(220, 70%, 50%)' },
      { name: 'Suppress', value: bucketCounts.suppress, color: 'hsl(0, 72%, 51%)' },
    ];

    const messageStats = {
      sent: msgs.filter(m => m.sent_at).length,
      approved: msgs.filter(m => m.approval_status === 'approved').length,
      rejected: msgs.filter(m => m.approval_status === 'rejected').length,
      pending: msgs.filter(m => m.approval_status === 'pending').length,
    };

    // Revenue timeline (group by date)
    const revenueMap: Record<string, number> = {};
    bookings.forEach(b => {
      const date = b.booked_at ? new Date(b.booked_at).toLocaleDateString() : 'Unknown';
      revenueMap[date] = (revenueMap[date] ?? 0) + (b.estimated_value ?? 0);
    });
    const revenueTimeline = Object.entries(revenueMap).map(([date, value]) => ({ date, value }));

    setData({ bucketBreakdown, messageStats, revenueTimeline });
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const msgChartData = [
    { name: 'Approved', value: data.messageStats.approved, color: 'hsl(142, 71%, 45%)' },
    { name: 'Pending', value: data.messageStats.pending, color: 'hsl(38, 92%, 50%)' },
    { name: 'Rejected', value: data.messageStats.rejected, color: 'hsl(0, 72%, 51%)' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {data.bucketBreakdown.every(b => b.value === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-muted-foreground">Import leads and run campaigns to see analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Lead Buckets</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.bucketBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {data.bucketBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Message Approval Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={msgChartData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {msgChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {data.revenueTimeline.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue Recovered Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.revenueTimeline}>
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(142, 71%, 45%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
