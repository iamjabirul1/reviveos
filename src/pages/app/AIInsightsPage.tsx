import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Target, MessageSquare, Zap, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Insight {
  id: string;
  insight_type: string;
  insight_key: string;
  win_count: number;
  loss_count: number;
  total_count: number;
  win_rate: number;
  avg_revenue: number;
}

interface OutcomeStats {
  total: number;
  replied: number;
  booked: number;
  deal_won: number;
  no_response: number;
  totalRevenue: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AIInsightsPage() {
  const { currentWorkspace } = useWorkspace();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<OutcomeStats>({ total: 0, replied: 0, booked: 0, deal_won: 0, no_response: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) fetchAll();
  }, [currentWorkspace]);

  async function fetchAll() {
    if (!currentWorkspace) return;
    setLoading(true);

    const [insightsRes, outcomesRes] = await Promise.all([
      supabase
        .from('workspace_ai_insights')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('win_rate', { ascending: false }),
      supabase
        .from('message_outcomes')
        .select('outcome, revenue_amount, replied, booked, deal_won')
        .eq('workspace_id', currentWorkspace.id),
    ]);

    setInsights((insightsRes.data ?? []) as Insight[]);

    const outcomes = outcomesRes.data ?? [];
    setStats({
      total: outcomes.length,
      replied: outcomes.filter((o: any) => o.replied).length,
      booked: outcomes.filter((o: any) => o.booked).length,
      deal_won: outcomes.filter((o: any) => o.deal_won).length,
      no_response: outcomes.filter((o: any) => !o.replied && !o.booked && !o.deal_won).length,
      totalRevenue: outcomes.reduce((sum: number, o: any) => sum + (Number(o.revenue_amount) || 0), 0),
    });

    setLoading(false);
  }

  const getInsightsByType = (type: string) => insights.filter(i => i.insight_type === type);

  const funnelData = [
    { name: 'Sent', value: stats.total, color: 'hsl(var(--muted-foreground))' },
    { name: 'Replied', value: stats.replied, color: 'hsl(var(--primary))' },
    { name: 'Booked', value: stats.booked, color: 'hsl(var(--chart-2))' },
    { name: 'Won', value: stats.deal_won, color: 'hsl(var(--chart-3))' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI Learning Insights
        </h1>
        <p className="text-muted-foreground mt-1">Your AI gets smarter with every message. Here's what it has learned about your business.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Messages Tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">Booking Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue from AI Messages</p>
          </CardContent>
        </Card>
      </div>

      {stats.total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No learning data yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              As you send messages and record outcomes (replies, bookings, deals), the AI will learn what works best for your business.
              Go to the Approvals page to provide feedback on sent messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance"><BarChart3 className="h-4 w-4 mr-1" /> Performance</TabsTrigger>
            <TabsTrigger value="tones"><MessageSquare className="h-4 w-4 mr-1" /> Tones</TabsTrigger>
            <TabsTrigger value="ctas"><Target className="h-4 w-4 mr-1" /> CTAs</TabsTrigger>
            <TabsTrigger value="angles"><Zap className="h-4 w-4 mr-1" /> Angles</TabsTrigger>
            <TabsTrigger value="ab"><TrendingUp className="h-4 w-4 mr-1" /> A/B Results</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {funnelData.map((item, i) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                        <Progress value={stats.total > 0 ? (item.value / stats.total) * 100 : 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Outcome Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Won', value: stats.deal_won },
                          { name: 'Booked', value: stats.booked - stats.deal_won },
                          { name: 'Replied Only', value: stats.replied - stats.booked },
                          { name: 'No Response', value: stats.no_response },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[0, 1, 2, 3].map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tones">
            <InsightSection title="Tone Performance" description="Which tones get the best response rates" data={getInsightsByType('tone')} />
          </TabsContent>

          <TabsContent value="ctas">
            <InsightSection title="CTA Performance" description="Which calls-to-action drive the most engagement" data={getInsightsByType('cta')} />
          </TabsContent>

          <TabsContent value="angles">
            <InsightSection title="Angle Performance" description="Which messaging angles resonate most" data={getInsightsByType('angle')} />
          </TabsContent>

          <TabsContent value="ab">
            <InsightSection title="A/B Variant Performance" description="How variant A compares to variant B" data={getInsightsByType('variant')} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function InsightSection({ title, description, data }: { title: string; description: string; data: Insight[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No data yet for this category. Keep sending messages and recording outcomes!
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 8).map(d => ({
    name: d.insight_key,
    winRate: Math.round(d.win_rate * 100),
    total: d.total_count,
    avgRevenue: d.avg_revenue,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis unit="%" />
              <Tooltip formatter={(value: number, name: string) => [
                name === 'winRate' ? `${value}%` : value,
                name === 'winRate' ? 'Win Rate' : name
              ]} />
              <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {data.map(insight => (
          <Card key={insight.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={insight.win_rate >= 0.5 ? "default" : "secondary"} className="capitalize">
                  {insight.insight_key}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {insight.total_count} messages · {insight.win_count} wins
                </span>
              </div>
              <div className="flex items-center gap-4">
                {insight.avg_revenue > 0 && (
                  <span className="text-sm font-medium">${Math.round(insight.avg_revenue).toLocaleString()} avg</span>
                )}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={insight.win_rate * 100} className="h-2 flex-1" />
                  <span className="text-sm font-bold w-12 text-right">{Math.round(insight.win_rate * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
