import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { scoreLead } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, FileUp, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { LimitReached } from '@/components/UpgradePrompt';

const LEAD_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source' },
  { key: 'stage', label: 'Stage' },
  { key: 'status', label: 'Status' },
  { key: 'lead_value', label: 'Lead Value' },
  { key: 'last_contacted_at', label: 'Last Contacted' },
  { key: 'last_activity_at', label: 'Last Activity' },
  { key: 'no_show_flag', label: 'No Show Flag' },
  { key: 'closed_lost_reason', label: 'Closed Lost Reason' },
  { key: 'notes', label: 'Notes' },
  { key: 'consent_status', label: 'Consent Status' },
  { key: 'jurisdiction', label: 'Jurisdiction' },
  { key: '_skip', label: '— Skip this column —' },
];

type Step = 'upload' | 'analyzing' | 'mapping' | 'importing' | 'done';

export default function ImportPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits, upgradePlan, canAddLeads } = usePlanLimits();
  const [step, setStep] = useState<Step>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ imported: 0, duplicates: 0, errors: 0 });
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [notesColumns, setNotesColumns] = useState<string[]>([]);
  const [currentLeadCount, setCurrentLeadCount] = useState(0);

  useEffect(() => {
    if (currentWorkspace) {
      supabase.from('leads').select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .then(({ count }) => setCurrentLeadCount(count ?? 0));
    }
  }, [currentWorkspace]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields ?? [];
        const data = results.data as Record<string, string>[];
        setCsvHeaders(headers);
        setCsvData(data);
        
        // Use AI to map fields
        setStep('analyzing');
        await aiMapFields(headers, data);
      },
      error: () => toast({ title: 'Parse error', description: 'Could not parse CSV', variant: 'destructive' }),
    });
  }

  async function aiMapFields(headers: string[], data: Record<string, string>[]) {
    try {
      const { data: aiResult, error } = await supabase.functions.invoke('map-csv-fields', {
        body: {
          headers,
          sample_rows: data.slice(0, 5),
        },
      });

      if (error || !aiResult?.mapping) {
        console.error('AI mapping failed, using fallback:', error);
        // Fallback to enhanced local mapping
        setMapping(localFuzzyMap(headers, data));
        setAiReasoning('AI mapping unavailable — used smart local matching instead.');
        setAiConfidence(null);
      } else {
        // Validate and apply AI mapping
        const validMapping: Record<string, string> = {};
        const validKeys = new Set(LEAD_FIELDS.map(f => f.key));
        
        for (const [csvCol, field] of Object.entries(aiResult.mapping)) {
          if (validKeys.has(field as string)) {
            validMapping[csvCol] = field as string;
          } else {
            validMapping[csvCol] = 'notes'; // Unknown fields go to notes
          }
        }

        // Ensure all headers are mapped
        for (const h of headers) {
          if (!validMapping[h]) {
            validMapping[h] = 'notes';
          }
        }

        setMapping(validMapping);
        setAiReasoning(aiResult.reasoning || '');
        setAiConfidence(aiResult.confidence ?? null);
        setNotesColumns(aiResult.notes_columns || []);
      }
    } catch (err) {
      console.error('AI mapping error:', err);
      setMapping(localFuzzyMap(headers, data));
      setAiReasoning('AI mapping error — used smart local matching.');
    }
    setStep('mapping');
  }

  // Enhanced local fuzzy mapping that also checks sample data
  function localFuzzyMap(headers: string[], data: Record<string, string>[]): Record<string, string> {
    const autoMap: Record<string, string> = {};
    const usedFields = new Set<string>();

    headers.forEach(h => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sampleValues = data.slice(0, 5).map(row => row[h] || '').filter(Boolean);

      // Check by data patterns first
      if (sampleValues.some(v => v.includes('@') && v.includes('.'))) {
        if (!usedFields.has('email')) { autoMap[h] = 'email'; usedFields.add('email'); return; }
      }
      if (sampleValues.some(v => /^[\+]?[\d\s\-\(\)]{7,}$/.test(v.trim()))) {
        if (!usedFields.has('phone')) { autoMap[h] = 'phone'; usedFields.add('phone'); return; }
      }
      if (sampleValues.some(v => /^https?:\/\//.test(v) || /\.(com|org|net|io|co)/.test(v))) {
        autoMap[h] = 'notes'; return; // websites go to notes
      }
      if (sampleValues.some(v => /^\$?\d+[\d,]*\.?\d*$/.test(v.replace(/[$,]/g, '')))) {
        if (lower.includes('value') || lower.includes('deal') || lower.includes('amount') || lower.includes('revenue')) {
          if (!usedFields.has('lead_value')) { autoMap[h] = 'lead_value'; usedFields.add('lead_value'); return; }
        }
      }

      // Check by header name
      const nameMatches: Record<string, string[]> = {
        first_name: ['firstname', 'first', 'fname', 'givenname'],
        last_name: ['lastname', 'last', 'lname', 'surname', 'familyname'],
        email: ['email', 'emailaddress', 'mail'],
        phone: ['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'tel'],
        company: ['company', 'companyname', 'organization', 'org', 'business', 'employer'],
        source: ['source', 'leadsource', 'origin', 'channel', 'medium'],
        stage: ['stage', 'pipeline', 'salesstage', 'funnel'],
        status: ['status', 'leadstatus'],
        lead_value: ['value', 'dealvalue', 'amount', 'dealsize', 'revenue', 'leadvalue'],
        last_contacted_at: ['lastcontacted', 'lastcontact', 'contacted', 'lastreach'],
        last_activity_at: ['lastactivity', 'activity', 'lastinteraction'],
        notes: ['notes', 'note', 'comment', 'comments', 'description', 'website', 'url', 'linkedin', 'title', 'jobtitle', 'position', 'role'],
        closed_lost_reason: ['closedlostreason', 'lostreason', 'reason'],
      };

      for (const [field, patterns] of Object.entries(nameMatches)) {
        if (usedFields.has(field) && field !== 'notes') continue;
        if (patterns.some(p => lower === p || lower.includes(p))) {
          autoMap[h] = field;
          if (field !== 'notes') usedFields.add(field);
          return;
        }
      }

      // Handle "Name" / "Full Name" → first_name
      if ((lower === 'name' || lower === 'fullname' || lower === 'contactname') && !usedFields.has('first_name')) {
        autoMap[h] = 'first_name';
        usedFields.add('first_name');
        return;
      }

      // Default: put in notes so nothing is lost
      autoMap[h] = 'notes';
    });

    return autoMap;
  }

  async function runImport() {
    if (!currentWorkspace) return;

    // Plan enforcement
    const planLimits: Record<string, number> = { free: 500, pro: 5000, enterprise: 50000 };
    const limit = planLimits[currentWorkspace.plan] ?? 500;
    const { count: currentCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', currentWorkspace.id);

    if ((currentCount ?? 0) + csvData.length > limit) {
      toast({
        title: 'Plan limit reached',
        description: `Your ${currentWorkspace.plan} plan allows ${limit} leads. You have ${currentCount ?? 0} and are trying to import ${csvData.length}.`,
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    let imported = 0, duplicates = 0, errors = 0;
    const wsId = currentWorkspace.id;

    // Identify which columns map to notes (for merging)
    const notesCols = Object.entries(mapping).filter(([_, v]) => v === 'notes').map(([k]) => k);

    // Get existing emails for dedup
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('email, phone')
      .eq('workspace_id', wsId);
    const existingEmails = new Set((existingLeads ?? []).map(l => l.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set((existingLeads ?? []).map(l => l.phone).filter(Boolean));

    const batchSize = 50;
    const rows = csvData;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const leadsToInsert = batch.map(row => {
        const lead: Record<string, unknown> = { workspace_id: wsId };
        
        // Merge all notes columns into one
        const notesParts: string[] = [];

        Object.entries(mapping).forEach(([csvCol, dbField]) => {
          if (dbField === '_skip') return;
          let val: unknown = row[csvCol];
          if (!val || (typeof val === 'string' && !val.trim())) return;

          if (dbField === 'notes') {
            // Merge multiple columns into notes with labels
            notesParts.push(`${csvCol}: ${val}`);
            return;
          }

          if (dbField === 'lead_value') {
            val = parseFloat((val as string).replace(/[$,]/g, '')) || null;
          }
          if (dbField === 'no_show_flag') {
            val = ['true', '1', 'yes'].includes((val as string)?.toLowerCase());
          }

          // Handle "Full Name" → split into first_name and last_name
          if (dbField === 'first_name' && typeof val === 'string' && val.includes(' ')) {
            const parts = (val as string).trim().split(/\s+/);
            lead['first_name'] = parts[0];
            if (parts.length > 1 && !lead['last_name']) {
              lead['last_name'] = parts.slice(1).join(' ');
            }
            return;
          }

          lead[dbField] = val;
        });

        // Set merged notes
        if (notesParts.length > 0) {
          lead['notes'] = notesParts.join('\n');
        }

        return lead;
      }).filter(lead => {
        const email = (lead.email as string)?.toLowerCase();
        const phone = lead.phone as string;
        if (email && existingEmails.has(email)) { duplicates++; return false; }
        if (phone && !email && existingPhones.has(phone)) { duplicates++; return false; }
        if (email) existingEmails.add(email);
        if (phone) existingPhones.add(phone);
        return true;
      });

      // Score each lead
      leadsToInsert.forEach(lead => {
        const result = scoreLead(lead as any);
        lead.revival_score = result.score;
        lead.revival_bucket = result.bucket;
        lead.best_angle = result.best_angle;
        lead.best_channel = result.best_channel;
        lead.risk_flag = result.risk_flag;
        lead.suggested_cta = result.suggested_cta;
      });

      if (leadsToInsert.length > 0) {
        const { error } = await supabase.from('leads').insert(leadsToInsert as any);
        if (error) {
          console.error('Insert error:', error);
          errors += leadsToInsert.length;
        } else {
          imported += leadsToInsert.length;
        }
      }

      setProgress(Math.round(((i + batchSize) / rows.length) * 100));
    }

    setImportStats({ imported, duplicates, errors });

    // Log activity
    if (currentWorkspace && user) {
      await supabase.from('activity_logs').insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        event_type: 'leads_imported',
        payload_json: { imported, duplicates, errors, total_rows: rows.length },
      });
    }

    setStep('done');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Import Leads</h1>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Drag and drop a CSV file or click to browse. AI will automatically map your columns.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <FileUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-1">Drop your CSV here</p>
              <p className="text-sm text-muted-foreground mb-3">or click to browse files</p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary">
                <Sparkles className="h-3 w-3" />
                <span>AI will auto-detect and map all fields</span>
              </div>
              <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'analyzing' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="font-medium">AI is analyzing your CSV...</p>
            <p className="text-sm text-muted-foreground">Detecting field types, email addresses, phone numbers, and more</p>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <>
          {/* AI Mapping Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">
                    AI Auto-Mapped {Object.values(mapping).filter(v => v !== '_skip').length} of {csvHeaders.length} columns
                    {aiConfidence !== null && (
                      <Badge variant="secondary" className="ml-2">
                        {Math.round(aiConfidence * 100)}% confidence
                      </Badge>
                    )}
                  </p>
                  {aiReasoning && <p className="text-xs text-muted-foreground">{aiReasoning}</p>}
                  {notesColumns.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📎 Extra data merged into notes: {notesColumns.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verify Field Mapping</CardTitle>
              <CardDescription>
                AI mapped your {csvData.length} rows. Review and adjust if needed — no data will be lost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {csvHeaders.map(header => {
                  const mappedTo = mapping[header] || '_skip';
                  const sampleVal = csvData[0]?.[header] || '';
                  return (
                    <div key={header} className="flex items-center gap-4">
                      <div className="w-48 shrink-0">
                        <span className="text-sm font-medium truncate block">{header}</span>
                        <span className="text-xs text-muted-foreground truncate block">{sampleVal}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <Select value={mappedTo} onValueChange={(val) => setMapping(prev => ({ ...prev, [header]: val }))}>
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_FIELDS.map(f => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mappedTo !== '_skip' && mappedTo !== 'notes' && (
                        <Badge variant="default" className="text-xs">✓</Badge>
                      )}
                      {mappedTo === 'notes' && (
                        <Badge variant="secondary" className="text-xs">→ notes</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {csvHeaders.map(h => <TableCell key={h} className="text-xs">{row[h]}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Button onClick={runImport} size="lg">
            <Upload className="mr-2 h-4 w-4" /> Import {csvData.length} Leads
          </Button>
        </>
      )}

      {step === 'importing' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="font-medium">Importing and scoring leads...</p>
            <Progress value={progress} className="max-w-sm mx-auto" />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h2 className="text-xl font-bold">Import Complete!</h2>
            <div className="flex justify-center gap-6 text-sm">
              <div><span className="font-bold text-success">{importStats.imported}</span> imported</div>
              <div><span className="font-bold text-warning">{importStats.duplicates}</span> duplicates</div>
              <div><span className="font-bold text-destructive">{importStats.errors}</span> errors</div>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => { setStep('upload'); setCsvData([]); setCsvHeaders([]); }}>
                Import More
              </Button>
              <a href="/app/leads"><Button>View Leads →</Button></a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
