import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Check, X, Edit, ShieldX, ChevronLeft, ChevronRight, MessageSquare, Calendar, Trophy, ThumbsDown, Gauge, Keyboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MessageWithLead {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  channel: string;
  subject: string | null;
  body: string;
  ai_rationale: string | null;
  approval_status: string;
  variant_label?: string | null;
  ai_confidence_score?: number | null;
  sent_at?: string | null;
  replied_at?: string | null;
  lead?: { first_name: string | null; last_name: string | null; email: string | null; company: string | null; revival_score: number | null };
}

export default function ApprovalsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageWithLead[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const editBodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentWorkspace) fetchMessages();
  }, [currentWorkspace]);

  async function fetchMessages() {
    if (!currentWorkspace) return;
    try {
      const [pendingRes, sentRes] = await Promise.all([
        supabase
          .from('messages')
          .select('*, lead:leads(first_name, last_name, email, company, revival_score)')
          .eq('workspace_id', currentWorkspace.id)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('messages')
          .select('*, lead:leads(first_name, last_name, email, company, revival_score)')
          .eq('workspace_id', currentWorkspace.id)
          .eq('approval_status', 'approved')
          .not('sent_at', 'is', null)
          .is('replied_at', null)
          .order('sent_at', { ascending: false })
          .limit(50),
      ]);

      if (pendingRes.error) throw pendingRes.error;
      setMessages((pendingRes.data ?? []) as unknown as MessageWithLead[]);
      setSentMessages((sentRes.data ?? []) as unknown as MessageWithLead[]);
    } catch (err) {
      console.error('Approvals fetch error:', err);
      toast({ title: 'Error loading approvals', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const current = messages[currentIndex];

  const removeAndAdvance = useCallback(() => {
    setMessages(prev => {
      const next = prev.filter((_, i) => i !== currentIndex);
      if (currentIndex >= next.length) {
        setCurrentIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  }, [currentIndex]);

  const approve = useCallback(async () => {
    if (!current || !user || processing) return;
    setProcessing(true);
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).eq('id', current.id);
    await logActivity('message_approved', current.id);
    toast({ title: '✓ Approved' });
    removeAndAdvance();
    setProcessing(false);
  }, [current, user, processing, removeAndAdvance]);

  const reject = useCallback(async () => {
    if (!current || !user || processing) return;
    setProcessing(true);
    await supabase.from('messages').update({ approval_status: 'rejected', approved_by: user.id }).eq('id', current.id);
    await logActivity('message_rejected', current.id);
    toast({ title: '✗ Rejected' });
    removeAndAdvance();
    setProcessing(false);
  }, [current, user, processing, removeAndAdvance]);

  const suppress = useCallback(async () => {
    if (!current || processing) return;
    setProcessing(true);
    await supabase.from('leads').update({ do_not_contact: true, revival_bucket: 'suppress' as any }).eq('id', current.lead_id);
    await supabase.from('messages').update({ approval_status: 'rejected' }).eq('id', current.id);
    if (currentWorkspace) {
      await supabase.from('suppressions').insert({
        workspace_id: currentWorkspace.id,
        lead_id: current.lead_id,
        reason: 'Manually suppressed during approval',
      });
    }
    await logActivity('lead_suppressed', current.id);
    toast({ title: '⊘ Lead suppressed', description: 'Marked as do not contact' });
    removeAndAdvance();
    setProcessing(false);
  }, [current, processing, currentWorkspace, removeAndAdvance]);

  const enterEditMode = useCallback(() => {
    if (!current || editMode) return;
    setEditMode(true);
    setEditBody(current.body);
    setEditSubject(current.subject ?? '');
    // Focus textarea after React re-render
    setTimeout(() => editBodyRef.current?.focus(), 50);
  }, [current, editMode]);

  async function saveEdit() {
    if (!current || !user) return;
    setProcessing(true);
    await supabase.from('messages').update({
      subject: editSubject,
      body: editBody,
      approval_status: 'approved',
      approved_by: user.id,
    }).eq('id', current.id);
    await logActivity('message_edited_approved', current.id);
    toast({ title: '✓ Edited & approved' });
    setEditMode(false);
    removeAndAdvance();
    setProcessing(false);
  }

  // Global hotkeys for approval queue
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire hotkeys when typing in an input/textarea or in edit mode
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (editMode && !isTyping) {
        // In edit mode, only Escape exits
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditMode(false);
        }
        return;
      }

      if (isTyping) return;
      if (!current || processing) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          approve();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          enterEditMode();
          break;
        case 'Backspace':
          e.preventDefault();
          reject();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          suppress();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, processing, editMode, approve, reject, suppress, enterEditMode]);

  async function recordFeedback(messageId: string, outcomeType: string) {
    if (!currentWorkspace) return;
    setFeedbackLoading(messageId);
    try {
      const { error } = await supabase.functions.invoke('process-message-feedback', {
        body: {
          workspace_id: currentWorkspace.id,
          message_id: messageId,
          outcome_type: outcomeType,
        },
      });
      if (error) throw error;
      toast({ title: 'Feedback recorded', description: `Marked as ${outcomeType}. AI will learn from this.` });
      setSentMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Feedback error:', err);
      toast({ title: 'Error recording feedback', variant: 'destructive' });
    } finally {
      setFeedbackLoading(null);
    }
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

  async function batchApprove() {
    if (!user || !currentWorkspace) return;
    const ids = messages.map(m => m.id);
    await supabase.from('messages').update({ approval_status: 'approved', approved_by: user.id }).in('id', ids);
    toast({ title: `${ids.length} messages approved` });
    setMessages([]);
  }

  function ConfidenceBadge({ score }: { score: number | null | undefined }) {
    if (!score) return null;
    const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500';
    return (
      <div className={`flex items-center gap-1 text-xs ${color}`}>
        <Gauge className="h-3 w-3" />
        <span className="font-medium">{score}% confidence</span>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        {messages.length > 0 && (
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <Keyboard className="h-3.5 w-3.5" />
            <span className="font-medium">Hotkeys:</span>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">Enter</kbd> Approve
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">E</kbd> Edit
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">⌫</kbd> Reject
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">S</kbd> Suppress
          </div>
        )}
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {messages.length > 0 && <Badge variant="secondary" className="ml-1">{messages.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            Record Feedback {sentMessages.length > 0 && <Badge variant="secondary" className="ml-1">{sentMessages.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-2">All caught up!</h2>
              <p className="text-muted-foreground">No messages pending approval.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{messages.length} pending</Badge>
                <Button variant="outline" size="sm" onClick={batchApprove}>Approve All</Button>
              </div>

              {current && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {(current as any).lead?.first_name} {(current as any).lead?.last_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {(current as any).lead?.email} · {(current as any).lead?.company} · Score: {(current as any).lead?.revival_score}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {current.variant_label && current.variant_label !== 'A' && (
                            <Badge variant="outline" className="text-xs">Variant {current.variant_label}</Badge>
                          )}
                          <ConfidenceBadge score={current.ai_confidence_score} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="icon" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{currentIndex + 1} / {messages.length}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentIndex(i => Math.min(messages.length - 1, i + 1))} disabled={currentIndex === messages.length - 1}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {current.ai_rationale && (
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">AI Rationale</p>
                        <p className="text-sm">{current.ai_rationale}</p>
                      </div>
                    )}
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
                            <Textarea ref={editBodyRef} value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {current.subject && <p className="font-medium">{current.subject}</p>}
                          <p className="text-sm whitespace-pre-wrap">{current.body}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editMode ? (
                        <>
                          <Button onClick={saveEdit} disabled={processing}><Check className="mr-1 h-4 w-4" /> Save & Approve</Button>
                          <Button variant="outline" onClick={() => setEditMode(false)}>Cancel <kbd className="ml-2 text-[10px] opacity-50">Esc</kbd></Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={approve} disabled={processing} className="bg-success hover:bg-success/90 text-success-foreground">
                            <Check className="mr-1 h-4 w-4" /> Approve <kbd className="ml-2 text-[10px] opacity-50">↵</kbd>
                          </Button>
                          <Button variant="outline" onClick={enterEditMode} disabled={processing}>
                            <Edit className="mr-1 h-4 w-4" /> Edit <kbd className="ml-2 text-[10px] opacity-50">E</kbd>
                          </Button>
                          <Button variant="outline" onClick={reject} disabled={processing}>
                            <X className="mr-1 h-4 w-4" /> Reject <kbd className="ml-2 text-[10px] opacity-50">⌫</kbd>
                          </Button>
                          <Button variant="destructive" onClick={suppress} disabled={processing}>
                            <ShieldX className="mr-1 h-4 w-4" /> Suppress <kbd className="ml-2 text-[10px] opacity-50">S</kbd>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="feedback">
          {sentMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sent messages awaiting feedback</h3>
              <p className="text-muted-foreground">Once messages are sent, you can record outcomes here to help the AI learn.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Record what happened after sending each message. The AI learns from every outcome to improve future messages.
              </p>
              {sentMessages.map(msg => (
                <Card key={msg.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {(msg as any).lead?.first_name} {(msg as any).lead?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{(msg as any).lead?.company}</span>
                          {msg.variant_label && msg.variant_label !== 'A' && (
                            <Badge variant="outline" className="text-xs">Variant {msg.variant_label}</Badge>
                          )}
                        </div>
                        {msg.subject && <p className="text-sm text-muted-foreground truncate">{msg.subject}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Sent {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : 'recently'}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm" variant="outline"
                          disabled={feedbackLoading === msg.id}
                          onClick={() => recordFeedback(msg.id, 'replied')}
                          className="text-xs"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> Replied
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          disabled={feedbackLoading === msg.id}
                          onClick={() => recordFeedback(msg.id, 'booked')}
                          className="text-xs"
                        >
                          <Calendar className="h-3 w-3 mr-1" /> Booked
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          disabled={feedbackLoading === msg.id}
                          onClick={() => recordFeedback(msg.id, 'deal_won')}
                          className="text-xs"
                        >
                          <Trophy className="h-3 w-3 mr-1" /> Won
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          disabled={feedbackLoading === msg.id}
                          onClick={() => recordFeedback(msg.id, 'no_response')}
                          className="text-xs text-muted-foreground"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" /> No Response
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
