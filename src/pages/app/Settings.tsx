import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, ShieldX, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function SettingsPage() {
  const { currentWorkspace, refetch } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useState('');
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      fetchData();
    }
  }, [currentWorkspace]);

  async function fetchData() {
    if (!currentWorkspace) return;
    const [suppRes, actRes] = await Promise.all([
      supabase.from('suppressions').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setSuppressions((suppRes.data ?? []) as Suppression[]);
    setActivityLogs((actRes.data ?? []) as ActivityLog[]);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="suppressions">Suppressions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

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
                <Badge variant="secondary" className="capitalize">{currentWorkspace?.plan ?? 'free'}</Badge>
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
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect your tools (coming soon)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Resend (Email)', 'Twilio (SMS)', 'HubSpot', 'GoHighLevel', 'Calendly'].map(name => (
                <div key={name} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>Connect</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
