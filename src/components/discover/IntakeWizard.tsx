import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Upload, FileSpreadsheet, Calculator, Globe } from 'lucide-react';
import Papa from 'papaparse';
import { scoreLead } from '@/lib/scoring';

export interface NapkinData {
  deadLeadCount: number;
  avgDealSize: number;
  coldReason: string;
  websiteUrl: string;
}

export interface ScoredLead {
  first_name?: string;
  company?: string;
  email?: string;
  score: number;
  bucket: string;
  best_angle: string;
  lead_value?: number;
}

interface IntakeWizardProps {
  onComplete: (data: { path: 'napkin' | 'csv'; napkinData?: NapkinData; scoredLeads?: ScoredLead[] }) => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

export default function IntakeWizard({ onComplete }: IntakeWizardProps) {
  const [path, setPath] = useState<'choose' | 'napkin' | 'csv'>('choose');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Napkin state
  const [deadLeadCount, setDeadLeadCount] = useState(500);
  const [avgDealSize, setAvgDealSize] = useState('');
  const [coldReason, setColdReason] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // CSV state
  const [csvError, setCsvError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const napkinSteps = [
    {
      title: 'How many dead leads are sitting in your CRM?',
      subtitle: 'Don\'t worry about being exact — ballpark is perfect.',
      icon: <Calculator className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-8 w-full max-w-md">
          <div className="text-center">
            <span className="text-6xl font-bold text-primary">{deadLeadCount.toLocaleString()}</span>
            <span className="text-2xl text-muted-foreground ml-2">leads</span>
          </div>
          <Slider
            value={[deadLeadCount]}
            onValueChange={([v]) => setDeadLeadCount(v)}
            min={100}
            max={10000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>100</span>
            <span>10,000+</span>
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: 'What\'s your average deal size?',
      subtitle: 'The typical revenue from a single closed deal.',
      icon: <span className="text-4xl">💰</span>,
      content: (
        <div className="w-full max-w-md">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="5,000"
              value={avgDealSize}
              onChange={(e) => setAvgDealSize(e.target.value)}
              className="h-16 text-3xl pl-10 text-center font-bold border-2 focus:border-primary"
            />
          </div>
        </div>
      ),
      valid: avgDealSize !== '' && Number(avgDealSize) > 0,
    },
    {
      title: 'What\'s the #1 reason deals go cold?',
      subtitle: 'This helps us pick the right revival playbook.',
      icon: <span className="text-4xl">🧊</span>,
      content: (
        <div className="w-full max-w-md space-y-3">
          {[
            { value: 'timing', label: '⏰ Bad Timing / "Not right now"', desc: 'They liked it but the timing was off' },
            { value: 'ghosted', label: '👻 Ghosted / No Response', desc: 'They just stopped replying' },
            { value: 'budget', label: '💸 Budget Constraints', desc: 'Price was the main objection' },
            { value: 'competitor', label: '🏁 Went with Competitor', desc: 'They chose someone else' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setColdReason(opt.value)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                coldReason === opt.value
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <div className="font-semibold text-lg">{opt.label}</div>
              <div className="text-sm text-muted-foreground">{opt.desc}</div>
            </button>
          ))}
        </div>
      ),
      valid: coldReason !== '',
    },
    {
      title: 'Drop your website URL',
      subtitle: 'Our AI will learn your brand voice to write messages that sound like you.',
      icon: <Globe className="h-8 w-8 text-primary" />,
      content: (
        <div className="w-full max-w-md">
          <Input
            type="url"
            placeholder="https://yourcompany.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="h-14 text-lg border-2 focus:border-primary"
          />
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Optional — but it makes the AI messages 10× better.
          </p>
        </div>
      ),
      valid: true,
    },
  ];

  const goNext = () => {
    if (path === 'napkin' && step < napkinSteps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else if (path === 'napkin' && step === napkinSteps.length - 1) {
      onComplete({
        path: 'napkin',
        napkinData: { deadLeadCount, avgDealSize: Number(avgDealSize) || 5000, coldReason, websiteUrl },
      });
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      setPath('choose');
    }
  };

  const handleCsvDrop = (file: File) => {
    setCsvError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setCsvError('CSV appears to be empty.');
          return;
        }
        const leads = results.data.slice(0, 25).map((row: any) => {
          const lead = {
            first_name: row.first_name || row.name || row.Name || '',
            company: row.company || row.Company || '',
            email: row.email || row.Email || '',
            lead_value: Number(row.lead_value || row.deal_size || row.value || 0),
            closed_lost_reason: row.closed_lost_reason || row.reason || '',
            no_show_flag: row.no_show === 'true' || row.no_show_flag === 'true',
            last_contacted_at: row.last_contacted_at || row.last_contact || null,
            notes: row.notes || '',
            phone: row.phone || '',
          };
          const scored = scoreLead(lead);
          return { ...lead, score: scored.score, bucket: scored.bucket, best_angle: scored.best_angle };
        });
        onComplete({ path: 'csv', scoredLeads: leads as ScoredLead[] });
      },
      error: () => setCsvError('Failed to parse CSV. Please check the format.'),
    });
  };

  // Choose path screen
  if (path === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full text-center space-y-10"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Discover Your <span className="text-primary">Hidden Revenue</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Find out how much money is sitting in your dead leads — in under 30 seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => { setPath('napkin'); setStep(0); }}
              className="group p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-xl transition-all text-left space-y-4"
            >
              <Calculator className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Quick Estimate</h3>
              <p className="text-muted-foreground">Answer 4 quick questions and see your recoverable revenue instantly.</p>
              <span className="text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                Start <ArrowRight className="h-4 w-4" />
              </span>
            </button>

            <button
              onClick={() => setPath('csv')}
              className="group p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-xl transition-all text-left space-y-4"
            >
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Upload Leads</h3>
              <p className="text-muted-foreground">Drop a CSV of up to 25 dead leads. We'll score them instantly.</p>
              <span className="text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                Upload <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // CSV drop screen
  if (path === 'csv') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full space-y-6">
          <Button variant="ghost" onClick={() => setPath('choose')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h2 className="text-3xl font-bold text-foreground">Drop your dead leads</h2>
          <p className="text-muted-foreground">Upload a CSV with up to 25 leads. We'll score each one instantly — no account needed.</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleCsvDrop(file);
            }}
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleCsvDrop(file);
              };
              input.click();
            }}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-foreground">Drag & drop your CSV here</p>
            <p className="text-sm text-muted-foreground mt-2">or click to browse (max 25 rows)</p>
          </div>

          {csvError && <p className="text-destructive text-sm">{csvError}</p>}
        </motion.div>
      </div>
    );
  }

  // Napkin math steps
  const currentStep = napkinSteps[step];
  const progress = ((step + 1) / napkinSteps.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <Button variant="ghost" onClick={goBack} className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                {currentStep.icon}
                <h2 className="text-3xl font-bold text-foreground">{currentStep.title}</h2>
                <p className="text-lg text-muted-foreground">{currentStep.subtitle}</p>
              </div>

              {currentStep.content}

              <Button
                onClick={goNext}
                disabled={!currentStep.valid}
                size="lg"
                className="w-full max-w-md h-14 text-lg"
              >
                {step === napkinSteps.length - 1 ? 'Show Me The Money' : 'Continue'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
