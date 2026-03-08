import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { getPlanDisplayName } from '@/lib/planLimits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Settings, Save, ShieldX, ScrollText, Building2, CreditCard,
  Check, ArrowUpRight, AlertTriangle, Loader2, Bell,
} from 'lucide-react';
import BusinessContextForm from '@/components/BusinessContextForm';
import NotificationPreferences from '@/components/NotificationPreferences';
import IntegrationSettings from '@/components/IntegrationSettings';
import AIUsageChart from '@/components/AIUsageChart';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Suppression {
  id: string;
  lead_id: string;
  reason: string;
  jurisdiction: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  event_type: string;
  user_id: string | null;
  payload_json: unknown;
  created_at: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  paypal_subscription_id: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const { currentWorkspace, refetch } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan, planName, limits, upgradePlan } = usePlanLimits();
  const [workspaceName, setWorkspaceName] = useState('');
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [playbookCount, setPlaybookCount] = useState(0);
  const [aiUsageToday, setAiUsageToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      fetchData();
    }
  }, [currentWorkspace]);

  async function fetchData() {
    if (!currentWorkspace || !user) return;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [suppRes, actRes, subRes, leadsRes, campRes, pbRes, aiRes] = await Promise.all([
      supabase.from('suppressions').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('subscriptions').select('*').eq('workspace_id', currentWorkspace.id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
      supabase.from('playbooks').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
      supabase.from('ai_usage_log').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id).gte('created_at', todayStart.toISOString()),
    ]);
    setSuppressions((suppRes.data ?? []) as Suppression[]);
    setActivityLogs((actRes.data ?? []) as ActivityLog[]);
    const subs = (subRes.data ?? []) as Subscription[];
    setSubscription(subs.length > 0 ? subs[0] : null);
    setLeadCount(leadsRes.count ?? 0);
    setCampaignCount(campRes.count ?? 0);
    setPlaybookCount(pbRes.count ?? 0);
    setAiUsageToday(aiRes.count ?? 0);
    setLoading(false);
  }

  async function saveWorkspace() {
    if (!currentWorkspace) return;
    await supabase.from('workspaces').update({ name: workspaceName }).eq('id', currentWorkspace.id);
    toast({ title: 'Workspace updated' });
    refetch();
  }

  async function removeSuppression(id: string, leadId: string) {
    await supabase.from('suppressions').delete().eq('id', id);
    await supabase.from('leads').update({ do_not_contact: false, revival_bucket: 'review_first' as any }).eq('id', leadId);
    toast({ title: 'Suppression removed' });
    fetchData();
  }

  async function sendNotificationEmail(type: string, details?: Record<string, unknown>) {
    if (!currentWorkspace) return;
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: { type, workspace_id: currentWorkspace.id, details },
      });
    } catch (err) {
      console.error('Failed to send notification email:', err);
    }
  }

  async function cancelSubscription() {
    if (!subscription) return;
    setCancelling(true);
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (currentWorkspace) {
        await supabase
          .from('workspaces')
          .update({ plan: 'free' })
          .eq('id', currentWorkspace.id);
      }

      await sendNotificationEmail('subscription_cancelled');

      toast({ title: 'Subscription cancelled', description: 'Your plan has been downgraded to Free. A confirmation email has been sent.' });
      refetch();
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel subscription. Please contact support.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  }

  const usageItems = [
    {
      label: 'Leads',
      current: leadCount,
      max: limits.maxLeads,
    },
    {
      label: 'Campaigns',
      current: campaignCount,
      max: limits.maxCampaigns,
    },
    {
      label: 'Playbooks',
      current: playbookCount,
      max: limits.maxPlaybooks,
    },
    {
      label: 'AI Calls (today)',
      current: aiUsageToday,
      max: limits.maxAICallsPerDay,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="billing">
        <TabsList className="flex-wrap">
          <TabsTrigger value="billing"><CreditCard className="mr-1.5 h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="business">Business Context</TabsTrigger>
          <TabsTrigger value="suppressions">Suppressions</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Billing / Subscription Tab */}
        <TabsContent value="billing" className="space-y-4">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant="secondary" className="capitalize text-sm">{planName}</Badge>
              </CardTitle>
              <CardDescription>
                {plan === 'free'
                  ? 'You are on the free plan. Upgrade to unlock more features.'
                  : `You are subscribed to the ${planName} plan.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Usage Overview */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Usage Overview</h4>
                {usageItems.map((item) => {
                  const isUnlimited = item.max === 'unlimited';
                  const pct = isUnlimited ? 0 : Math.min(100, (item.current / (item.max as number)) * 100);
                  const isNearLimit = !isUnlimited && pct >= 80;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className={`font-medium ${isNearLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.current.toLocaleString()} / {isUnlimited ? '∞' : (item.max as number).toLocaleString()}
                        </span>
                      </div>
                      {!isUnlimited && <Progress value={pct} className="h-2" />}
                      {isNearLimit && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Approaching limit
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Plan Features */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Plan Features</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Email channel', enabled: limits.channels.includes('email') },
                    { label: 'SMS channel', enabled: limits.channels.includes('sms') },
                    { label: 'Custom playbooks', enabled: limits.customPlaybooks },
                    { label: 'Bulk approvals', enabled: limits.bulkApprovals },
                    { label: 'Advanced analytics', enabled: limits.advancedAnalytics },
                    { label: 'CRM sync', enabled: limits.crmSync },
                    { label: 'Auto follow-ups', enabled: limits.autoFollowUps },
                    { label: 'Team seats', enabled: limits.teamSeats },
                    { label: 'Role-based approvals', enabled: limits.roleBasedApprovals },
                    { label: 'Report exports', enabled: limits.reportExports },
                    { label: 'Webhook integrations', enabled: limits.webhookIntegrations },
                    { label: 'Write with AI', enabled: limits.writeWithAI },
                  ].map((f) => (
                    <div key={f.label} className={`flex items-center gap-2 text-sm ${f.enabled ? '' : 'text-muted-foreground/50'}`}>
                      {f.enabled ? (
                        <Check className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={f.enabled ? '' : 'line-through'}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade CTA */}
              {upgradePlan && (
                <div className="border-t pt-4">
                  <Link to="/#pricing">
                    <Button>
                      Upgrade to {getPlanDisplayName(upgradePlan)} <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Usage Chart */}
          <AIUsageChart />

          {/* Subscription Details */}
          {subscription && subscription.status !== 'cancelled' && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>Manage your active subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plan</Label>
                    <p className="font-medium capitalize">{subscription.plan_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-medium">
                      ${subscription.amount}/{subscription.billing_cycle === 'annual' ? 'year' : 'month'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Billing Cycle</Label>
                    <p className="font-medium capitalize">{subscription.billing_cycle}</p>
                  </div>
                  {subscription.current_period_start && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Current Period Start</Label>
                      <p className="text-sm">{new Date(subscription.current_period_start).toLocaleDateString()}</p>
                    </div>
                  )}
                  {subscription.current_period_end && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Current Period End</Label>
                      <p className="text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                    </div>
                  )}
                  {subscription.paypal_subscription_id && (
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">PayPal Subscription ID</Label>
                      <p className="text-xs font-mono text-muted-foreground">{subscription.paypal_subscription_id}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelling}
                    onClick={cancelSubscription}
                  >
                    {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel Subscription
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cancelling will downgrade your workspace to the Free plan at the end of your current billing period.
                    {subscription.paypal_subscription_id && ' You may also need to cancel directly in your PayPal account.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No subscription */}
          {(!subscription || subscription.status === 'cancelled') && plan === 'free' && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No active subscription</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade your plan to unlock more leads, campaigns, and powerful features.
                </p>
                <Link to="/#pricing">
                  <Button>View Plans <ArrowUpRight className="ml-1.5 h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Manage your workspace details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{planName}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Button onClick={saveWorkspace}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <BusinessContextForm />
        </TabsContent>
        <TabsContent value="suppressions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suppression List</CardTitle>
              <CardDescription>{suppressions.length} leads currently suppressed</CardDescription>
            </CardHeader>
            <CardContent>
              {suppressions.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No suppressed leads</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppressions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.lead_id.slice(0, 8)}...</TableCell>
                        <TableCell>{s.reason}</TableCell>
                        <TableCell>{s.jurisdiction ?? '—'}</TableCell>
                        <TableCell>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeSuppression(s.id, s.lead_id)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Recent activity in this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <ScrollText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{log.event_type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.payload_json ? JSON.stringify(log.payload_json).slice(0, 80) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationSettings />

          <Card>
            <CardHeader>
              <CardTitle>CRM Webhook</CardTitle>
              <CardDescription>Send events from HubSpot, GoHighLevel, Shopify, or Calendly to sync leads automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook?source=hubspot`}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook?source=hubspot`);
                    toast({ title: 'Copied to clipboard' });
                  }}>Copy</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Change <code>?source=hubspot</code> to <code>?source=gohighlevel</code>, <code>?source=shopify</code>, or <code>?source=calendly</code> as needed.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Supported Events</Label>
                <div className="flex flex-wrap gap-2">
                  {['contact_updated', 'deal_updated', 'booking_created', 'reply_received', 'shopify_order', 'shopify_customer'].map(evt => (
                    <Badge key={evt} variant="outline" className="font-mono text-xs">{evt}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Example Payload</Label>
                <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
{JSON.stringify({
  workspace_id: currentWorkspace?.id ?? '<workspace_id>',
  event_type: 'contact_updated',
  email: 'lead@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  company: 'Acme Inc',
  deal_value: 5000,
}, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
