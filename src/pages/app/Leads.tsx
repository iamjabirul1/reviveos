import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { scoreLead } from '@/lib/scoring';
import { useToast } from '@/hooks/use-toast';

type Lead = Database['public']['Tables']['leads']['Row'];

const BUCKET_COLORS: Record<string, string> = {
  revive_now: 'bg-success text-success-foreground',
  review_first: 'bg-warning text-warning-foreground',
  nurture_later: 'bg-primary text-primary-foreground',
  suppress: 'bg-destructive text-destructive-foreground',
};

const BUCKET_LABELS: Record<string, string> = {
  revive_now: 'Revive Now',
  review_first: 'Review First',
  nurture_later: 'Nurture Later',
  suppress: 'Suppress',
};

export default function LeadsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const pageSize = 25;

  useEffect(() => {
    if (currentWorkspace) fetchLeads();
  }, [currentWorkspace, bucketFilter, page]);

  async function fetchLeads() {
    if (!currentWorkspace) return;
    setLoading(true);
    let query = supabase.from('leads').select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('revival_score', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (bucketFilter !== 'all') {
      query = query.eq('revival_bucket', bucketFilter as any);
    }

    const { data } = await query;
    setLeads(data ?? []);
    setLoading(false);
  }

  const filtered = leads.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [l.first_name, l.last_name, l.email, l.company].some(f => f?.toLowerCase().includes(s));
  });

  async function rescoreAll() {
    if (!currentWorkspace || !user) return;
    toast({ title: 'Rescoring...', description: 'Updating all lead scores' });
    const { data: allLeads } = await supabase.from('leads').select('*').eq('workspace_id', currentWorkspace.id);
    if (!allLeads) return;

    for (const lead of allLeads) {
      const result = scoreLead(lead);
      await supabase.from('leads').update({
        revival_score: result.score,
        revival_bucket: result.bucket,
        best_angle: result.best_angle,
        best_channel: result.best_channel,
        risk_flag: result.risk_flag,
        suggested_cta: result.suggested_cta,
      }).eq('id', lead.id);
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      workspace_id: currentWorkspace.id,
      user_id: user?.id,
      event_type: 'leads_rescored',
      payload_json: { count: allLeads.length },
    });

    toast({ title: 'Done', description: `${allLeads.length} leads rescored` });
    fetchLeads();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button variant="outline" onClick={rescoreAll}>Re-score All</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={bucketFilter} onValueChange={(v) => { setBucketFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by bucket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buckets</SelectItem>
            <SelectItem value="revive_now">Revive Now</SelectItem>
            <SelectItem value="review_first">Review First</SelectItem>
            <SelectItem value="nurture_later">Nurture Later</SelectItem>
            <SelectItem value="suppress">Suppress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-muted-foreground">Import leads to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(lead => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                      <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="text-sm">{lead.company}</TableCell>
                      <TableCell>
                        <span className="font-bold">{lead.revival_score ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        {lead.revival_bucket && (
                          <Badge className={BUCKET_COLORS[lead.revival_bucket]}>
                            {BUCKET_LABELS[lead.revival_bucket]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.stage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={filtered.length < pageSize}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Lead Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.first_name} {selectedLead.last_name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{selectedLead.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{selectedLead.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p>{selectedLead.company ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revival Score</p>
                  <p className="text-2xl font-bold">{selectedLead.revival_score ?? '—'}</p>
                </div>
                {selectedLead.revival_bucket && (
                  <Badge className={BUCKET_COLORS[selectedLead.revival_bucket]}>
                    {BUCKET_LABELS[selectedLead.revival_bucket]}
                  </Badge>
                )}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Why this lead is revivable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedLead.best_angle ?? 'No specific angle identified'}</p>
                    {selectedLead.risk_flag && (
                      <p className="text-sm text-destructive mt-2">⚠ {selectedLead.risk_flag}</p>
                    )}
                  </CardContent>
                </Card>
                <div>
                  <p className="text-sm text-muted-foreground">Suggested Channel</p>
                  <p className="capitalize">{selectedLead.best_channel ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suggested CTA</p>
                  <p className="capitalize">{selectedLead.suggested_cta?.replace('_', ' ') ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedLead.notes ?? 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <p>{selectedLead.stage ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p>{selectedLead.source ?? '—'}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
