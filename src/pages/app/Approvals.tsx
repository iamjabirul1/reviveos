import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Check, X, Edit, ShieldX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageWithLead {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  channel: string;
  subject: string | null;
  body: string;
  ai_rationale: string | null;
  approval_status: string;
  lead?: { first_name: string | null; last_name: string | null; email: string | null; company: string | null; revival_score: number | null };
}

export default function ApprovalsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');

  useEffect(() => {
    if (currentWorkspace) fetchMessages();
  }, [currentWorkspace]);

  async function fetchMessages() {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from('messages')
      .select('*, lead:leads(first_name, last_name, email, company, revival_score)')
      .eq('workspace_id', currentWorkspace.id)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });
    
    setMessages((data ?? []) as unknown as MessageWithLead[]);
    setLoading(false);
  }

  const current = messages[currentIndex];

  async function approve() {
    if (!current || !user) return;
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).eq('id', current.id);
    await logActivity('message_approved', current.id);
    toast({ title: 'Approved' });
    removeAndAdvance();
  }

  async function reject() {
    if (!current || !user) return;
    await supabase.from('messages').update({ approval_status: 'rejected', approved_by: user.id }).eq('id', current.id);
    await logActivity('message_rejected', current.id);
    toast({ title: 'Rejected' });
    removeAndAdvance();
  }

  async function saveEdit() {
    if (!current || !user) return;
    await supabase.from('messages').update({
      subject: editSubject,
      body: editBody,
      approval_status: 'approved',
      approved_by: user.id,
    }).eq('id', current.id);
    await logActivity('message_edited_approved', current.id);
    toast({ title: 'Edited & approved' });
    setEditMode(false);
    removeAndAdvance();
  }

  async function suppress() {
    if (!current) return;
    // Mark lead as do_not_contact
    await supabase.from('leads').update({ do_not_contact: true, revival_bucket: 'suppress' as any }).eq('id', current.lead_id);
    await supabase.from('messages').update({ approval_status: 'rejected' }).eq('id', current.id);
    // Add suppression record
    if (currentWorkspace) {
      await supabase.from('suppressions').insert({
        workspace_id: currentWorkspace.id,
        lead_id: current.lead_id,
        reason: 'Manually suppressed during approval',
      });
    }
    await logActivity('lead_suppressed', current.id);
    toast({ title: 'Lead suppressed', description: 'Marked as do not contact' });
    removeAndAdvance();
  }

  async function logActivity(eventType: string, messageId: string) {
    if (!currentWorkspace || !user) return;
    await supabase.from('activity_logs').insert({
      workspace_id: currentWorkspace.id,
      lead_id: current?.lead_id,
      user_id: user.id,
      event_type: eventType,
      payload_json: { message_id: messageId },
    });
  }

  function removeAndAdvance() {
    setMessages(prev => prev.filter((_, i) => i !== currentIndex));
    if (currentIndex >= messages.length - 1) setCurrentIndex(Math.max(0, currentIndex - 1));
  }

  async function batchApprove() {
    if (!user || !currentWorkspace) return;
    const ids = messages.map(m => m.id);
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).in('id', ids);
    toast({ title: `${ids.length} messages approved` });
    setMessages([]);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (messages.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <CheckSquare className="h-16 w-16 text-success mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">All caught up!</h1>
        <p className="text-muted-foreground">No messages pending approval. Create a campaign to generate messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{messages.length} pending</Badge>
          <Button variant="outline" size="sm" onClick={batchApprove}>Approve All</Button>
        </div>
      </div>

      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {(current as any).lead?.first_name} {(current as any).lead?.last_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {(current as any).lead?.email} · {(current as any).lead?.company} · Score: {(current as any).lead?.revival_score}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{currentIndex + 1} / {messages.length}</span>
                <Button variant="outline" size="icon" onClick={() => setCurrentIndex(i => Math.min(messages.length - 1, i + 1))} disabled={currentIndex === messages.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Rationale */}
            {current.ai_rationale && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Rationale</p>
                <p className="text-sm">{current.ai_rationale}</p>
              </div>
            )}

            {/* Message Preview */}
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="capitalize">{current.channel}</Badge>
              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Subject</p>
                    <Textarea value={editSubject} onChange={(e) => setEditSubject(e.target.value)} rows={1} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Body</p>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} />
                  </div>
                </div>
              ) : (
                <>
                  {current.subject && <p className="font-medium">{current.subject}</p>}
                  <p className="text-sm whitespace-pre-wrap">{current.body}</p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {editMode ? (
                <>
                  <Button onClick={saveEdit}><Check className="mr-1 h-4 w-4" /> Save & Approve</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button onClick={approve} className="bg-success hover:bg-success/90 text-success-foreground">
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => { setEditMode(true); setEditBody(current.body); setEditSubject(current.subject ?? ''); }}>
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" onClick={reject}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button variant="destructive" onClick={suppress}>
                    <ShieldX className="mr-1 h-4 w-4" /> Suppress Lead
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
