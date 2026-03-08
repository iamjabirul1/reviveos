import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface DayUsage {
  date: string;
  calls: number;
}

export default function AIUsageChart() {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<DayUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) fetchUsageData();
  }, [currentWorkspace]);

  async function fetchUsageData() {
    if (!currentWorkspace) return;
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs } = await supabase
      .from('ai_usage_log')
      .select('created_at')
      .eq('workspace_id', currentWorkspace.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const grouped: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    (logs ?? []).forEach((log) => {
      const key = new Date(log.created_at).toISOString().split('T')[0];
      if (grouped[key] !== undefined) {
        grouped[key]++;
      }
    });

    setData(
      Object.entries(grouped).map(([date, calls]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls,
      }))
    );
    setLoading(false);
  }

  const totalCalls = data.reduce((sum, d) => sum + d.calls, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Usage — Last 30 Days</CardTitle>
        <CardDescription>
          {totalCalls.toLocaleString()} total AI calls across all functions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalCalls === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No AI usage recorded yet. AI calls from message generation, lead enrichment, and writing will appear here.
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar
                  dataKey="calls"
                  name="AI Calls"
                  fill="hsl(var(--primary))"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
