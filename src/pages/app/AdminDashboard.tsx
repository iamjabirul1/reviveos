import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, AlertTriangle, Activity, Loader2 } from 'lucide-react';

// Plan daily limits (mirror of DB function)
const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 10,
  starter: 50,
  growth: 500,
  scale: 2000,
};

interface WorkspaceStats {
  workspace_id: string;
  workspace_name: string;
  plan: string;
  total_calls: number;
  by_function: Record<string, number>;
  by_day: Record<string, number>;
}

interface AdminData {
  period_days: number;
  total_calls: number;
  total_workspaces: number;
  daily_totals: Array<{ date: string; calls: number }>;
  workspaces: WorkspaceStats[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) checkAdminAndFetch();
  }, [user]);

  async function checkAdminAndFetch() {
    if (!user) return;

    // Check admin role client-side for UI gating
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data: result, error: fnError } = await supabase.functions.invoke('admin-ai-usage', {
      body: null,
    });

    if (fnError) {
      setError(fnError.message);
    } else {
      setData(result as AdminData);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Error loading data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.daily_totals.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calls: d.calls,
  }));

  // Flag workspaces with suspicious usage (>70% of daily limit consistently)
  const flaggedWorkspaces = data.workspaces.filter((ws) => {
    const dailyLimit = PLAN_DAILY_LIMITS[ws.plan] || 10;
    const avgDaily = ws.total_calls / data.period_days;
    return avgDaily > dailyLimit * 0.7;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin — AI Usage Monitor</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total AI Calls (30d)</div>
            <div className="text-3xl font-bold mt-1">{data.total_calls.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active Workspaces</div>
            <div className="text-3xl font-bold mt-1">{data.total_workspaces}</div>
          </CardContent>
        </Card>
        <Card className={flaggedWorkspaces.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              {flaggedWorkspaces.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              Flagged Workspaces
            </div>
            <div className={`text-3xl font-bold mt-1 ${flaggedWorkspaces.length > 0 ? 'text-destructive' : ''}`}>
              {flaggedWorkspaces.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Global AI Usage — Last 30 Days
          </CardTitle>
          <CardDescription>Aggregated across all workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={4} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="calls" name="AI Calls" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Workspaces */}
      {flaggedWorkspaces.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Flagged for High Usage
            </CardTitle>
            <CardDescription>Workspaces averaging &gt;70% of their daily limit</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Total Calls</TableHead>
                  <TableHead>Avg/Day</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedWorkspaces.map((ws) => {
                  const dailyLimit = PLAN_DAILY_LIMITS[ws.plan] || 10;
                  const avgDaily = Math.round(ws.total_calls / data.period_days);
                  const pct = Math.round((avgDaily / dailyLimit) * 100);
                  return (
                    <TableRow key={ws.workspace_id}>
                      <TableCell className="font-medium">{ws.workspace_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{ws.plan}</Badge></TableCell>
                      <TableCell>{ws.total_calls.toLocaleString()}</TableCell>
                      <TableCell className="font-mono">{avgDaily}</TableCell>
                      <TableCell className="font-mono">{dailyLimit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={Math.min(100, pct)} className="h-2 flex-1" />
                          <span className="text-xs font-medium text-destructive">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Workspaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Workspace Usage</CardTitle>
          <CardDescription>Ranked by total AI calls in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {data.workspaces.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No AI usage recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Total Calls</TableHead>
                  <TableHead>Generate</TableHead>
                  <TableHead>Enrich</TableHead>
                  <TableHead>Write</TableHead>
                  <TableHead>Avg/Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workspaces.map((ws) => (
                  <TableRow key={ws.workspace_id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{ws.workspace_name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{ws.plan}</Badge></TableCell>
                    <TableCell className="font-mono font-medium">{ws.total_calls.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{ws.by_function['generate-messages'] || 0}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{ws.by_function['enrich-leads'] || 0}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{ws.by_function['write-with-ai'] || 0}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{Math.round(ws.total_calls / data.period_days)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
