import { useState, useCallback } from 'react';
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
import { Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

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

type Step = 'upload' | 'mapping' | 'importing' | 'done';

export default function ImportPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ imported: 0, duplicates: 0, errors: 0 });

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
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvData(results.data as Record<string, string>[]);
        // Auto-map by fuzzy matching
        const autoMap: Record<string, string> = {};
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z]/g, '');
          const match = LEAD_FIELDS.find(f =>
            f.key !== '_skip' && (
              f.key.replace('_', '') === lower ||
              f.label.toLowerCase().replace(/[^a-z]/g, '') === lower ||
              lower.includes(f.key.replace('_', ''))
            )
          );
          autoMap[h] = match?.key ?? '_skip';
        });
        setMapping(autoMap);
        setStep('mapping');
      },
      error: () => toast({ title: 'Parse error', description: 'Could not parse CSV', variant: 'destructive' }),
    });
  }

  async function runImport() {
    if (!currentWorkspace) return;
    setStep('importing');
    let imported = 0, duplicates = 0, errors = 0;
    const wsId = currentWorkspace.id;

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
        Object.entries(mapping).forEach(([csvCol, dbField]) => {
          if (dbField === '_skip') return;
          let val: unknown = row[csvCol];
          if (dbField === 'lead_value') val = parseFloat(val as string) || null;
          if (dbField === 'no_show_flag') val = ['true', '1', 'yes'].includes((val as string)?.toLowerCase());
          lead[dbField] = val || null;
        });
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
        if (error) errors += leadsToInsert.length;
        else imported += leadsToInsert.length;
      }

      setProgress(Math.round(((i + batchSize) / rows.length) * 100));
    }

    setImportStats({ imported, duplicates, errors });
    setStep('done');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Import Leads</h1>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Drag and drop a CSV file or click to browse</CardDescription>
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
              <p className="text-sm text-muted-foreground">or click to browse files</p>
              <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Map Fields</CardTitle>
              <CardDescription>Map your CSV columns to lead fields. {csvData.length} rows detected.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {csvHeaders.map(header => (
                  <div key={header} className="flex items-center gap-4">
                    <span className="w-48 text-sm font-medium truncate">{header}</span>
                    <Select value={mapping[header] || '_skip'} onValueChange={(val) => setMapping(prev => ({ ...prev, [header]: val }))}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_FIELDS.map(f => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
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
